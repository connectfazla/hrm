import { BadRequestException, Body, Controller, Get, Post, Put, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { AccessTokenGuard } from "./guards/access-token.guard";
import { Role } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  companyName: z.string().min(2),
  password: z.string().min(8),
  registrationCode: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

type CookiesRequest = Request & { cookies?: Record<string, string> };
type RequestWithUser = Request & { user?: { userId: string; role: Role; employeeId?: string | null } };

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  personalEmail: z.string().email().optional().nullable(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    relation: z.string().min(1),
    phone: z.string().min(1),
  }).optional().nullable(),
});

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid registration request" });
    }

    const { fullName, email, companyName, password, registrationCode } = parsed.data;
    const result = await this.auth.register(fullName, email, companyName, password, registrationCode);

    this.setCookies(res, result.accessToken, result.refreshToken);

    return res.json({ user: result.user });
  }

  @Post("login")
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid login request" });
    }

    const { email, password } = parsed.data;
    const result = await this.auth.login(email, password);

    this.setCookies(res, result.accessToken, result.refreshToken);

    return res.json({ user: result.user });
  }

  @Post("refresh")
  async refresh(@Res({ passthrough: true }) res: Response): Promise<unknown> {
    const req = res.req as CookiesRequest;
    const refreshToken = req.cookies?.["refreshToken"];

    // 200 + user: null avoids noisy browser console errors on public pages (no session is normal).
    if (!refreshToken) {
      return res.status(200).json({ user: null });
    }

    try {
      const result = await this.auth.refresh(refreshToken);
      this.setCookies(res, result.accessToken, result.refreshToken);
      return res.json({ user: result.user });
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        this.clearSessionCookies(res);
        return res.status(200).json({ user: null });
      }
      throw e;
    }
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response): Promise<Response> {
    const req = res.req as CookiesRequest;
    const refreshToken = req.cookies?.["refreshToken"] ?? null;
    await this.auth.logout(refreshToken);

    this.clearSessionCookies(res);

    return res.json({ ok: true });
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: unknown): Promise<{ ok: true }> {
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: true };
    }

    await this.auth.forgotPassword(parsed.data.email);
    return { ok: true };
  }

  @Post("reset-password")
  async resetPassword(@Body() body: unknown): Promise<{ ok: true }> {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid reset request");
    }

    await this.auth.resetPassword(parsed.data.token, parsed.data.newPassword);
    return { ok: true };
  }

  @UseGuards(AccessTokenGuard)
  @Get("me")
  async me(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const profile = await this.auth.getProfile(userId);
    return res.json({ profile });
  }

  @UseGuards(AccessTokenGuard)
  @Put("profile")
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

    const updated = await this.auth.updateProfile(userId, parsed.data);
    return res.json({ profile: updated });
  }

  private clearSessionCookies(res: Response) {
    const secure = process.env.NODE_ENV === "production";
    const sameSite: boolean | "lax" | "strict" | "none" = "lax";
    res.clearCookie("accessToken", { path: "/", secure, sameSite });
    res.clearCookie("refreshToken", { path: "/api/v1/auth", secure, sameSite });
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const secure = process.env.NODE_ENV === "production";
    const sameSite: boolean | "lax" | "strict" | "none" = "lax";

    const accessTtlMs = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900) * 1000;
    const refreshTtlMs = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 1209600) * 1000;

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      maxAge: accessTtlMs,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: "/api/v1/auth",
      maxAge: refreshTtlMs,
    });
  }
}

