import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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
}
