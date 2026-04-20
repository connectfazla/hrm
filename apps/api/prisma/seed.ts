import {
  PrismaClient,
  Role,
  EmploymentType,
  ProbationStatus,
  LeaveType,
  LeaveStatus,
  DocumentCategory,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { mergeEmailTemplates } from "../src/mail/email-template-defaults";

/**
 * Demo / local dataset only. Never run against production.
 *
 * - `git commit` does not execute this file — only your Git history changes.
 * - `prisma migrate deploy` does not run seed.
 * - This script runs only when someone runs `prisma db seed` (or Compose `--profile demo`).
 * - If NODE_ENV is `production`, seed exits unless ALLOW_DEMO_SEED=true (intentional override).
 */
const prisma = new PrismaClient();

function assertSafeToRunDemoSeed() {
  const prod = process.env.NODE_ENV === "production";
  const allowed = process.env.ALLOW_DEMO_SEED === "true";
  if (prod && !allowed) {
    console.error(
      "[seed] Refusing to run: NODE_ENV=production. This script creates demo users and mutates data.\n" +
        "         Live databases are unaffected by git commits; only migrate deploy applies schema changes.\n" +
        "         To run seed anyway (never on real prod), set ALLOW_DEMO_SEED=true.",
    );
    process.exit(1);
  }
}

/** Former multi-employee seed accounts — removed so re-seed leaves only admin + Fazla Rabbi. */
const LEGACY_SEED_EMPLOYEE_EMAILS = [
  "aisha@uppearance.com",
  "khalid@uppearance.com",
  "lina@uppearance.com",
  "noor@uppearance.com",
  "samir@uppearance.com",
] as const;

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
}

function dateOnly(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

function setTime(date: Date, h: number, m: number) {
  const d = new Date(date.getTime());
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function monthsBetween(a: Date, b: Date) {
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

async function seed() {
  assertSafeToRunDemoSeed();

  const now = new Date();
  const saltRounds = 10;

  await prisma.attendanceConfig.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { workdayStartTime: new Date("2025-01-01T09:00:00.000Z"), lateGraceMinutes: 5 },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      workdayStartTime: new Date("2025-01-01T09:00:00.000Z"),
      lateGraceMinutes: 5,
    },
  });

  // ─── Admin user with an Employee record ──────────────────
  const adminEmail = "admin@uppearance.com";
  const adminPasswordHash = await bcrypt.hash("Admin123!", saltRounds);

  const adminEmployee = await prisma.employee.upsert({
    where: { workEmail: adminEmail },
    update: {},
    create: {
      fullName: "Fahad Al Rashidi",
      jobTitle: "Managing Director",
      department: "Management",
      dateOfBirth: dateOnly(1985, 3, 15),
      nationality: "Emirati",
      workEmail: adminEmail,
      phone: "+971500000000",
      emiratesIdNumber: "784-000-001",
      emiratesIdExpiryDate: dateOnly(2030, 6, 1),
      passportNumber: "P0000001",
      passportExpiryDate: dateOnly(2031, 1, 1),
      dateJoined: dateOnly(2023, 1, 1),
      employmentType: EmploymentType.FULL_TIME,
      probationStatus: ProbationStatus.CONFIRMED,
      probationEndDate: dateOnly(2023, 7, 1),
      notes: "Company founder & admin.",
      compensation: { create: { baseSalary: 25000, allowances: 5000 } },
      bankAccount: {
        create: {
          bankName: "Emirates NBD",
          accountHolderName: "Fahad Al Rashidi",
          iban: "AE070331234567890123456",
          accountNumber: "1234567890",
        },
      },
      emergencyContact: {
        create: { name: "Sara Al Rashidi", relation: "Spouse", phone: "+971500000099" },
      },
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash, role: Role.ADMIN, employeeId: adminEmployee.id },
    create: { email: adminEmail, passwordHash: adminPasswordHash, role: Role.ADMIN, employeeId: adminEmployee.id },
  });

  // ─── Remove legacy multi-employee demo rows (re-seed stays lean: admin + one employee) ───
  await prisma.employee.deleteMany({
    where: { workEmail: { in: [...LEGACY_SEED_EMPLOYEE_EMAILS] } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [...LEGACY_SEED_EMPLOYEE_EMAILS] } },
  });

  // ─── Single employee account (demo) ─────────────────────
  const employeeDefs = [
    {
      fullName: "Fazla Rabbi",
      jobTitle: "Software Engineer",
      department: "Technology",
      dateOfBirth: "1995-04-12",
      nationality: "Bangladeshi",
      personalEmail: "fazla.personal@example.com",
      workEmail: "fazla@uppearance.com",
      phone: "+971500000010",
      emiratesIdNumber: "784-900-100",
      emiratesIdExpiryDate: "2030-06-01",
      passportNumber: "P9001001",
      passportExpiryDate: "2031-03-15",
      joinMonthsAgo: 8,
      employmentType: EmploymentType.FULL_TIME,
      baseSalary: 12000,
      allowances: 1500,
      emergency: { name: "Emergency contact", relation: "Family", phone: "+971500000011" },
    },
  ];

  const employeeRecords: Array<{ id: string; fullName: string; userId: string; baseSalary: number; allowances: number }> = [];

  for (const e of employeeDefs) {
    const dateJoined = addMonths(now, -e.joinMonthsAgo);
    const probationEndDate = addMonths(dateJoined, 6);
    const probationStatus = now < probationEndDate ? ProbationStatus.ON_PROBATION : ProbationStatus.CONFIRMED;

    const employeePasswordHash = await bcrypt.hash("Employee123!", saltRounds);

    const employeeUser = await prisma.user.upsert({
      where: { email: e.workEmail },
      update: { passwordHash: employeePasswordHash, role: Role.EMPLOYEE },
      create: { email: e.workEmail, passwordHash: employeePasswordHash, role: Role.EMPLOYEE },
    });

    const employee = await prisma.employee.upsert({
      where: { workEmail: e.workEmail },
      update: {
        fullName: e.fullName,
        jobTitle: e.jobTitle,
        department: e.department,
        dateOfBirth: new Date(e.dateOfBirth),
        nationality: e.nationality,
        personalEmail: e.personalEmail,
        phone: e.phone,
        emiratesIdNumber: e.emiratesIdNumber,
        emiratesIdExpiryDate: new Date(e.emiratesIdExpiryDate),
        passportNumber: e.passportNumber,
        passportExpiryDate: new Date(e.passportExpiryDate),
        dateJoined,
        employmentType: e.employmentType,
        probationStatus,
        probationEndDate,
        notes: "Seeded for local testing.",
        compensation: {
          upsert: {
            update: { baseSalary: e.baseSalary, allowances: e.allowances },
            create: { baseSalary: e.baseSalary, allowances: e.allowances },
          },
        },
        bankAccount: {
          upsert: {
            update: { bankName: "Emirates NBD", accountHolderName: e.fullName, iban: "AE070331234567890123456", accountNumber: "1234567890" },
            create: { bankName: "Emirates NBD", accountHolderName: e.fullName, iban: "AE070331234567890123456", accountNumber: "1234567890" },
          },
        },
        emergencyContact: {
          upsert: {
            update: { ...e.emergency },
            create: { ...e.emergency },
          },
        },
      },
      create: {
        fullName: e.fullName,
        jobTitle: e.jobTitle,
        department: e.department,
        dateOfBirth: new Date(e.dateOfBirth),
        nationality: e.nationality,
        personalEmail: e.personalEmail,
        workEmail: e.workEmail,
        phone: e.phone,
        emiratesIdNumber: e.emiratesIdNumber,
        emiratesIdExpiryDate: new Date(e.emiratesIdExpiryDate),
        passportNumber: e.passportNumber,
        passportExpiryDate: new Date(e.passportExpiryDate),
        dateJoined,
        employmentType: e.employmentType,
        probationStatus,
        probationEndDate,
        notes: "Seeded for local testing.",
        compensation: { create: { baseSalary: e.baseSalary, allowances: e.allowances } },
        bankAccount: {
          create: { bankName: "Emirates NBD", accountHolderName: e.fullName, iban: "AE070331234567890123456", accountNumber: "1234567890" },
        },
        emergencyContact: { create: { ...e.emergency } },
      },
    });

    if (!employeeUser.employeeId) {
      await prisma.user.update({
        where: { id: employeeUser.id },
        data: { employeeId: employee.id },
      });
    }

    employeeRecords.push({
      id: employee.id,
      fullName: e.fullName,
      userId: employeeUser.id,
      baseSalary: e.baseSalary,
      allowances: e.allowances,
    });

    // Leave balance snapshot
    const nowAsOf = dateOnly(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const joinedMonths = monthsBetween(now, dateJoined);

    let paidAccruedDays = 0, paidAnnualDays = 0, carryOverDays = 0;
    if (probationStatus === ProbationStatus.ON_PROBATION) {
      paidAccruedDays = 0;
    } else if (joinedMonths < 12) {
      paidAccruedDays = Math.min(24, Math.max(0, joinedMonths - 6) * 2);
    } else {
      paidAnnualDays = 30;
      carryOverDays = e.joinMonthsAgo > 18 ? 6 : 3;
    }

    const paidUsedDays = e.joinMonthsAgo > 20 ? 12 : e.joinMonthsAgo > 10 ? 6 : 2;

    await prisma.leaveBalanceSnapshot.upsert({
      where: { employeeId_asOfDate: { employeeId: employee.id, asOfDate: nowAsOf } },
      update: { paidAccruedDays, paidAnnualDays, carryOverDays, paidUsedDays, emergencyUnpaidRemainingDays: 30, unpaidUsedDays: 0 },
      create: { employeeId: employee.id, asOfDate: nowAsOf, paidAccruedDays, paidAnnualDays, carryOverDays, paidUsedDays, emergencyUnpaidRemainingDays: 30, unpaidUsedDays: 0, breakdown: { seeded: true } },
    });

    // Salary history
    const hasHistory = await prisma.salaryHistory.findFirst({ where: { employeeId: employee.id } });
    if (!hasHistory) {
      await prisma.salaryHistory.create({
        data: {
          employeeId: employee.id,
          effectiveDate: dateJoined,
          oldBaseSalary: 0,
          newBaseSalary: e.baseSalary,
          oldAllowances: 0,
          newAllowances: e.allowances,
          reason: "Initial salary (seed)",
          changedByUserId: adminUser.id,
        },
      });
      if (e.joinMonthsAgo > 12) {
        const raiseDate = addMonths(dateJoined, 12);
        await prisma.salaryHistory.create({
          data: {
            employeeId: employee.id,
            effectiveDate: raiseDate,
            oldBaseSalary: e.baseSalary - 500,
            newBaseSalary: e.baseSalary,
            oldAllowances: e.allowances - 200,
            newAllowances: e.allowances,
            reason: "Annual performance review",
            changedByUserId: adminUser.id,
          },
        });
      }
    }
  }

  // ─── Admin Work Sessions ─────────────────────────────────
  for (let dayOffset = 14; dayOffset >= 1; dayOffset--) {
    const day = addDays(now, -dayOffset);
    const dow = day.getUTCDay();
    if (dow === 5 || dow === 6) continue;

    const existing = await prisma.workSession.findFirst({
      where: { employeeId: adminEmployee.id, clockInAt: { gte: setTime(day, 0, 0), lt: setTime(day, 23, 59) } },
    });
    if (existing) continue;

    const clockIn = setTime(day, 8, 30 + (dayOffset % 10));
    const clockOut = setTime(day, 17, 30 + (dayOffset % 15));

    const ws = await prisma.workSession.create({
      data: {
        employeeId: adminEmployee.id,
        clockInAt: clockIn,
        clockOutAt: clockOut,
        late: false,
        lateByMinutes: 0,
        workComment: "Administrative duties and team management",
      },
    });

    await prisma.lunchBreak.create({
      data: {
        workSessionId: ws.id,
        startAt: setTime(day, 12, 30),
        endAt: setTime(day, 13, 0),
        durationMinutes: 30,
      },
    });
  }

  // ─── Employee Work Sessions ─────────────────────────────
  const clockInVariations = [
    { h: 8, m: 55, late: false, lateBy: 0 },
    { h: 9, m: 2, late: false, lateBy: 0 },
    { h: 9, m: 8, late: true, lateBy: 3 },
    { h: 9, m: 15, late: true, lateBy: 10 },
    { h: 8, m: 45, late: false, lateBy: 0 },
    { h: 9, m: 0, late: false, lateBy: 0 },
    { h: 9, m: 20, late: true, lateBy: 15 },
  ];

  const comments = [
    "Sprint planning and ticket grooming",
    "Client deliverables and reporting",
    "Code review and bug fixes",
    "Team standup and documentation updates",
    "QA testing and deployment prep",
    "Financial reconciliation and invoicing",
    "Project milestone review",
  ];

  for (let dayOffset = 14; dayOffset >= 1; dayOffset--) {
    const day = addDays(now, -dayOffset);
    const dow = day.getUTCDay();
    if (dow === 5 || dow === 6) continue; // Skip Fri/Sat (UAE weekend)

    for (let ei = 0; ei < employeeRecords.length; ei++) {
      const emp = employeeRecords[ei];
      const variation = clockInVariations[(dayOffset + ei) % clockInVariations.length];
      const clockIn = setTime(day, variation.h, variation.m);
      const clockOut = setTime(day, 17 + (ei % 2), 0 + (ei * 5) % 30);

      const existing = await prisma.workSession.findFirst({
        where: { employeeId: emp.id, clockInAt: { gte: setTime(day, 0, 0), lt: setTime(day, 23, 59) } },
      });
      if (existing) continue;

      const ws = await prisma.workSession.create({
        data: {
          employeeId: emp.id,
          clockInAt: clockIn,
          clockOutAt: clockOut,
          late: variation.late,
          lateByMinutes: variation.lateBy,
          workComment: comments[(dayOffset + ei) % comments.length],
        },
      });

      await prisma.lunchBreak.create({
        data: {
          workSessionId: ws.id,
          startAt: setTime(day, 12, 30),
          endAt: setTime(day, 13, 0 + (ei * 3) % 15),
          durationMinutes: 30 + (ei * 3) % 15,
        },
      });
    }
  }

  // ─── Leave Requests ──────────────────────────────────────
  const leaveData: Array<{
    empIdx: number;
    type: LeaveType;
    startDaysAgo: number;
    endDaysAgo: number;
    status: LeaveStatus;
    reason: string;
  }> = [
    { empIdx: 0, type: LeaveType.ANNUAL, startDaysAgo: 30, endDaysAgo: 28, status: LeaveStatus.APPROVED, reason: "Annual leave" },
    { empIdx: 0, type: LeaveType.SICK, startDaysAgo: 10, endDaysAgo: 9, status: LeaveStatus.APPROVED, reason: "Medical appointment" },
    { empIdx: 0, type: LeaveType.ANNUAL, startDaysAgo: 5, endDaysAgo: 2, status: LeaveStatus.PENDING, reason: "Personal travel" },
    { empIdx: 0, type: LeaveType.ANNUAL, startDaysAgo: 60, endDaysAgo: 58, status: LeaveStatus.REJECTED, reason: "Short trip (team capacity)" },
  ];

  for (const lr of leaveData) {
    const emp = employeeRecords[lr.empIdx];
    const startDate = dateOnly(
      addDays(now, -lr.startDaysAgo).getUTCFullYear(),
      addDays(now, -lr.startDaysAgo).getUTCMonth() + 1,
      addDays(now, -lr.startDaysAgo).getUTCDate(),
    );
    const endDate = dateOnly(
      addDays(now, -lr.endDaysAgo).getUTCFullYear(),
      addDays(now, -lr.endDaysAgo).getUTCMonth() + 1,
      addDays(now, -lr.endDaysAgo).getUTCDate(),
    );

    const existing = await prisma.leaveRequest.findFirst({
      where: { employeeId: emp.id, startDate },
    });
    if (existing) continue;

    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        type: lr.type,
        startDate,
        endDate,
        reason: lr.reason,
        status: lr.status,
        adminComment: lr.status === LeaveStatus.REJECTED ? "Conflicted with project deadline" : lr.status === LeaveStatus.APPROVED ? "Approved" : undefined,
        decidedByUserId: lr.status !== LeaveStatus.PENDING ? adminUser.id : undefined,
        decidedAt: lr.status !== LeaveStatus.PENDING ? addDays(startDate, -1) : undefined,
      },
    });
  }

  // ─── Payroll Run ─────────────────────────────────────────
  const lastMonth = dateOnly(now.getUTCFullYear(), now.getUTCMonth(), 1); // first of current month = payroll for last month
  const payrollMonth = addMonths(lastMonth, -1);

  const existingRun = await prisma.payrollRun.findFirst({ where: { month: payrollMonth } });
  if (!existingRun) {
    const run = await prisma.payrollRun.create({
      data: {
        month: payrollMonth,
        status: "COMPLETED",
        generatedByUserId: adminUser.id,
      },
    });

    for (const emp of employeeRecords) {
      const deductions = Math.round(emp.baseSalary * 0.02 * 100) / 100;
      const netPay = emp.baseSalary + emp.allowances - deductions;
      const dailyRate = Math.round((emp.baseSalary / 30) * 100) / 100;

      await prisma.payslip.create({
        data: {
          employeeId: emp.id,
          month: payrollMonth,
          baseSalary: emp.baseSalary,
          allowances: emp.allowances,
          deductionsTotal: deductions,
          netPay,
          dailyRate,
          payrollRunId: run.id,
          lineItems: {
            base: emp.baseSalary,
            housing: emp.allowances * 0.6,
            transport: emp.allowances * 0.4,
            deductions: [{ kind: "UNPAID_LEAVE", amount: deductions }],
          },
        },
      });
    }
  }

  // ─── Documents ───────────────────────────────────────────
  const docDefs: Array<{
    empIdx: number;
    category: DocumentCategory;
    fileName: string;
    expiryDaysFromNow: number;
  }> = [
    { empIdx: 0, category: DocumentCategory.EMIRATES_ID, fileName: "fazla_eid.pdf", expiryDaysFromNow: 365 },
    { empIdx: 0, category: DocumentCategory.PASSPORT, fileName: "fazla_passport.pdf", expiryDaysFromNow: 730 },
    { empIdx: 0, category: DocumentCategory.EMPLOYMENT_CONTRACT, fileName: "fazla_contract.pdf", expiryDaysFromNow: 180 },
  ];

  for (const doc of docDefs) {
    const emp = employeeRecords[doc.empIdx];
    const existing = await prisma.document.findFirst({
      where: { employeeId: emp.id, originalFileName: doc.fileName },
    });
    if (existing) continue;

    await prisma.document.create({
      data: {
        employeeId: emp.id,
        category: doc.category,
        originalFileName: doc.fileName,
        mimeType: "application/pdf",
        sizeBytes: 50000 + Math.floor(Math.random() * 100000),
        storagePath: `/uploads/${doc.fileName}`,
        encrypted: true,
        checksum: "seed-checksum",
        expiryDate: addDays(now, doc.expiryDaysFromNow),
        uploadedByUserId: adminUser.id,
      },
    });
  }

  // ─── Notifications ───────────────────────────────────────
  const notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
  }> = [
    {
      userId: adminUser.id,
      type: NotificationType.LEAVE_APPROVAL_PENDING,
      title: "Leave request pending",
      body: "Fazla Rabbi has a pending annual leave request. Review and approve or reject.",
    },
    {
      userId: adminUser.id,
      type: NotificationType.DOCUMENT_EXPIRY_WARNING,
      title: "Document expiring soon",
      body: "Review Fazla Rabbi's employment contract in the documents list before renewal.",
    },
    {
      userId: adminUser.id,
      type: NotificationType.MESSAGE,
      title: "Payroll completed",
      body: `Payroll for ${payrollMonth.toISOString().slice(0, 7)} has been run successfully. ${employeeRecords.length} payslip(s) generated.`,
    },
  ];

  for (const emp of employeeRecords) {
    notifications.push({
      userId: emp.userId,
      type: NotificationType.LEAVE_DECISION,
      title: "Leave request updated",
      body: "Your leave request has been reviewed. Check your leave page for details.",
    });
  }

  for (const n of notifications) {
    const existing = await prisma.notification.findFirst({
      where: { userId: n.userId, title: n.title },
    });
    if (existing) continue;

    await prisma.notification.create({ data: n });
  }

  // ─── Site Settings ───────────────────────────────────────
  const defaultSettings: Record<string, any> = {
    company_name: "Uppearance",
    timezone: "Asia/Dubai",
    currency: "AED",
    workday_start: "09:00",
    late_grace_minutes: 5,
    smtp: { host: "localhost", port: 1025, username: "", password: "", tls: false },
    email_templates: mergeEmailTemplates(null),
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.siteSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@uppearance.com / Admin123!");
  console.log("Employee login: fazla@uppearance.com / Employee123!");
}

seed()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
