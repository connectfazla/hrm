import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import { EmploymentType, ProbationStatus, Role } from "@prisma/client";
import type { RegisterRequestBody } from "./register-body.schema";
import { buildPasswordResetEmail } from "../mail/password-reset-email";
import { PrismaService } from "../prisma/prisma.service";

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    role: string;
    employeeId?: string | null;
    email: string;
    fullName: string | null;
    profilePhotoDocumentId?: string | null;
  };
};

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function registrationCodeMatches(expected: string, provided: string): boolean {
  const e = expected.trim();
  const p = provided.trim();
  if (e.length !== p.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(e, "utf8"), Buffer.from(p, "utf8"));
  } catch {
    return false;
  }
}

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
export class AuthService {
  private readonly mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  async register(body: RegisterRequestBody): Promise<LoginResult> {
    const now = new Date();
    const { registrationCode, password, ...employeeInput } = body;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const adminRegistrationCode = process.env.REGISTRATION_CODE_ADMIN ?? "darkk";
      const employeeRegistrationCode = process.env.REGISTRATION_CODE_EMPLOYEE ?? "upp";

      let role: Role;
      if (registrationCodeMatches(adminRegistrationCode, registrationCode)) {
        role = Role.ADMIN;
      } else if (registrationCodeMatches(employeeRegistrationCode, registrationCode)) {
        role = Role.EMPLOYEE;
      } else {
        throw new ForbiddenException("Invalid registration code.");
      }

      const existing = await this.prisma.user.findUnique({ where: { email: employeeInput.workEmail } });
      if (existing) throw new UnauthorizedException("Email already registered");

      const existingEmployee = await this.prisma.employee.findUnique({
        where: { workEmail: employeeInput.workEmail },
      });
      if (existingEmployee) throw new UnauthorizedException("Work email already registered");

      const dateJoined = new Date(employeeInput.dateJoined);
      const { probationEndDate, status } = calcProbationStatus(now, dateJoined);

      const user = await this.prisma.$transaction(async (tx) => {
        const employee = await tx.employee.create({
          data: {
            fullName: employeeInput.fullName,
            jobTitle: employeeInput.jobTitle,
            department: employeeInput.department,
            dateOfBirth: new Date(employeeInput.dateOfBirth),
            nationality: employeeInput.nationality,
            personalEmail: employeeInput.personalEmail ?? null,
            workEmail: employeeInput.workEmail,
            phone: employeeInput.phone,
            emiratesIdNumber: employeeInput.emiratesIdNumber,
            emiratesIdExpiryDate: new Date(employeeInput.emiratesIdExpiryDate),
            passportNumber: employeeInput.passportNumber,
            passportExpiryDate: new Date(employeeInput.passportExpiryDate),
            dateJoined,
            employmentType: employeeInput.employmentType as EmploymentType,
            probationStatus: status,
            probationEndDate,
            notes: employeeInput.notes ?? null,
            compensation: {
              create: {
                baseSalary: employeeInput.baseSalary,
                allowances: employeeInput.allowances,
              },
            },
            bankAccount: {
              create: {
                bankName: employeeInput.bankAccount.bankName,
                accountHolderName: employeeInput.bankAccount.accountHolderName,
                iban: employeeInput.bankAccount.iban ?? null,
                accountNumber: employeeInput.bankAccount.accountNumber ?? null,
              },
            },
            emergencyContact: {
              create: {
                name: employeeInput.emergencyContact.name,
                relation: employeeInput.emergencyContact.relation,
                phone: employeeInput.emergencyContact.phone,
              },
            },
            salaryHistory: {
              create: {
                effectiveDate: dateJoined,
                oldBaseSalary: 0,
                newBaseSalary: employeeInput.baseSalary,
                oldAllowances: 0,
                newAllowances: employeeInput.allowances,
                reason: "Self-registration",
                changedByUserId: null,
              },
            },
          },
        });

        const createdUser = await tx.user.create({
          data: {
            email: employeeInput.workEmail,
            passwordHash,
            role,
            employeeId: employee.id,
          },
        });

        return createdUser;
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
        user: {
          userId: user.id,
          role: user.role,
          employeeId: user.employeeId,
          email: user.email,
          fullName: employeeInput.fullName,
        },
      };
    } catch (e) {
      if (e instanceof UnauthorizedException || e instanceof ForbiddenException) throw e;
      throw this.mapDbError(e);
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    let user: any;
    try {
      user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          employee: {
            include: {
              documents: {
                where: { category: "PROFILE_PHOTO", deletedAt: null },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });
    } catch (e) {
      throw this.mapDbError(e);
    }

    if (!user) throw new UnauthorizedException("Invalid email or password");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid email or password");

    if (user.employee?.archivedAt) {
      throw new UnauthorizedException("This account has been archived. Contact HR if you need access.");
    }

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
        profilePhotoDocumentId: user.employee?.documents?.[0]?.id ?? null,
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
        include: {
          user: {
            include: {
              employee: {
                include: {
                  documents: {
                    where: { category: "PROFILE_PHOTO", deletedAt: null },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
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

    const user = stored.user;
    if (user.employee?.archivedAt) {
      try {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: now },
        });
      } catch (e) {
        throw this.mapDbError(e);
      }
      throw new UnauthorizedException("This account has been archived.");
    }

    // Rotate refresh token.
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
        user: {
          userId: user.id,
          role: user.role,
          employeeId: user.employeeId,
          email: user.email,
          fullName: user.employee?.fullName ?? null,
          profilePhotoDocumentId: user.employee?.documents?.[0]?.id ?? null,
        },
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

    const appBase =
      process.env.APP_BASE_URL ?? process.env.WEB_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appBase.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const expiresMinutes = 15;
    const { subject, text } = buildPasswordResetEmail({ resetUrl, expiresMinutes });

    await this.mailer.sendMail({
      from: process.env.SMTP_FROM ?? "Uppearance HRMS <hrms@uppearance.local>",
      to: user.email,
      subject,
      text,
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
            documents: {
              where: { category: "PROFILE_PHOTO", deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true },
            },
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
      profilePhotoDocumentId: user.employee?.documents?.[0]?.id ?? null,
      employee: user.employee,
    };
  }

  async updateProfile(userId: string, data: {
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    fullName?: string;
    phone?: string;
    personalEmail?: string | null;
    nationality?: string;
    dateOfBirth?: string;
    emergencyContact?: { name: string; relation: string; phone: string } | null;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");

    const userUpdate: any = {};
    if (data.email) userUpdate.email = data.email;
    if (data.newPassword) {
      if (!data.currentPassword) throw new UnauthorizedException("Current password required");
      const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!ok) throw new UnauthorizedException("Current password is incorrect");
      userUpdate.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    if (Object.keys(userUpdate).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: userUpdate });
    }

    if (user.employeeId) {
      const empUpdate: any = {};
      if (data.fullName) empUpdate.fullName = data.fullName;
      if (data.phone) empUpdate.phone = data.phone;
      if (data.personalEmail !== undefined) empUpdate.personalEmail = data.personalEmail;
      if (data.nationality) empUpdate.nationality = data.nationality;
      if (data.dateOfBirth) empUpdate.dateOfBirth = new Date(data.dateOfBirth);

      if (Object.keys(empUpdate).length > 0) {
        await this.prisma.employee.update({ where: { id: user.employeeId }, data: empUpdate });
      }

      if (data.emergencyContact !== undefined) {
        if (data.emergencyContact) {
          await this.prisma.emergencyContact.upsert({
            where: { employeeId: user.employeeId },
            create: { employeeId: user.employeeId, ...data.emergencyContact },
            update: data.emergencyContact,
          });
        } else {
          await this.prisma.emergencyContact.deleteMany({ where: { employeeId: user.employeeId } });
        }
      }
    }

    return this.getProfile(userId);
  }

  private signAccessToken(user: { id: string; role: string; employeeId?: string | null }) {
    const secret = process.env.JWT_ACCESS_SECRET ?? "";
    const ttlSeconds = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);

    if (!secret) throw new UnauthorizedException("JWT_ACCESS_SECRET is not configured");

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

