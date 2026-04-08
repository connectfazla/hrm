import { Body, Controller, Post, Res } from "@nestjs/common";
import { z } from "zod";
import type { Response, Request } from "express";
import { AuthService } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  companyName: z.string().min(2),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  // No body needed; cookie-based refresh.
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

type CookiesRequest = Request & { cookies?: Record<string, string> };

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

    const { fullName, email, companyName, password } = parsed.data;
    const result = await this.auth.register(fullName, email, companyName, password);

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
  async refresh(@Res({ passthrough: true }) res: Response, @Body() body: unknown): Promise<unknown> {
    // Keep body parsing minimal; cookie is authoritative.
    const refreshParsed = refreshSchema.safeParse(body);
    if (!refreshParsed.success) {
      return res.status(400).json({ message: "Invalid refresh request" });
    }

    const req = res.req as CookiesRequest;
    const refreshToken = req.cookies?.["refreshToken"];

    if (!refreshToken) {
      return res.status(401).json({ message: "Missing refresh token" });
    }

    const result = await this.auth.refresh(refreshToken);
    this.setCookies(res, result.accessToken, result.refreshToken);

    return res.json({ user: result.user });
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response): Promise<Response> {
    const req = res.req as CookiesRequest;
    const refreshToken = req.cookies?.["refreshToken"] ?? null;
    await this.auth.logout(refreshToken);

    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/api/v1/auth" });

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
      throw new Error("Invalid reset request");
    }

    await this.auth.resetPassword(parsed.data.token, parsed.data.newPassword);
    return { ok: true };
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

