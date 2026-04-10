import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import type { Request } from "express";
import type { AuthUser } from "../types";
import crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

type RequestWithUser = Request & { user?: AuthUser };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const apiKey = this.getApiKey(request);

    if (apiKey) {
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const record = await this.prisma.apiKey.findFirst({
        where: {
          keyHash,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (!record) {
        throw new UnauthorizedException("Invalid API key");
      }

      await this.prisma.apiKey.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      });

      this.ensureApiPermission(request, record.permissions);

      request.user = {
        userId: record.createdById ?? "api-key",
        role: Role.ADMIN,
        employeeId: null,
        apiKeyId: record.id,
        apiPermissions: record.permissions,
      };
      return true;
    }

    const accessToken =
      (request.cookies && request.cookies["accessToken"]) ||
      this.getBearerToken(request.headers.authorization);

    if (!accessToken) {
      throw new UnauthorizedException("Missing access token");
    }

    const secret = process.env.JWT_ACCESS_SECRET ?? "";
    if (!secret) {
      throw new UnauthorizedException("Server misconfiguration");
    }

    try {
      const payload = jwt.verify(accessToken, secret) as jwt.JwtPayload & {
        sub?: string;
        role?: Role;
        employeeId?: string;
      };

      if (!payload.sub || !payload.role) {
        throw new UnauthorizedException("Invalid access token");
      }

      request.user = {
        userId: payload.sub,
        role: payload.role,
        employeeId: payload.employeeId ?? null,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  private getBearerToken(authHeader?: string) {
    if (!authHeader) return undefined;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : undefined;
  }

  private getApiKey(request: RequestWithUser) {
    const xApiKey = request.headers["x-api-key"];
    if (typeof xApiKey === "string" && xApiKey.trim()) return xApiKey.trim();
    if (Array.isArray(xApiKey) && xApiKey[0]) return xApiKey[0].trim();

    const auth = request.headers.authorization;
    if (!auth) return undefined;
    const match = auth.match(/^ApiKey\s+(.+)$/i);
    return match ? match[1].trim() : undefined;
  }

  private ensureApiPermission(request: RequestWithUser, perms: string[]) {
    const method = (request.method ?? "GET").toUpperCase();
    const p = request.path ?? "";

    if (!perms.includes("read")) {
      throw new ForbiddenException("API key missing read permission");
    }
    if (method !== "GET" && !perms.includes("write")) {
      throw new ForbiddenException("API key missing write permission");
    }
    if (p.includes("/payroll") && !perms.includes("payroll")) {
      throw new ForbiddenException("API key missing payroll permission");
    }
    if (p.includes("/attendance") && !perms.includes("attendance")) {
      throw new ForbiddenException("API key missing attendance permission");
    }
    if (p.includes("/leave") && !perms.includes("leave")) {
      throw new ForbiddenException("API key missing leave permission");
    }
  }
}

