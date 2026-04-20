import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  LeaveStatus,
  LeaveType,
  Role,
  ProbationStatus,
  PayrollDeductionKind,
} from "@prisma/client";

type RequestLeavePayload = {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
};

type DecidePayload = {
  comment: string;
};

type AccessContext = {
  role: Role;
  employeeId: string | null;
};

type Breakdown = {
  sick?: { fullUsed?: number; halfUsed?: number; unpaidUsed?: number };
  maternity?: { fullUsed?: number; halfUsed?: number };
  [k: string]: any;
};

function toUtcDateOnly(dateStr: string) {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function eachDayInclusive(start: Date, end: Date) {
  const days: Date[] = [];
  const cur = new Date(start.getTime());
  while (cur.getTime() <= end.getTime()) {
    days.push(new Date(cur.getTime()));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function monthKeyUtc(d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return new Date(Date.UTC(y, m, 1));
}

function monthsBetween(a: Date, b: Date) {
  return (a.getUTCFullYear() - b.getUTCFullYear()) * 12 + (a.getUTCMonth() - b.getUTCMonth());
}

function safeInt(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async requestLeave(employeeId: string, payload: RequestLeavePayload) {
    const startDate = toUtcDateOnly(payload.startDate);
    const endDate = toUtcDateOnly(payload.endDate);

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException("endDate must be >= startDate");
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { compensation: true },
    });
    if (!employee) throw new NotFoundException("Employee not found");

    // Ensure leave request dates don't exceed reasonable bounds (basic validation).
    const dayCount = eachDayInclusive(startDate, endDate).length;
    if (dayCount <= 0) throw new BadRequestException("Invalid leave date range");

    const latest = await this.getLatestSnapshot(employeeId);

    // Quick validation for paid ANNUAL: if probation overrides to unpaid, it doesn't consume paid days.
    if (payload.type === LeaveType.ANNUAL) {
      const paidDays = this.countPaidAnnualDays(employee, startDate, endDate);
      const paidRemaining =
        latest.paidAccruedDays + latest.paidAnnualDays + latest.carryOverDays - latest.paidUsedDays;

      if (paidDays > paidRemaining) {
        throw new ForbiddenException("Not enough paid leave balance");
      }
    }

    // For emergency unpaid leave, we validate available emergency quota.
    if (payload.type === LeaveType.EMERGENCY_UNPAID) {
      if (latest.emergencyUnpaidRemainingDays < dayCount) {
        throw new ForbiddenException("Not enough emergency unpaid leave balance");
      }
    }

    // Create request (balances updated only on approval).
    const leave = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        type: payload.type,
        startDate,
        endDate,
        reason: payload.reason,
        status: LeaveStatus.PENDING,
      },
    });

    await this.notifications.notifyAdminsLeavePending({
      employeeId,
      leaveRequestId: leave.id,
      type: payload.type,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    });

    return { leaveRequest: leave };
  }

  async decideLeave(
    leaveRequestId: string,
    adminUserId: string,
    comment: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { employee: { include: { compensation: true } } },
    });

    if (!leaveRequest) throw new NotFoundException("Leave request not found");
    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException("Leave request already decided");
    }

    const decidedAt = new Date();

    if (decision === "REJECTED") {
      const updated = await this.prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: LeaveStatus.REJECTED,
          adminComment: comment,
          decidedByUserId: adminUserId,
          decidedAt,
        },
      });

      try {
        await this.notifications.notifyEmployeeDecision({
          employeeId: leaveRequest.employeeId,
          leaveRequestId: updated.id,
          decision: "REJECTED",
          adminComment: comment,
          type: leaveRequest.type,
          startDate: leaveRequest.startDate.toISOString().slice(0, 10),
          endDate: leaveRequest.endDate.toISOString().slice(0, 10),
        });
      } catch {
        // Notification failure should not block the leave decision
      }

      return updated;
    }

    const snapshot = await this.getLatestSnapshot(leaveRequest.employeeId);
    const updatedSnapshotAndDeductions = await this.applyApprovalAndComputeDeductions(
      leaveRequest,
      snapshot,
      decidedAt,
    );

    const updated = await this.prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: LeaveStatus.APPROVED,
        adminComment: comment,
        decidedByUserId: adminUserId,
        decidedAt,
      },
    });

    // Apply balances + deduction lines
    await this.prisma.$transaction(async (tx) => {
      await tx.leaveBalanceSnapshot.update({
        where: { id: snapshot.id },
        data: updatedSnapshotAndDeductions.snapshotUpdate,
      });

      if (updatedSnapshotAndDeductions.deductionsToCreate.length > 0) {
        await tx.leaveDeduction.createMany({
          data: updatedSnapshotAndDeductions.deductionsToCreate.map((d) => ({
            leaveRequestId: leaveRequest.id,
            payrollMonth: d.payrollMonth,
            deductionAmount: d.deductionAmount,
            rateApplied: d.rateApplied,
            details: d.details,
          })),
        });
      }
    });

    try {
      await this.notifications.notifyEmployeeDecision({
        employeeId: leaveRequest.employeeId,
        leaveRequestId: updated.id,
        decision: "APPROVED",
        adminComment: comment,
        type: leaveRequest.type,
        startDate: leaveRequest.startDate.toISOString().slice(0, 10),
        endDate: leaveRequest.endDate.toISOString().slice(0, 10),
      });
    } catch {
      // Notification failure should not block the leave decision
    }

    return updated;
  }

  async getBalances(role: Role, actorEmployeeId: string | null, targetEmployeeId: string) {
    if (role !== Role.ADMIN && actorEmployeeId !== targetEmployeeId) {
      throw new ForbiddenException("Not allowed");
    }

    const snapshot = await this.getLatestSnapshot(targetEmployeeId);
    return snapshot;
  }

  /** Admin correction of the latest balance snapshot (same row updated in place). */
  async adjustSnapshotBalances(
    employeeId: string,
    patch: Partial<{
      paidAccruedDays: number;
      paidAnnualDays: number;
      carryOverDays: number;
      paidUsedDays: number;
      emergencyUnpaidRemainingDays: number;
      unpaidUsedDays: number;
    }>,
    actorRole: Role,
  ) {
    if (actorRole !== Role.ADMIN) {
      throw new ForbiddenException("Only administrators can adjust leave balances");
    }

    const snap = await this.getLatestSnapshot(employeeId);
    const data: Record<string, number> = {};
    const keys = [
      "paidAccruedDays",
      "paidAnnualDays",
      "carryOverDays",
      "paidUsedDays",
      "emergencyUnpaidRemainingDays",
      "unpaidUsedDays",
    ] as const;
    for (const k of keys) {
      if (patch[k] !== undefined) {
        const n = Math.floor(Number(patch[k]));
        data[k] = Number.isFinite(n) && n >= 0 ? n : 0;
      }
    }
    if (Object.keys(data).length === 0) return snap;
    return this.prisma.leaveBalanceSnapshot.update({
      where: { id: snap.id },
      data,
    });
  }

  async listRequests(role: Role, employeeId: string | null, status?: LeaveStatus) {
    if (role === Role.ADMIN) {
      const where: any = {};
      if (status) where.status = status;
      if (employeeId) where.employeeId = employeeId;
      return this.prisma.leaveRequest.findMany({
        where: Object.keys(where).length ? where : undefined,
        include: { employee: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }
    if (!employeeId) return [];
    return this.prisma.leaveRequest.findMany({
      where: { employeeId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  private async getLatestSnapshot(employeeId: string) {
    const now = new Date();

    const existing = await this.prisma.leaveBalanceSnapshot.findFirst({
      where: { employeeId },
      orderBy: { asOfDate: "desc" },
    });

    if (existing) return existing;

    // Fallback snapshot if seed/migration wasn't run yet.
    // (This keeps the UI usable even before snapshot history is fully generated.)
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException("Employee not found");

    const probationEnd = employee.probationEndDate;

    let paidAccruedDays = 0;
    let paidAnnualDays = 0;
    let carryOverDays = 0;
    let unpaidUsedDays = 0;

    if (now < probationEnd) {
      paidAccruedDays = 0;
      paidAnnualDays = 0;
      carryOverDays = 0;
      unpaidUsedDays = 0;
    } else {
      const joinedMonths = monthsBetween(now, employee.dateJoined);
      if (joinedMonths < 12) {
        const monthsInAccrual = Math.max(0, joinedMonths - 6);
        paidAccruedDays = Math.min(24, monthsInAccrual * 2);
      } else {
        paidAnnualDays = 30;
        carryOverDays = 3;
      }
    }

    return this.prisma.leaveBalanceSnapshot.create({
      data: {
        employeeId,
        asOfDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        paidAccruedDays,
        paidAnnualDays,
        carryOverDays,
        paidUsedDays: 0,
        emergencyUnpaidRemainingDays: 30,
        unpaidUsedDays,
        breakdown: {
          sick: { fullUsed: 0, halfUsed: 0, unpaidUsed: 0 },
          maternity: { fullUsed: 0, halfUsed: 0 },
        },
      },
    });
  }

  private countPaidAnnualDays(employee: { probationEndDate: Date }, startDate: Date, endDate: Date) {
    // Paid ANNUAL days are those not overridden by probation.
    return eachDayInclusive(startDate, endDate).filter((d) => d.getTime() >= employee.probationEndDate.getTime())
      .length;
  }

  private async applyApprovalAndComputeDeductions(leaveRequest: any, snapshot: any, decidedAt: Date) {
    const employee = leaveRequest.employee;
    const employeeId = leaveRequest.employeeId;

    const days = eachDayInclusive(leaveRequest.startDate, leaveRequest.endDate);
    const dailyRate = (Number(employee.compensation.baseSalary) + Number(employee.compensation.allowances)) / 30;

    // Clone snapshot breakdown so we can calculate usage deterministically.
    const breakdown: Breakdown = (snapshot.breakdown ?? {}) as Breakdown;
    breakdown.sick = breakdown.sick ?? { fullUsed: 0, halfUsed: 0, unpaidUsed: 0 };
    breakdown.maternity = breakdown.maternity ?? { fullUsed: 0, halfUsed: 0 };

    const sick = breakdown.sick!;
    const maternity = breakdown.maternity!;

    let paidUsedDelta = 0;
    let unpaidUsedDelta = 0;
    let emergencyUnpaidDelta = 0;

    // Deduction accumulation by month.
    const deductionsByMonth = new Map<
      string,
      { payrollMonth: Date; deductionAmount: number; rateApplied: number; details: any }
    >();

    const probationEndMs = employee.probationEndDate.getTime();

    for (const day of days) {
      const duringProbation = day.getTime() < probationEndMs;

      let payKind: "FULL" | "HALF" | "UNPAID" = "UNPAID";
      let applyPaidAnnual = false;
      let applySickBucket = false;
      let applyMaternityBucket = false;

      if (duringProbation) {
        payKind = "UNPAID";
      } else {
        switch (leaveRequest.type as LeaveType) {
          case LeaveType.ANNUAL:
            payKind = "FULL";
            applyPaidAnnual = true;
            break;
          case LeaveType.EMERGENCY_UNPAID:
            payKind = "UNPAID";
            break;
          case LeaveType.SICK: {
            applySickBucket = true;
            if (safeInt(sick.fullUsed) < 15) {
              payKind = "FULL";
              sick.fullUsed = safeInt(sick.fullUsed) + 1;
            } else if (safeInt(sick.halfUsed) < 30) {
              payKind = "HALF";
              sick.halfUsed = safeInt(sick.halfUsed) + 1;
            } else {
              payKind = "UNPAID";
              sick.unpaidUsed = safeInt(sick.unpaidUsed) + 1;
            }
            break;
          }
          case LeaveType.MATERNITY: {
            applyMaternityBucket = true;
            if (safeInt(maternity.fullUsed) < 45) {
              payKind = "FULL";
              maternity.fullUsed = safeInt(maternity.fullUsed) + 1;
            } else if (safeInt(maternity.halfUsed) < 15) {
              payKind = "HALF";
              maternity.halfUsed = safeInt(maternity.halfUsed) + 1;
            } else {
              payKind = "UNPAID";
            }
            break;
          }
          case LeaveType.HAJJ:
            payKind = "UNPAID";
            break;
          default:
            // User clarified: treat unspecified leave types as unpaid unless explicitly specified.
            payKind = "UNPAID";
            break;
        }
      }

      if (leaveRequest.type === LeaveType.EMERGENCY_UNPAID || leaveRequest.type === LeaveType.HAJJ) {
        // These are always unpaid outside probation.
      }

      if (applyPaidAnnual && payKind === "FULL") {
        paidUsedDelta += 1;
      } else if (payKind === "UNPAID") {
        unpaidUsedDelta += 1;
        if (leaveRequest.type === LeaveType.EMERGENCY_UNPAID) {
          emergencyUnpaidDelta += 1;
        }
      } else if (payKind === "HALF") {
        // Half pay still isn't considered "unpaidUsedDays" (it affects payroll deduction separately).
      }

      if (payKind === "HALF" || payKind === "UNPAID") {
        const payrollMonth = monthKeyUtc(day);
        const monthKey = `${payrollMonth.getUTCFullYear()}-${payrollMonth.getUTCMonth() + 1}`;
        const factor = payKind === "HALF" ? 0.5 : 1.0;
        const deductionAmount = dailyRate * factor;

        const existing = deductionsByMonth.get(monthKey);
        if (existing) {
          existing.deductionAmount += deductionAmount;
        } else {
          deductionsByMonth.set(monthKey, {
            payrollMonth,
            deductionAmount,
            rateApplied: dailyRate,
            details: { leaveRequestType: leaveRequest.type, payKind, day: day.toISOString().slice(0, 10) },
          });
        }
      }
    }

    const deductionsToCreate = Array.from(deductionsByMonth.values()).map((m) => ({
      payrollMonth: m.payrollMonth,
      deductionAmount: Number(m.deductionAmount.toFixed(2)),
      rateApplied: Number(m.rateApplied.toFixed(2)),
      details: m.details,
    }));

    return {
      snapshotUpdate: {
        paidUsedDays: snapshot.paidUsedDays + paidUsedDelta,
        unpaidUsedDays: snapshot.unpaidUsedDays + unpaidUsedDelta,
        emergencyUnpaidRemainingDays:
          snapshot.emergencyUnpaidRemainingDays - emergencyUnpaidDelta < 0
            ? 0
            : snapshot.emergencyUnpaidRemainingDays - emergencyUnpaidDelta,
        breakdown,
      },
      deductionsToCreate,
    };
  }
}

