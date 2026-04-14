import { Injectable, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

/** Public schema tables managed by this app (excludes `_prisma_migrations`). Order does not matter for TRUNCATE … CASCADE. */
const DATA_TABLE_NAMES = [
  "ApiKey",
  "AttendanceConfig",
  "AttendanceDisruption",
  "AuditLog",
  "BankAccount",
  "Document",
  "EmergencyContact",
  "Employee",
  "EmployeeCompensation",
  "LeaveAccrualEvent",
  "LeaveBalanceSnapshot",
  "LeaveDeduction",
  "LeaveRequest",
  "LunchBreak",
  "Notification",
  "PasswordResetToken",
  "PayrollDeductionLine",
  "PayrollRun",
  "Payslip",
  "RefreshToken",
  "SalaryHistory",
  "SiteSettings",
  "User",
  "WorkSession",
] as const;

function settingsBackupJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value != null && typeof value === "object" && (value as { constructor?: { name?: string } }).constructor?.name === "Decimal") {
    return String(value);
  }
  return value;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const rows = await this.prisma.siteSettings.findMany();
    const result: Record<string, any> = {};
    for (const r of rows) result[r.key] = r.value;
    return result;
  }

  async get(key: string) {
    const row = await this.prisma.siteSettings.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async set(key: string, value: any) {
    return this.prisma.siteSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async testSmtp(settings: { host: string; port: number; user?: string; pass?: string }) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: settings.host,
      port: settings.port,
      auth: settings.user && settings.pass ? { user: settings.user, pass: settings.pass } : undefined,
    });

    try {
      await transporter.verify();
      return { success: true, message: "SMTP connection successful" };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }

  /** Snapshot of all application tables as JSON (for download before destructive reset). */
  async exportAllTablesJson(): Promise<Record<string, unknown[]>> {
    const out: Record<string, unknown[]> = {};
    for (const name of DATA_TABLE_NAMES) {
      const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${name}"`);
      out[name] = rows;
    }
    return out;
  }

  /**
   * Deletes all rows from application tables, then restores a minimal AttendanceConfig so the API stays usable.
   * Caller must verify admin password and confirmation phrase.
   */
  async executeFullDataReset(actorUserId: string, password: string): Promise<{ tablesTruncated: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: actorUserId } });
    if (!user) throw new UnauthorizedException("Not authenticated");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Incorrect password");

    const quoted = DATA_TABLE_NAMES.map((n) => `"${n}"`).join(", ");
    await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);

    await this.prisma.attendanceConfig.upsert({
      where: { id: "00000000-0000-0000-0000-000000000001" },
      update: { workdayStartTime: new Date("2025-01-01T09:00:00.000Z"), lateGraceMinutes: 5 },
      create: {
        id: "00000000-0000-0000-0000-000000000001",
        workdayStartTime: new Date("2025-01-01T09:00:00.000Z"),
        lateGraceMinutes: 5,
      },
    });

    return { tablesTruncated: DATA_TABLE_NAMES.length };
  }

  getBackupJsonString(payload: Record<string, unknown[]>): string {
    return JSON.stringify(
      { exportedAt: new Date().toISOString(), tables: payload },
      settingsBackupJsonReplacer,
    );
  }
}
