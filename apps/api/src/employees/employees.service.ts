import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import bcrypt from "bcrypt";
import { Role, EmploymentType, ProbationStatus, DocumentCategory } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { Employee, EmployeeCompensation, BankAccount, EmergencyContact } from "@prisma/client";

type ActorContext = {
  actorUserId: string;
};

// Controller schemas are raw validation outputs; service converts strings -> Date/etc.
type CreateEmployeePayload = {
  fullName: string;
  jobTitle: string;
  department: string;
  dateOfBirth: string;
  nationality: string;
  personalEmail?: string | null;
  workEmail: string;
  phone: string;
  emiratesIdNumber: string;
  emiratesIdExpiryDate: string;
  passportNumber: string;
  passportExpiryDate: string;
  dateJoined: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  notes?: string | null;
  initialPassword: string;
  baseSalary: number;
  allowances: number;
  bankAccount: {
    bankName: string;
    accountHolderName: string;
    iban?: string | null;
    accountNumber?: string | null;
  };
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
};

type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, "initialPassword">> & {
  salaryChangeReason?: string | null;
  salaryChangeDate?: string | null;
};

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function calcProbationStatus(now: Date, dateJoined: Date) {
  const probationEndDate = addMonths(dateJoined, 6);
  const status = now < probationEndDate ? ProbationStatus.ON_PROBATION : ProbationStatus.CONFIRMED;
  return { probationEndDate, status };
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(role: Role, employeeId: string | null) {
    if (role === Role.ADMIN) {
      const employees = await this.prisma.employee.findMany({
        include: {
          compensation: true,
          bankAccount: true,
          emergencyContact: true,
          salaryHistory: { orderBy: { effectiveDate: "desc" }, take: 5 },
          documents: {
            where: { category: DocumentCategory.PROFILE_PHOTO },
            take: 1,
            select: { id: true, mimeType: true, originalFileName: true, expiryDate: true },
          },
        },
        orderBy: { fullName: "asc" },
      });
      const users = await this.prisma.user.findMany({
        where: { employeeId: { in: employees.map((e) => e.id) } },
        select: { employeeId: true, id: true, role: true },
      });
      const userMap = new Map(users.map((u) => [u.employeeId, u]));
      return employees.map((e) => ({
        ...e,
        userId: userMap.get(e.id)?.id ?? null,
        role: userMap.get(e.id)?.role ?? null,
      }));
    }

    if (!employeeId) return [];

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        department: true,
        dateOfBirth: true,
        nationality: true,
        personalEmail: true,
        workEmail: true,
        phone: true,
        emiratesIdNumber: true,
        emiratesIdExpiryDate: true,
        passportNumber: true,
        passportExpiryDate: true,
        dateJoined: true,
        employmentType: true,
        probationStatus: true,
        probationEndDate: true,
        archivedAt: true,

        // Admin-only field: intentionally omitted for employees.

        compensation: true,
        bankAccount: true,
        emergencyContact: true,
        salaryHistory: { orderBy: { effectiveDate: "desc" }, take: 5 },
        documents: {
          where: { category: DocumentCategory.PROFILE_PHOTO },
          take: 1,
          select: { id: true, mimeType: true, originalFileName: true, expiryDate: true },
        },
      },
    });

    return employee ? [employee] : [];
  }

  async getForUser(role: Role, employeeId: string | null, targetEmployeeId: string) {
    if (role !== Role.ADMIN && employeeId !== targetEmployeeId) {
      throw new ForbiddenException("Not allowed");
    }

    const employee =
      role === Role.ADMIN
        ? await this.prisma.employee.findUnique({
            where: { id: targetEmployeeId },
            include: {
              compensation: true,
              bankAccount: true,
              emergencyContact: true,
              salaryHistory: { orderBy: { effectiveDate: "desc" } },
              documents: {
                where: { category: DocumentCategory.PROFILE_PHOTO },
                take: 1,
                select: { id: true, mimeType: true, originalFileName: true, expiryDate: true },
              },
            },
          })
        : await this.prisma.employee.findUnique({
            where: { id: targetEmployeeId },
            select: {
              id: true,
              fullName: true,
              jobTitle: true,
              department: true,
              dateOfBirth: true,
              nationality: true,
              personalEmail: true,
              workEmail: true,
              phone: true,
              emiratesIdNumber: true,
              emiratesIdExpiryDate: true,
              passportNumber: true,
              passportExpiryDate: true,
              dateJoined: true,
              employmentType: true,
              probationStatus: true,
              probationEndDate: true,
              archivedAt: true,

              compensation: true,
              bankAccount: true,
              emergencyContact: true,
              salaryHistory: { orderBy: { effectiveDate: "desc" } },
              documents: {
                where: { category: DocumentCategory.PROFILE_PHOTO },
                take: 1,
                select: { id: true, mimeType: true, originalFileName: true, expiryDate: true },
              },
            },
          });

    if (!employee) throw new NotFoundException("Employee not found");
    return employee;
  }

  async createEmployee(payload: CreateEmployeePayload, actorUserId: string) {
    const now = new Date();
    const dateJoined = new Date(payload.dateJoined);

    const { probationEndDate, status } = calcProbationStatus(now, dateJoined);

    const passwordHash = await bcrypt.hash(payload.initialPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          fullName: payload.fullName,
          jobTitle: payload.jobTitle,
          department: payload.department,
          dateOfBirth: new Date(payload.dateOfBirth),
          nationality: payload.nationality,
          personalEmail: payload.personalEmail ?? null,
          workEmail: payload.workEmail,
          phone: payload.phone,
          emiratesIdNumber: payload.emiratesIdNumber,
          emiratesIdExpiryDate: new Date(payload.emiratesIdExpiryDate),
          passportNumber: payload.passportNumber,
          passportExpiryDate: new Date(payload.passportExpiryDate),

          dateJoined,
          employmentType: payload.employmentType as EmploymentType,
          probationStatus: status,
          probationEndDate,

          notes: payload.notes ?? null,

          compensation: {
            create: {
              baseSalary: payload.baseSalary,
              allowances: payload.allowances,
            },
          },
          bankAccount: {
            create: {
              bankName: payload.bankAccount.bankName,
              accountHolderName: payload.bankAccount.accountHolderName,
              iban: payload.bankAccount.iban ?? null,
              accountNumber: payload.bankAccount.accountNumber ?? null,
            },
          },
          emergencyContact: {
            create: {
              name: payload.emergencyContact.name,
              relation: payload.emergencyContact.relation,
              phone: payload.emergencyContact.phone,
            },
          },
          salaryHistory: {
            create: {
              effectiveDate: dateJoined,
              oldBaseSalary: 0,
              newBaseSalary: payload.baseSalary,
              oldAllowances: 0,
              newAllowances: payload.allowances,
              reason: "Initial salary (seed/create)",
              changedByUserId: actorUserId,
            },
          },
        },
        include: {
          compensation: true,
          bankAccount: true,
          emergencyContact: true,
          salaryHistory: true,
        },
      });

      await tx.user.create({
        data: {
          email: payload.workEmail,
          passwordHash,
          role: Role.EMPLOYEE,
          employeeId: employee.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "CREATE",
          entityType: "Employee",
          entityId: employee.id,
          after: { fullName: payload.fullName, workEmail: payload.workEmail },
        },
      });

      return employee;
    });
  }

  async updateEmployee(id: string, payload: UpdateEmployeePayload, actorUserId: string) {
    // This endpoint is admin-only in the controller.
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.employee.findUnique({
        where: { id },
        include: { compensation: true, bankAccount: true, emergencyContact: true },
      });

      if (!existing) throw new NotFoundException("Employee not found");

      const before = {
        fullName: existing.fullName,
        jobTitle: existing.jobTitle,
        department: existing.department,
        dateJoined: existing.dateJoined,
      };

      const dateJoinedNext = payload.dateJoined ? new Date(payload.dateJoined) : existing.dateJoined;
      const { probationEndDate, status } =
        payload.dateJoined != null ? calcProbationStatus(now, dateJoinedNext) : { probationEndDate: existing.probationEndDate, status: existing.probationStatus };

      const salaryBaseOld = existing.compensation?.baseSalary ?? 0;
      const salaryAllowOld = existing.compensation?.allowances ?? 0;

      const salaryBaseNew =
        payload.baseSalary != null ? payload.baseSalary : salaryBaseOld;
      const salaryAllowNew =
        payload.allowances != null ? payload.allowances : salaryAllowOld;

      const salaryChanged = payload.baseSalary != null || payload.allowances != null;

      if (salaryChanged && (salaryBaseNew !== salaryBaseOld || salaryAllowNew !== salaryAllowOld)) {
        const effectiveDate = payload.salaryChangeDate ? new Date(payload.salaryChangeDate) : now;
        await tx.salaryHistory.create({
          data: {
            employeeId: id,
            effectiveDate,
            oldBaseSalary: salaryBaseOld,
            newBaseSalary: salaryBaseNew,
            oldAllowances: salaryAllowOld,
            newAllowances: salaryAllowNew,
            reason: payload.salaryChangeReason ?? "Salary change",
            changedByUserId: actorUserId,
          },
        });
      }

      const updated = await tx.employee.update({
        where: { id },
        data: {
          fullName: payload.fullName ?? existing.fullName,
          jobTitle: payload.jobTitle ?? existing.jobTitle,
          department: payload.department ?? existing.department,
          dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : existing.dateOfBirth,
          nationality: payload.nationality ?? existing.nationality,
          personalEmail: payload.personalEmail ?? existing.personalEmail,
          workEmail: payload.workEmail ?? existing.workEmail,
          phone: payload.phone ?? existing.phone,
          emiratesIdNumber: payload.emiratesIdNumber ?? existing.emiratesIdNumber,
          emiratesIdExpiryDate: payload.emiratesIdExpiryDate
            ? new Date(payload.emiratesIdExpiryDate)
            : existing.emiratesIdExpiryDate,
          passportNumber: payload.passportNumber ?? existing.passportNumber,
          passportExpiryDate: payload.passportExpiryDate
            ? new Date(payload.passportExpiryDate)
            : existing.passportExpiryDate,

          dateJoined: dateJoinedNext,
          employmentType: (payload.employmentType ?? existing.employmentType) as EmploymentType,
          probationStatus: status,
          probationEndDate,

          notes: payload.notes ?? existing.notes,

          compensation: salaryChanged
            ? {
                upsert: {
                  update: { baseSalary: salaryBaseNew, allowances: salaryAllowNew },
                  create: { baseSalary: salaryBaseNew, allowances: salaryAllowNew },
                },
              }
            : undefined,

          bankAccount:
            payload.bankAccount != null
              ? {
                  upsert: {
                    update: {
                      bankName: payload.bankAccount.bankName,
                      accountHolderName: payload.bankAccount.accountHolderName,
                      iban: payload.bankAccount.iban ?? null,
                      accountNumber: payload.bankAccount.accountNumber ?? null,
                    },
                    create: {
                      bankName: payload.bankAccount.bankName,
                      accountHolderName: payload.bankAccount.accountHolderName,
                      iban: payload.bankAccount.iban ?? null,
                      accountNumber: payload.bankAccount.accountNumber ?? null,
                    },
                  },
                }
              : undefined,

          emergencyContact:
            payload.emergencyContact != null
              ? {
                  upsert: {
                    update: {
                      name: payload.emergencyContact.name,
                      relation: payload.emergencyContact.relation,
                      phone: payload.emergencyContact.phone,
                    },
                    create: {
                      name: payload.emergencyContact.name,
                      relation: payload.emergencyContact.relation,
                      phone: payload.emergencyContact.phone,
                    },
                  },
                }
              : undefined,
        },
        include: {
          compensation: true,
          bankAccount: true,
          emergencyContact: true,
          salaryHistory: { orderBy: { effectiveDate: "desc" } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "UPDATE",
          entityType: "Employee",
          entityId: id,
          before,
          after: {
            fullName: updated.fullName,
            workEmail: updated.workEmail,
          },
        },
      });

      return updated;
    });
  }

  async archiveEmployee(employeeId: string, actorUserId: string, actorEmployeeId: string | null) {
    if (actorEmployeeId && actorEmployeeId === employeeId) {
      throw new BadRequestException("You cannot archive your own employee record.");
    }

    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { id: true } } },
    });
    if (!emp) throw new NotFoundException("Employee not found");
    if (emp.archivedAt) throw new BadRequestException("Employee is already archived.");

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: { archivedAt: now },
      });
      if (emp.user) {
        await tx.refreshToken.updateMany({
          where: { userId: emp.user.id, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "ARCHIVE",
          entityType: "Employee",
          entityId: employeeId,
          after: { archivedAt: now.toISOString() },
        },
      });
    });

    return { ok: true as const, archivedAt: now.toISOString() };
  }

  async unarchiveEmployee(employeeId: string, actorUserId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException("Employee not found");
    if (!emp.archivedAt) throw new BadRequestException("Employee is not archived.");

    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: { archivedAt: null },
      });
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "UNARCHIVE",
          entityType: "Employee",
          entityId: employeeId,
          after: { archivedAt: null },
        },
      });
    });

    return { ok: true as const };
  }

  async deleteEmployee(employeeId: string, actorUserId: string, actorEmployeeId: string | null) {
    if (actorEmployeeId && actorEmployeeId === employeeId) {
      throw new BadRequestException("You cannot delete your own employee record.");
    }

    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!emp) throw new NotFoundException("Employee not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "DELETE",
          entityType: "Employee",
          entityId: employeeId,
          before: { fullName: emp.fullName, workEmail: emp.workEmail },
        },
      });

      if (emp.user) {
        await tx.user.delete({ where: { id: emp.user.id } });
      }
      await tx.employee.delete({ where: { id: employeeId } });
    });

    return { ok: true as const };
  }
}

