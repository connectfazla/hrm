import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { EmploymentType, NotificationType, ProbationStatus, Role } from "@prisma/client";
import { SettingsService } from "./settings.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Request } from "express";

const ALLOWED_KEYS = [
  "company_name", "timezone", "currency", "workday_start", "late_grace_minutes",
  "smtp", "email_templates", "branding", "company_logo",
] as const;

const updateSettingSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown()), z.array(z.unknown())]),
});

const testSmtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  user: z.string().optional(),
  pass: z.string().optional(),
});

type ReqWithUser = Request & { user?: { userId: string; role: string } };

@Controller("settings")
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getAll() {
    return this.settings.getAll();
  }

  @Put(":key")
  async update(@Param("key") key: string, @Body() body: unknown) {
    if (!ALLOWED_KEYS.includes(key as any)) {
      throw new BadRequestException(`Invalid settings key: ${key}`);
    }
    const parsed = updateSettingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid settings value");
    const updated = await this.settings.set(key, parsed.data.value);
    return { setting: updated };
  }

  @Post("smtp/test")
  async testSmtp(@Body() body: unknown) {
    const parsed = testSmtpSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid SMTP test parameters");
    return this.settings.testSmtp(parsed.data);
  }

  @Get("api-keys")
  async listApiKeys() {
    const keys = await this.prisma.apiKey.findMany({
      where: { revokedAt: null },
      select: { id: true, name: true, keyPrefix: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return { keys };
  }

  @Post("api-keys")
  async createApiKey(@Body() body: unknown, @Req() req: ReqWithUser) {
    const schema = z.object({
      name: z.string().min(1).max(100),
      permissions: z.array(z.enum(["read", "write", "payroll", "attendance", "leave"])).min(1),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid API key parameters");

    const rawKey = `uppk_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: parsed.data.name,
        keyHash,
        keyPrefix,
        permissions: parsed.data.permissions,
        createdById: req.user!.userId,
      },
      select: { id: true, name: true, keyPrefix: true, permissions: true, createdAt: true },
    });

    return { key: apiKey, secret: rawKey };
  }

  @Delete("api-keys/:id")
  async revokeApiKey(@Param("id") id: string) {
    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { message: "API key revoked" };
  }

  @Post("demo-data/add")
  async addDemoData() {
    const DEMO_ADMIN_EMAIL = "demo.admin@uppearance.demo";
    const DEMO_EMP_EMAIL = "demo.employee@uppearance.demo";
    const DEMO_PASSWORD = "Demo123!";

    const existing = await this.prisma.user.findMany({
      where: { email: { in: [DEMO_ADMIN_EMAIL, DEMO_EMP_EMAIL] } },
      select: { email: true },
    });
    if (existing.length > 0) {
      return {
        ok: true,
        message: "Demo users already exist",
        demo: { adminEmail: DEMO_ADMIN_EMAIL, employeeEmail: DEMO_EMP_EMAIL, password: DEMO_PASSWORD },
      };
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const now = new Date();
    const dateOnly = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

    const [adminEmployee, employee] = await this.prisma.$transaction([
      this.prisma.employee.create({
        data: {
          fullName: "Demo Admin",
          jobTitle: "HR Manager (Demo)",
          department: "Human Resources",
          dateOfBirth: dateOnly(1990, 1, 1),
          nationality: "Emirati",
          personalEmail: "demo.admin.personal@example.com",
          workEmail: DEMO_ADMIN_EMAIL,
          phone: "+971500009001",
          emiratesIdNumber: "784-DEMO-ADMIN",
          emiratesIdExpiryDate: dateOnly(2030, 1, 1),
          passportNumber: "PDEMOADMIN",
          passportExpiryDate: dateOnly(2031, 1, 1),
          dateJoined: dateOnly(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
          employmentType: EmploymentType.FULL_TIME,
          probationStatus: ProbationStatus.CONFIRMED,
          probationEndDate: dateOnly(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
          notes: "Created via Settings → Demo Data.",
          compensation: { create: { baseSalary: 20000, allowances: 4000 } },
          bankAccount: {
            create: {
              bankName: "Emirates NBD",
              accountHolderName: "Demo Admin",
              iban: "AE070331234567890123456",
              accountNumber: "1234567890",
            },
          },
          emergencyContact: { create: { name: "Demo Contact", relation: "Friend", phone: "+971500009099" } },
        },
      }),
      this.prisma.employee.create({
        data: {
          fullName: "Demo Employee",
          jobTitle: "Operations Associate (Demo)",
          department: "Operations",
          dateOfBirth: dateOnly(1995, 6, 15),
          nationality: "Emirati",
          personalEmail: "demo.employee.personal@example.com",
          workEmail: DEMO_EMP_EMAIL,
          phone: "+971500009002",
          emiratesIdNumber: "784-DEMO-EMP",
          emiratesIdExpiryDate: dateOnly(2029, 6, 1),
          passportNumber: "PDEMOEMP",
          passportExpiryDate: dateOnly(2030, 6, 1),
          dateJoined: dateOnly(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
          employmentType: EmploymentType.FULL_TIME,
          probationStatus: ProbationStatus.ON_PROBATION,
          probationEndDate: dateOnly(now.getUTCFullYear(), now.getUTCMonth() + 7, 1),
          notes: "Created via Settings → Demo Data.",
          compensation: { create: { baseSalary: 6500, allowances: 750 } },
          bankAccount: {
            create: {
              bankName: "Dubai Islamic Bank",
              accountHolderName: "Demo Employee",
              iban: "AE070331234567890123457",
              accountNumber: "1234567891",
            },
          },
          emergencyContact: { create: { name: "Demo Contact", relation: "Sibling", phone: "+971500009098" } },
        },
      }),
    ]);

    const [adminUser, employeeUser] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: { email: DEMO_ADMIN_EMAIL, passwordHash, role: Role.ADMIN, employeeId: adminEmployee.id },
        select: { id: true, email: true },
      }),
      this.prisma.user.create({
        data: { email: DEMO_EMP_EMAIL, passwordHash, role: Role.EMPLOYEE, employeeId: employee.id },
        select: { id: true, email: true },
      }),
    ]);

    // Add a single unread notification so the red-dot indicator is visible.
    await this.prisma.notification.create({
      data: {
        userId: adminUser.id,
        type: NotificationType.MESSAGE,
        title: "Demo workspace ready",
        body: "Two demo accounts were created from Settings. You can safely delete them anytime.",
        metadata: { demo: true },
      },
    });

    return {
      ok: true,
      message: "Demo users created",
      demo: { adminEmail: DEMO_ADMIN_EMAIL, employeeEmail: DEMO_EMP_EMAIL, password: DEMO_PASSWORD },
    };
  }

  @Post("demo-data/delete")
  async deleteDemoData() {
    const DEMO_EMAILS = ["demo.admin@uppearance.demo", "demo.employee@uppearance.demo"];

    const users = await this.prisma.user.findMany({
      where: { email: { in: DEMO_EMAILS } },
      select: { id: true, email: true, employeeId: true },
    });

    const employeeIds = users.map((u) => u.employeeId).filter((x): x is string => Boolean(x));
    const userIds = users.map((u) => u.id);

    const result = await this.prisma.$transaction(async (tx) => {
      const employeesDeleted = employeeIds.length
        ? (await tx.employee.deleteMany({ where: { id: { in: employeeIds } } })).count
        : 0;
      const usersDeleted = userIds.length
        ? (await tx.user.deleteMany({ where: { id: { in: userIds } } })).count
        : 0;
      return { employeesDeleted, usersDeleted };
    });

    return { ok: true, ...result };
  }
}
