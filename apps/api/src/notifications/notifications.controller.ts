import { Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
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

  @UseGuards(AccessTokenGuard)
  @Get("unread-count")
  async unreadCount(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const userId = req.user?.userId;
    const count = await this.notifications.unreadCountForUser(userId!);
    return res.json({ unread: count });
  }

  @UseGuards(AccessTokenGuard)
  @Post("mark-all-read")
  async markAllRead(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const userId = req.user?.userId;
    const updated = await this.notifications.markAllRead(userId!, new Date());
    return res.json(updated);
  }
}

