import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: { userId: string; role: string; employeeId?: string | null; email: string; fullName: string | null };
};

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

@Injectable()
export class AuthService {
  private readonly mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  async register(fullName: string, email: string, companyName: string, password: string): Promise<LoginResult> {
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const sixMonthsLater = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    try {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) throw new UnauthorizedException("Email already registered");

      const employee = await this.prisma.employee.create({
        data: {
          fullName,
          jobTitle: "Administrator",
          department: companyName,
          dateOfBirth: new Date("1990-01-01"),
          nationality: "UAE",
          phone: "+971500000000",
          emiratesIdNumber: "000-0000-0000000-0",
          emiratesIdExpiryDate: sixMonthsLater,
          passportNumber: "PENDING",
          passportExpiryDate: sixMonthsLater,
          dateJoined: now,
          employmentType: "FULL_TIME",
          probationStatus: "CONFIRMED",
          probationEndDate: now,
          workEmail: email,
          compensation: { create: { baseSalary: 0, allowances: 0 } },
        },
      });

      const user = await this.prisma.user.create({
        data: { email, passwordHash, role: "ADMIN", employeeId: employee.id },
      });

      const accessToken = this.signAccessToken(user);
      const refreshToken = randomToken(48);
      const refreshTokenHash = sha256Hex(refreshToken);

      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt: new Date(now.getTime() + this.refreshTtlMs),
          lastActivityAt: now,
        },
      });

      return {
        accessToken,
        refreshToken,
        user: { userId: user.id, role: user.role, employeeId: user.employeeId, email: user.email, fullName },
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw this.mapDbError(e);
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    let user: any;
    try {
      user = await this.prisma.user.findUnique({
        where: { email },
        include: { employee: true },
      });
    } catch (e) {
      throw this.mapDbError(e);
    }

    if (!user) throw new UnauthorizedException("Invalid email or password");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid email or password");

    // Access token includes employeeId so RBAC/self-scoping can be enforced in controllers.
    const accessToken = this.signAccessToken(user);

    // Rotate refresh tokens on each login.
    const refreshToken = randomToken(48);
    const refreshTokenHash = sha256Hex(refreshToken);
    const now = new Date();

    try {
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });

      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt: new Date(now.getTime() + this.refreshTtlMs),
          lastActivityAt: now,
        },
      });
    } catch (e) {
      throw this.mapDbError(e);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user.id,
        role: user.role,
        employeeId: user.employeeId,
        email: user.email,
        fullName: user.employee?.fullName ?? null,
      },
    };
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    const refreshTokenHash = sha256Hex(refreshToken);
    const now = new Date();

    let stored: any;
    try {
      stored = await this.prisma.refreshToken.findFirst({
        where: { tokenHash: refreshTokenHash, revokedAt: null },
        include: { user: { include: { employee: true } } },
      });
    } catch (e) {
      throw this.mapDbError(e);
    }

    if (!stored) throw new UnauthorizedException("Invalid refresh token");
    if (stored.expiresAt < now) {
      try {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: now },
        });
      } catch (e) {
        throw this.mapDbError(e);
      }
      throw new UnauthorizedException("Refresh token expired");
    }

    const idleMs = now.getTime() - stored.lastActivityAt.getTime();
    if (idleMs > this.refreshIdleTtlMs) {
      // Inactivity -> revoke.
      try {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: now },
        });
      } catch (e) {
        throw this.mapDbError(e);
      }
      throw new UnauthorizedException("Session expired due to inactivity");
    }

    // Rotate refresh token.
    const user = stored.user;
    try {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: now },
      });

      const newRefreshToken = randomToken(48);
      const newRefreshTokenHash = sha256Hex(newRefreshToken);

      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newRefreshTokenHash,
          expiresAt: new Date(now.getTime() + this.refreshTtlMs),
          lastActivityAt: now,
        },
      });

      return {
        accessToken: this.signAccessToken(user),
        refreshToken: newRefreshToken,
        user: { userId: user.id, role: user.role, employeeId: user.employeeId, email: user.email, fullName: user.employee?.fullName ?? null },
      };
    } catch (e) {
      throw this.mapDbError(e);
    }
  }

  async logout(refreshToken?: string | null): Promise<void> {
    if (!refreshToken) return;
    const refreshTokenHash = sha256Hex(refreshToken);
    const now = new Date();
    try {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: refreshTokenHash, revokedAt: null },
        data: { revokedAt: now },
      });
    } catch (e) {
      throw this.mapDbError(e);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    let user: any;
    try {
      user = await this.prisma.user.findUnique({ where: { email } });
    } catch (e) {
      throw this.mapDbError(e);
    }

    // Don't leak whether user exists.
    if (!user) return;

    const resetToken = randomToken(32);
    const resetTokenHash = sha256Hex(resetToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    try {
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: resetTokenHash,
          expiresAt,
        },
      });
    } catch (e) {
      throw this.mapDbError(e);
    }

    const resetUrl = `${process.env.APP_BASE_URL ?? "http://localhost:4000"}/reset-password?token=${encodeURIComponent(
      resetToken,
    )}`;

    await this.mailer.sendMail({
      from: process.env.SMTP_FROM ?? "Uppearance HRMS <hrms@upappearance.local>",
      to: user.email,
      subject: "Upappearance HRMS - Password reset",
      text:
        `Hello,\n\n` +
        `You requested a password reset. Use the link below within 15 minutes:\n\n` +
        `${resetUrl}\n\n` +
        `If you didn't request this, you can ignore this email.\n`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = sha256Hex(token);
    const now = new Date();

    let reset: any;
    try {
      reset = await this.prisma.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        include: { user: true },
      });
    } catch (e) {
      throw this.mapDbError(e);
    }

    if (!reset) throw new UnauthorizedException("Invalid or expired reset token");

    const passwordHash = await bcrypt.hash(newPassword, 10);

    try {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: reset.userId },
          data: { passwordHash },
        }),
        this.prisma.passwordResetToken.update({
          where: { id: reset.id },
          data: { usedAt: now },
        }),
        this.prisma.refreshToken.updateMany({
          where: { userId: reset.userId, revokedAt: null },
          data: { revokedAt: now },
        }),
      ]);
    } catch (e) {
      throw this.mapDbError(e);
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, role: true, employeeId: true,
        employee: {
          select: {
            fullName: true, jobTitle: true, department: true,
            dateOfBirth: true, nationality: true,
            personalEmail: true, workEmail: true, phone: true,
            dateJoined: true, employmentType: true,
            probationStatus: true, probationEndDate: true,
            emergencyContact: { select: { name: true, relation: true, phone: true } },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException("User not found");
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      fullName: user.employee?.fullName ?? null,
      employee: user.employee,
    };
  }

  async updateProfile(userId: string, data: { email?: string; currentPassword?: string; newPassword?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");

    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.newPassword) {
      if (!data.currentPassword) throw new UnauthorizedException("Current password required");
      const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!ok) throw new UnauthorizedException("Current password is incorrect");
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: updateData });
    }
    return this.getProfile(userId);
  }

  private signAccessToken(user: { id: string; role: string; employeeId?: string | null }) {
    const secret = process.env.JWT_ACCESS_SECRET ?? "";
    const ttlSeconds = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);

    if (!secret) throw new Error("JWT_ACCESS_SECRET is not configured");

    return jwt.sign(
      { role: user.role, employeeId: user.employeeId ?? null },
      secret,
      {
        subject: user.id,
        expiresIn: ttlSeconds,
      },
    );
  }

  private mapDbError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("Can't reach database server") ||
      msg.includes("Environment variable not found: DATABASE_URL")
    ) {
      return new ServiceUnavailableException("Database is not available. Start Postgres and run migrations/seed.");
    }
    return err instanceof Error ? err : new Error(msg);
  }

  private get prisma() {
    return this.prismaService;
  }

  constructor(private readonly prismaService: PrismaService) {}

  private get refreshTtlMs() {
    return Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 1209600) * 1000;
  }

  private get refreshIdleTtlMs() {
    return Number(process.env.SESSION_IDLE_TTL_SECONDS ?? 1800) * 1000;
  }
}

