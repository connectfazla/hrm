import { PrismaClient, Role, EmploymentType, ProbationStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  return d;
}

function monthsBetween(a: Date, b: Date) {
  // Rough "calendar months" difference for leave entitlement seeding purposes.
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

async function seed() {
  const now = new Date();
  const saltRounds = 10;

  // Default attendance configuration (admin configurable later).
  await prisma.attendanceConfig.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { workdayStartTime: new Date("2025-01-01T09:00:00.000Z"), lateGraceMinutes: 5 },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      workdayStartTime: new Date("2025-01-01T09:00:00.000Z"),
      lateGraceMinutes: 5,
    },
  });

  const adminEmail = "admin@uppearance.com";
  const adminPassword = "Admin123!"; // For local testing only.
  const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash, role: Role.ADMIN },
    create: { email: adminEmail, passwordHash: adminPasswordHash, role: Role.ADMIN },
  });

  // Work emails are used for employee login.
  const employees = [
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
      emiratesIdExpiryDate: "2026-12-05",
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

  for (const e of employees) {
    const dateJoined = addMonths(now, -e.joinMonthsAgo);
    const probationEndDate = addMonths(dateJoined, 6);
    const probationStatus =
      now < probationEndDate ? ProbationStatus.ON_PROBATION : ProbationStatus.CONFIRMED;

    const employeePassword = "Employee123!"; // For local testing only.
    const employeePasswordHash = await bcrypt.hash(employeePassword, saltRounds);

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
            update: {
              bankName: "Emirates NBD",
              accountHolderName: e.fullName,
              iban: "AE" + "1".repeat(18),
              accountNumber: "1234567890",
            },
            create: {
              bankName: "Emirates NBD",
              accountHolderName: e.fullName,
              iban: "AE" + "1".repeat(18),
              accountNumber: "1234567890",
            },
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
          create: {
            bankName: "Emirates NBD",
            accountHolderName: e.fullName,
            iban: "AE" + "1".repeat(18),
            accountNumber: "1234567890",
          },
        },
        emergencyContact: {
          create: { ...e.emergency },
        },
      },
    });

    // Link user -> employee (if not already linked).
    if (!employeeUser.employeeId) {
      await prisma.user.update({
        where: { id: employeeUser.id },
        data: { employeeId: employee.id },
      });
    }

    const nowAsOf = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const joinedMonths = monthsBetween(now, dateJoined);

    let paidAccruedDays = 0;
    let paidAnnualDays = 0;
    let carryOverDays = 0;

    if (probationStatus === ProbationStatus.ON_PROBATION) {
      paidAccruedDays = 0;
      paidAnnualDays = 0;
      carryOverDays = 0;
    } else if (joinedMonths < 12) {
      // Months 7-12: 2 days per month up to 24.
      const monthsInAccrualWindow = Math.max(0, joinedMonths - 6);
      paidAccruedDays = Math.min(24, monthsInAccrualWindow * 2);
      paidAnnualDays = 0;
      carryOverDays = e.joinMonthsAgo > 8 ? 2 : 0;
    } else {
      paidAnnualDays = 30;
      carryOverDays = e.joinMonthsAgo > 18 ? 6 : 3;
      paidAccruedDays = 0;
    }

    const paidUsedDays = e.joinMonthsAgo > 20 ? 12 : e.joinMonthsAgo > 10 ? 6 : 2;

    await prisma.leaveBalanceSnapshot.upsert({
      where: { employeeId_asOfDate: { employeeId: employee.id, asOfDate: nowAsOf } },
      update: {
        paidAccruedDays,
        paidAnnualDays,
        carryOverDays,
        paidUsedDays,
        emergencyUnpaidRemainingDays: 30,
        unpaidUsedDays: e.joinMonthsAgo < 6 ? 3 : 0,
        breakdown: {
          seeded: true,
          example: "Breakdown will be computed by leave rules later.",
        },
      },
      create: {
        employeeId: employee.id,
        asOfDate: nowAsOf,
        paidAccruedDays,
        paidAnnualDays,
        carryOverDays,
        paidUsedDays,
        emergencyUnpaidRemainingDays: 30,
        unpaidUsedDays: e.joinMonthsAgo < 6 ? 3 : 0,
        breakdown: { seeded: true },
      },
    });

    // Ensure an initial salary history entry exists for each employee.
    const hasHistory = await prisma.salaryHistory.findFirst({
      where: { employeeId: employee.id },
    });
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
    }
  }
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

