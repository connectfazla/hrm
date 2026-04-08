import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalEmployees,
      lastMonthEmployees,
      onProbation,
      pendingLeave,
      byDepartment,
      byType,
      todaySessions,
      monthSessions,
      lastMonthSessions,
      leaveThisMonth,
      payslipsThisMonth,
      probationEnding30,
      probationEnding60,
      probationEnding90,
      recentLeaves,
    ] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { createdAt: { lt: startOfMonth } } }),
      this.prisma.employee.count({ where: { probationStatus: "ON_PROBATION" } }),
      this.prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      this.prisma.employee.groupBy({ by: ["department"], _count: true }),
      this.prisma.employee.groupBy({ by: ["employmentType"], _count: true }),
      this.prisma.workSession.count({
        where: { clockInAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
      }),
      this.prisma.workSession.findMany({
        where: { clockInAt: { gte: startOfMonth } },
        select: { clockInAt: true, clockOutAt: true, late: true, lateByMinutes: true },
      }),
      this.prisma.workSession.findMany({
        where: { clockInAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        select: { clockInAt: true, clockOutAt: true, late: true },
      }),
      this.prisma.leaveRequest.findMany({
        where: { startDate: { gte: startOfMonth }, status: "APPROVED" },
        select: { type: true, startDate: true, endDate: true },
      }),
      this.prisma.payslip.findMany({
        where: { month: { gte: startOfMonth } },
        select: { baseSalary: true, allowances: true, netPay: true, deductionsTotal: true },
      }),
      this.prisma.employee.count({
        where: {
          probationStatus: "ON_PROBATION",
          probationEndDate: { lte: new Date(now.getTime() + 30 * 86400000) },
        },
      }),
      this.prisma.employee.count({
        where: {
          probationStatus: "ON_PROBATION",
          probationEndDate: { lte: new Date(now.getTime() + 60 * 86400000) },
        },
      }),
      this.prisma.employee.count({
        where: {
          probationStatus: "ON_PROBATION",
          probationEndDate: { lte: new Date(now.getTime() + 90 * 86400000) },
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: { status: "APPROVED", startDate: { gte: now } },
        include: { employee: { select: { fullName: true } } },
        orderBy: { startDate: "asc" },
        take: 10,
      }),
    ]);

    const newHires = totalEmployees - lastMonthEmployees;

    const lateThisMonth = monthSessions.filter((s) => s.late).length;
    const totalSessions = monthSessions.length;
    const onTimePercent = totalSessions > 0 ? Math.round(((totalSessions - lateThisMonth) / totalSessions) * 100) : 100;

    let avgWorkHours = 0;
    const completedSessions = monthSessions.filter((s) => s.clockOutAt);
    if (completedSessions.length > 0) {
      const totalMs = completedSessions.reduce(
        (sum, s) => sum + (new Date(s.clockOutAt!).getTime() - new Date(s.clockInAt).getTime()),
        0,
      );
      avgWorkHours = totalMs / completedSessions.length / 3600000;
    }

    const lastMonthLate = lastMonthSessions.filter((s) => s.late).length;
    const lastMonthTotal = lastMonthSessions.length;
    const lastMonthOnTime = lastMonthTotal > 0 ? Math.round(((lastMonthTotal - lastMonthLate) / lastMonthTotal) * 100) : 100;

    const leaveByType: Record<string, number> = {};
    for (const l of leaveThisMonth) {
      const days = Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1;
      leaveByType[l.type] = (leaveByType[l.type] ?? 0) + days;
    }

    const totalPayrollCost = payslipsThisMonth.reduce((sum, p) => sum + Number(p.netPay), 0);
    const avgSalary = payslipsThisMonth.length > 0 ? totalPayrollCost / payslipsThisMonth.length : 0;

    const costByDepartment: Record<string, number> = {};
    // Simple aggregation via employee query
    const empsWithComp = await this.prisma.employee.findMany({
      select: { department: true, compensation: { select: { baseSalary: true, allowances: true } } },
    });
    for (const e of empsWithComp) {
      const monthly = Number(e.compensation?.baseSalary ?? 0) + Number(e.compensation?.allowances ?? 0);
      costByDepartment[e.department] = (costByDepartment[e.department] ?? 0) + monthly;
    }

    return {
      headcount: {
        total: totalEmployees,
        newHires,
        byDepartment: byDepartment.map((d) => ({ department: d.department, count: d._count })),
        byType: byType.map((t) => ({ type: t.employmentType, count: t._count })),
      },
      attendance: {
        todayPresent: todaySessions,
        lateThisMonth,
        onTimePercent,
        lastMonthOnTimePercent: lastMonthOnTime,
        avgWorkHours: Number(avgWorkHours.toFixed(1)),
        totalSessions,
      },
      leave: {
        pending: pendingLeave,
        byType: leaveByType,
        upcoming: recentLeaves.map((l) => ({
          employee: l.employee.fullName,
          type: l.type,
          startDate: l.startDate,
          endDate: l.endDate,
        })),
      },
      payroll: {
        totalCost: Number(totalPayrollCost.toFixed(2)),
        avgSalary: Number(avgSalary.toFixed(2)),
        costByDepartment,
      },
      probation: {
        onProbation,
        ending30: probationEnding30,
        ending60: probationEnding60,
        ending90: probationEnding90,
      },
    };
  }

  async getAttendanceReport(year: number, month: number | null, department?: string) {
    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);

    const where: any = { clockInAt: { gte: startDate, lte: endDate } };
    if (department) {
      where.employee = { department };
    }

    const sessions = await this.prisma.workSession.findMany({
      where,
      include: { employee: { select: { id: true, fullName: true, department: true } } },
      orderBy: { clockInAt: "asc" },
    });

    const byEmployee = new Map<string, {
      employeeId: string;
      fullName: string;
      department: string;
      daysWorked: number;
      daysLate: number;
      totalMinutes: number;
      totalLateMinutes: number;
      clockIns: Date[];
    }>();

    for (const s of sessions) {
      const emp = byEmployee.get(s.employeeId) ?? {
        employeeId: s.employeeId,
        fullName: s.employee.fullName,
        department: s.employee.department,
        daysWorked: 0,
        daysLate: 0,
        totalMinutes: 0,
        totalLateMinutes: 0,
        clockIns: [],
      };

      emp.daysWorked += 1;
      if (s.late) {
        emp.daysLate += 1;
        emp.totalLateMinutes += s.lateByMinutes;
      }

      if (s.clockOutAt) {
        emp.totalMinutes += Math.round((new Date(s.clockOutAt).getTime() - new Date(s.clockInAt).getTime()) / 60000);
      }

      emp.clockIns.push(new Date(s.clockInAt));
      byEmployee.set(s.employeeId, emp);
    }

    const employees = Array.from(byEmployee.values()).map((e) => {
      const avgClockIn = e.clockIns.length > 0
        ? new Date(e.clockIns.reduce((sum, d) => sum + d.getTime(), 0) / e.clockIns.length)
        : null;
      return {
        employeeId: e.employeeId,
        fullName: e.fullName,
        department: e.department,
        daysWorked: e.daysWorked,
        daysLate: e.daysLate,
        avgHoursPerDay: e.daysWorked > 0 ? Number((e.totalMinutes / e.daysWorked / 60).toFixed(1)) : 0,
        avgClockInTime: avgClockIn?.toISOString() ?? null,
        avgLateMinutes: e.daysLate > 0 ? Math.round(e.totalLateMinutes / e.daysLate) : 0,
      };
    });

    const totalLate = employees.reduce((s, e) => s + e.daysLate, 0);
    const totalDays = employees.reduce((s, e) => s + e.daysWorked, 0);
    const onTimePercent = totalDays > 0 ? Math.round(((totalDays - totalLate) / totalDays) * 100) : 100;

    return { employees, summary: { totalLate, totalDays, onTimePercent } };
  }
}
