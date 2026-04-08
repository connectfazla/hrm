import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import PDFDocument from "pdfkit";

function diffMinutes(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

function getTimeParts(date: Date) {
  return { hours: date.getUTCHours(), minutes: date.getUTCMinutes() };
}

function calcLate(clockInAt: Date, config: { workdayStartTime: Date; lateGraceMinutes: number }) {
  const { hours, minutes } = getTimeParts(config.workdayStartTime);

  const startOfWorkday = new Date(clockInAt);
  startOfWorkday.setHours(hours, minutes, 0, 0);

  const allowed = new Date(startOfWorkday.getTime() + config.lateGraceMinutes * 60 * 1000);

  if (clockInAt <= allowed) return { late: false, lateByMinutes: 0 };

  const lateByMinutes = Math.max(0, Math.ceil((clockInAt.getTime() - allowed.getTime()) / 60000));
  return { late: true, lateByMinutes };
}

type AccessContext = {
  role: Role;
  employeeId: string | null;
};

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async getAttendanceConfig() {
    const cfg = await this.prisma.attendanceConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!cfg) {
      throw new Error("AttendanceConfig not configured");
    }

    return cfg;
  }

  async clockIn(employeeId: string, now: Date) {
    const active = await this.prisma.workSession.findFirst({
      where: { employeeId, clockOutAt: null },
    });

    if (active) throw new Error("Already clocked in");

    const cfg = await this.getAttendanceConfig();
    const lateCalc = calcLate(now, { workdayStartTime: cfg.workdayStartTime as Date, lateGraceMinutes: cfg.lateGraceMinutes });

    const session = await this.prisma.workSession.create({
      data: {
        employeeId,
        clockInAt: now,
        late: lateCalc.late,
        lateByMinutes: lateCalc.lateByMinutes,
      },
    });

    return session;
  }

  async clockOut(employeeId: string, comment: string, now: Date) {
    const session = await this.prisma.workSession.findFirst({
      where: { employeeId, clockOutAt: null },
      orderBy: { clockInAt: "desc" },
    });

    if (!session) throw new Error("No active work session found");

    const updated = await this.prisma.workSession.update({
      where: { id: session.id },
      data: {
        clockOutAt: now,
        workComment: comment,
      },
    });

    return updated;
  }

  async lunchStart(employeeId: string, now: Date) {
    const session = await this.prisma.workSession.findFirst({
      where: { employeeId, clockOutAt: null },
      orderBy: { clockInAt: "desc" },
    });

    if (!session) throw new Error("No active work session");

    const activeLunch = await this.prisma.lunchBreak.findFirst({
      where: { workSessionId: session.id, endAt: null },
    });

    if (activeLunch) throw new Error("Lunch already started");

    return this.prisma.lunchBreak.create({
      data: {
        workSessionId: session.id,
        startAt: now,
        durationMinutes: 0,
      },
    });
  }

  async lunchEnd(employeeId: string, now: Date) {
    const lunch = await this.prisma.lunchBreak.findFirst({
      where: {
        workSession: { employeeId, clockOutAt: null },
        endAt: null,
      },
      orderBy: { startAt: "desc" },
    });

    if (!lunch) throw new Error("No active lunch found");

    const durationMinutes = diffMinutes(lunch.startAt, now);
    const updated = await this.prisma.lunchBreak.update({
      where: { id: lunch.id },
      data: { endAt: now, durationMinutes: Math.max(0, durationMinutes) },
    });

    return updated;
  }

  async getSessions(
    access: AccessContext,
    employeeIdParam: string,
    from: Date | null,
    to: Date | null,
    limit: number,
  ) {
    if (access.role !== Role.ADMIN) {
      if (!access.employeeId || access.employeeId !== employeeIdParam) {
        throw new ForbiddenException("Not allowed");
      }
    }

    const start = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ?? new Date();

    const sessions = await this.prisma.workSession.findMany({
      where: {
        employeeId: employeeIdParam,
        clockInAt: { gte: start, lte: end },
      },
      include: { lunches: true },
      orderBy: { clockInAt: "desc" },
      take: limit,
    });

    return { sessions };
  }

  async getTimesheet(
    access: AccessContext,
    employeeIdParam: string,
    from: Date | null,
    to: Date | null,
    period: "daily" | "weekly" | "monthly",
  ) {
    if (access.role !== Role.ADMIN) {
      if (!access.employeeId || access.employeeId !== employeeIdParam) {
        throw new ForbiddenException("Not allowed");
      }
    }

    const start = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ?? new Date();

    const sessions = await this.prisma.workSession.findMany({
      where: {
        employeeId: employeeIdParam,
        clockInAt: { gte: start, lte: end },
      },
      include: { lunches: true },
      orderBy: { clockInAt: "asc" },
    });

    const groups = new Map<
      string,
      { key: string; sessions: number; totalWorkMinutes: number; totalLunchMinutes: number; totalBillableMinutes: number; lateCount: number }
    >();

    const formatKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      if (period === "daily") return `${y}-${m}-${day}`;
      if (period === "monthly") return `${y}-${m}`;
      // weekly: use ISO week number approximation (UTC)
      const onejan = new Date(Date.UTC(y, 0, 1));
      const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getUTCDay() + 1) / 7);
      return `${y}-W${String(week).padStart(2, "0")}`;
    };

    for (const s of sessions) {
      const clockOut = s.clockOutAt ?? null;
      const workMinutes = clockOut ? diffMinutes(s.clockInAt, clockOut) : 0;
      const lunchMinutes = s.lunches
        .filter((l) => l.endAt != null)
        .reduce((acc, l) => acc + (l.durationMinutes ?? 0), 0);
      const billableMinutes = Math.max(0, workMinutes - lunchMinutes);

      const key = formatKey(s.clockInAt);
      const g = groups.get(key) ?? {
        key,
        sessions: 0,
        totalWorkMinutes: 0,
        totalLunchMinutes: 0,
        totalBillableMinutes: 0,
        lateCount: 0,
      };

      g.sessions += 1;
      g.totalWorkMinutes += workMinutes;
      g.totalLunchMinutes += lunchMinutes;
      g.totalBillableMinutes += billableMinutes;
      if (s.late) g.lateCount += 1;

      groups.set(key, g);
    }

    const groupArr = Array.from(groups.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
    const averageLunchMinutes = (g: typeof groupArr[number]) =>
      g.sessions > 0 ? Math.round(g.totalLunchMinutes / g.sessions) : 0;

    return {
      period,
      from: start.toISOString(),
      to: end.toISOString(),
      groups: groupArr.map((g) => ({
        key: g.key,
        sessions: g.sessions,
        totalWorkMinutes: g.totalWorkMinutes,
        totalLunchMinutes: g.totalLunchMinutes,
        averageLunchMinutes: averageLunchMinutes(g),
        totalBillableMinutes: g.totalBillableMinutes,
        lateCount: g.lateCount,
      })),
    };
  }

  async adminLateReport(year: number, month: number | null) {
    if (month != null && (month < 1 || month > 12)) throw new Error("Invalid month");

    const where: any = { late: true };
    if (month != null) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      where.clockInAt = { gte: start, lt: end };
    } else {
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year + 1, 0, 1));
      where.clockInAt = { gte: start, lt: end };
    }

    const lateSessions = await this.prisma.workSession.findMany({
      where,
      select: { employeeId: true, clockInAt: true },
    });

    const key = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    };

    const map = new Map<string, number>();
    for (const s of lateSessions) {
      const k = month != null ? String(year) : key(s.clockInAt);
      map.set(k, (map.get(k) ?? 0) + 1);
    }

    if (month != null) {
      return { year, month, lateCount: lateSessions.length };
    }

    return { year, lateByMonth: Array.from(map.entries()).map(([k, count]) => ({ monthKey: k, count })) };
  }

  async exportTimesheetCsv(
    access: AccessContext,
    employeeIdParam: string,
    from: Date | null,
    to: Date | null,
    period: "daily" | "weekly" | "monthly",
  ) {
    const ts = await this.getTimesheet(access, employeeIdParam, from, to, period);

    const header = [
      "key",
      "sessions",
      "totalWorkMinutes",
      "totalLunchMinutes",
      "averageLunchMinutes",
      "totalBillableMinutes",
      "lateCount",
    ];

    const rows = ts.groups.map((g: any) => [
      g.key,
      g.sessions,
      g.totalWorkMinutes,
      g.totalLunchMinutes,
      g.averageLunchMinutes,
      g.totalBillableMinutes,
      g.lateCount,
    ]);

    const escape = (value: any) => {
      const s = String(value ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [header.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");

    const fromStr = (from ?? new Date(ts.from)).toISOString().slice(0, 10);
    const toStr = (to ?? new Date(ts.to)).toISOString().slice(0, 10);

    const filename = `timesheet-${employeeIdParam}-${period}-${fromStr}-to-${toStr}.csv`;

    return { csv, filename };
  }

  async exportTimesheetPdf(
    access: AccessContext,
    employeeIdParam: string,
    from: Date | null,
    to: Date | null,
    period: "daily" | "weekly" | "monthly",
  ) {
    const ts = await this.getTimesheet(access, employeeIdParam, from, to, period);

    const fromStr = ts.from.slice(0, 10);
    const toStr = ts.to.slice(0, 10);
    const filename = `timesheet-${employeeIdParam}-${period}-${fromStr}-to-${toStr}.pdf`;

    const doc = new PDFDocument({ size: "A4", margin: 30 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );

    doc.fontSize(16).text("Uppearance HRMS", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Timesheet (${period})`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Employee ID: ${employeeIdParam}`);
    doc.fontSize(10).text(`Range: ${fromStr} -> ${toStr}`);
    doc.moveDown();

    doc.fontSize(10).text("Summary by period:");
    doc.moveDown(0.3);

    for (const g of ts.groups) {
      doc
        .fontSize(10)
        .text(
          `${g.key} | sessions: ${g.sessions} | work(min): ${g.totalWorkMinutes} | lunch(min): ${g.totalLunchMinutes} | avgLunch(min): ${g.averageLunchMinutes} | billable(min): ${g.totalBillableMinutes} | late: ${g.lateCount}`,
        );
    }

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    return { pdfBuffer, filename };
  }
}

