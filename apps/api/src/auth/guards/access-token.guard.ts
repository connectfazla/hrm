import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import type { Request } from "express";
import type { AuthUser } from "../types";

type RequestWithUser = Request & { user?: AuthUser };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

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
}

