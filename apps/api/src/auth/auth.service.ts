import { Injectable, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: { userId: string; role: string; employeeId?: string | null };
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

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user) throw new UnauthorizedException("Invalid email or password");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid email or password");

    // Access token includes employeeId so RBAC/self-scoping can be enforced in controllers.
    const accessToken = this.signAccessToken(user);

    // Rotate refresh tokens on each login.
    const refreshToken = randomToken(48);
    const refreshTokenHash = sha256Hex(refreshToken);
    const now = new Date();

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

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user.id,
        role: user.role,
        employeeId: user.employeeId,
      },
    };
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    const refreshTokenHash = sha256Hex(refreshToken);
    const now = new Date();

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: refreshTokenHash, revokedAt: null },
      include: { user: { include: { employee: true } } },
    });

    if (!stored) throw new UnauthorizedException("Invalid refresh token");
    if (stored.expiresAt < now) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException("Refresh token expired");
    }

    const idleMs = now.getTime() - stored.lastActivityAt.getTime();
    if (idleMs > this.refreshIdleTtlMs) {
      // Inactivity -> revoke.
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException("Session expired due to inactivity");
    }

    // Rotate refresh token.
    const user = stored.user;
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
      user: { userId: user.id, role: user.role, employeeId: user.employeeId },
    };
  }

  async logout(refreshToken?: string | null): Promise<void> {
    if (!refreshToken) return;
    const refreshTokenHash = sha256Hex(refreshToken);
    const now = new Date();
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: refreshTokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Don't leak whether user exists.
    if (!user) return;

    const resetToken = randomToken(32);
    const resetTokenHash = sha256Hex(resetToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: resetTokenHash,
        expiresAt,
      },
    });

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

    const reset = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      include: { user: true },
    });

    if (!reset) throw new UnauthorizedException("Invalid or expired reset token");

    const passwordHash = await bcrypt.hash(newPassword, 10);

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

