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

const prisma = new PrismaClient();

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

  // ─── Employees ───────────────────────────────────────────
  const employeeDefs = [
    {
      fullName: "Aisha Al Mansoori",
      jobTitle: "HR Coordinator",
      department: "Human Resources",
      dateOfBirth: "1994-05-10",
      nationality: "Emirati",
      personalEmail: "aisha.personal@example.com",
      workEmail: "aisha@uppearance.com",
      phone: "+971500000001",
      emiratesIdNumber: "784-123-567",
      emiratesIdExpiryDate: "2030-04-01",
      passportNumber: "P1234567",
      passportExpiryDate: "2030-12-10",
      joinMonthsAgo: 4,
      employmentType: EmploymentType.FULL_TIME,
      baseSalary: 6000,
      allowances: 500,
      emergency: { name: "Hassan Al Mansoori", relation: "Spouse", phone: "+971500000101" },
    },
    {
      fullName: "Khalid Saeed",
      jobTitle: "Operations Specialist",
      department: "Operations",
      dateOfBirth: "1989-11-22",
      nationality: "Emirati",
      personalEmail: "khalid.personal@example.com",
      workEmail: "khalid@uppearance.com",
      phone: "+971500000002",
      emiratesIdNumber: "784-888-990",
      emiratesIdExpiryDate: "2027-08-15",
      passportNumber: "P2345678",
      passportExpiryDate: "2028-02-02",
      joinMonthsAgo: 8,
      employmentType: EmploymentType.FULL_TIME,
      baseSalary: 7000,
      allowances: 800,
      emergency: { name: "Maryam Saeed", relation: "Mother", phone: "+971500000202" },
    },
    {
      fullName: "Lina Karim",
      jobTitle: "Software QA (Contract)",
      department: "Technology",
      dateOfBirth: "1992-02-18",
      nationality: "Jordanian",
      personalEmail: "lina.personal@example.com",
      workEmail: "lina@uppearance.com",
      phone: "+971500000003",
      emiratesIdNumber: "887-321-990",
      emiratesIdExpiryDate: "2029-09-30",
      passportNumber: "P3456789",
      passportExpiryDate: "2031-05-20",
      joinMonthsAgo: 14,
      employmentType: EmploymentType.CONTRACT,
      baseSalary: 7500,
      allowances: 300,
      emergency: { name: "Yousef Karim", relation: "Father", phone: "+971500000303" },
    },
    {
      fullName: "Noor Al Qasimi",
      jobTitle: "Account Coordinator",
      department: "Finance",
      dateOfBirth: "1996-08-01",
      nationality: "Emirati",
      personalEmail: "noor.personal@example.com",
      workEmail: "noor@uppearance.com",
      phone: "+971500000004",
      emiratesIdNumber: "784-555-111",
      emiratesIdExpiryDate: "2026-06-15",
      passportNumber: "P4567890",
      passportExpiryDate: "2027-03-25",
      joinMonthsAgo: 10,
      employmentType: EmploymentType.PART_TIME,
      baseSalary: 4500,
      allowances: 200,
      emergency: { name: "Omar Al Qasimi", relation: "Brother", phone: "+971500000404" },
    },
    {
      fullName: "Samir Patel",
      jobTitle: "Project Coordinator",
      department: "Projects",
      dateOfBirth: "1990-01-30",
      nationality: "Indian",
      personalEmail: "samir.personal@example.com",
      workEmail: "samir@uppearance.com",
      phone: "+971500000005",
      emiratesIdNumber: "992-111-222",
      emiratesIdExpiryDate: "2028-01-12",
      passportNumber: "P5678901",
      passportExpiryDate: "2029-07-14",
      joinMonthsAgo: 24,
      employmentType: EmploymentType.FULL_TIME,
      baseSalary: 8200,
      allowances: 1000,
      emergency: { name: "Rita Patel", relation: "Spouse", phone: "+971500000505" },
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

  // ─── Attendance / Work Sessions ──────────────────────────
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
    { empIdx: 0, type: LeaveType.ANNUAL, startDaysAgo: 30, endDaysAgo: 28, status: LeaveStatus.APPROVED, reason: "Family visit to Abu Dhabi" },
    { empIdx: 1, type: LeaveType.SICK, startDaysAgo: 10, endDaysAgo: 9, status: LeaveStatus.APPROVED, reason: "Doctor appointment and rest day" },
    { empIdx: 2, type: LeaveType.ANNUAL, startDaysAgo: 5, endDaysAgo: 2, status: LeaveStatus.PENDING, reason: "Personal travel to Amman" },
    { empIdx: 3, type: LeaveType.EMERGENCY_UNPAID, startDaysAgo: 20, endDaysAgo: 19, status: LeaveStatus.APPROVED, reason: "Family emergency" },
    { empIdx: 4, type: LeaveType.ANNUAL, startDaysAgo: 45, endDaysAgo: 40, status: LeaveStatus.APPROVED, reason: "Annual vacation to India" },
    { empIdx: 4, type: LeaveType.STUDY, startDaysAgo: 3, endDaysAgo: 3, status: LeaveStatus.PENDING, reason: "PMP certification exam" },
    { empIdx: 1, type: LeaveType.ANNUAL, startDaysAgo: 60, endDaysAgo: 58, status: LeaveStatus.REJECTED, reason: "Short trip (conflicted with deadline)" },
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
    { empIdx: 0, category: DocumentCategory.EMIRATES_ID, fileName: "aisha_eid.pdf", expiryDaysFromNow: 365 },
    { empIdx: 0, category: DocumentCategory.PASSPORT, fileName: "aisha_passport.pdf", expiryDaysFromNow: 730 },
    { empIdx: 1, category: DocumentCategory.EMIRATES_ID, fileName: "khalid_eid.pdf", expiryDaysFromNow: 180 },
    { empIdx: 1, category: DocumentCategory.VISA, fileName: "khalid_visa.pdf", expiryDaysFromNow: 45 },
    { empIdx: 2, category: DocumentCategory.PASSPORT, fileName: "lina_passport.pdf", expiryDaysFromNow: 900 },
    { empIdx: 2, category: DocumentCategory.EMPLOYMENT_CONTRACT, fileName: "lina_contract.pdf", expiryDaysFromNow: 60 },
    { empIdx: 3, category: DocumentCategory.EMIRATES_ID, fileName: "noor_eid.pdf", expiryDaysFromNow: 30 },
    { empIdx: 3, category: DocumentCategory.PASSPORT, fileName: "noor_passport.pdf", expiryDaysFromNow: 200 },
    { empIdx: 4, category: DocumentCategory.EMIRATES_ID, fileName: "samir_eid.pdf", expiryDaysFromNow: 400 },
    { empIdx: 4, category: DocumentCategory.PROFESSIONAL_CERTIFICATE, fileName: "samir_pmp.pdf", expiryDaysFromNow: 15 },
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
      body: "Lina Karim has requested 4 days of annual leave. Review and approve or reject.",
    },
    {
      userId: adminUser.id,
      type: NotificationType.DOCUMENT_EXPIRY_WARNING,
      title: "Document expiring soon",
      body: "Samir Patel's PMP certificate expires in 15 days. Please request an updated copy.",
    },
    {
      userId: adminUser.id,
      type: NotificationType.DOCUMENT_EXPIRY_WARNING,
      title: "Document expiring soon",
      body: "Noor Al Qasimi's Emirates ID expires in 30 days.",
    },
    {
      userId: adminUser.id,
      type: NotificationType.LEAVE_APPROVAL_PENDING,
      title: "Leave request pending",
      body: "Samir Patel requested 1 day of study leave for PMP exam.",
    },
    {
      userId: adminUser.id,
      type: NotificationType.MESSAGE,
      title: "Payroll completed",
      body: `Payroll for ${payrollMonth.toISOString().slice(0, 7)} has been run successfully. ${employeeRecords.length} payslips generated.`,
    },
  ];

  for (const emp of employeeRecords.slice(0, 3)) {
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

  console.log("Seed complete.");
  console.log("Admin login: admin@uppearance.com / Admin123!");
  console.log("Employee login: [name]@uppearance.com / Employee123!");
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
