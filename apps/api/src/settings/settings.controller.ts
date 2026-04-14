import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import crypto from "node:crypto";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";
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
}
