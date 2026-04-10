import { BadRequestException, Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { SettingsService } from "./settings.service";

const ALLOWED_KEYS = ["company", "smtp", "emailTemplates", "branding"] as const;

const updateSettingSchema = z.object({
  value: z.record(z.unknown()),
});

const testSmtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  user: z.string().optional(),
  pass: z.string().optional(),
});

@Controller("settings")
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

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
}
