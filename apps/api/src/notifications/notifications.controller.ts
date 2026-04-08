import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import type { Response, Request } from "express";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { NotificationsService } from "./notifications.service";
import { z } from "zod";
import { Role } from "@prisma/client";

type RequestWithUser = Request & { user?: { userId: string; role: Role; employeeId?: string | null } };

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @UseGuards(AccessTokenGuard)
  @Get()
  async list(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const userId = req.user?.userId;
    const items = await this.notifications.listForUser(userId!);
    return res.json({ notifications: items });
  }
}

