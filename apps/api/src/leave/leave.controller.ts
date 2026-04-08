import { Body, Controller, Get, Param, Post, Put, Req, Res, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { Response, Request } from "express";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { LeaveService } from "./leave.service";

const requestLeaveSchema = z.object({
  type: z.enum([
    "ANNUAL",
    "EMERGENCY_UNPAID",
    "SICK",
    "MATERNITY",
    "PATERNITY",
    "STUDY",
    "BEREAVEMENT_IMMEDIATE",
    "BEREAVEMENT_EXTENDED",
    "HAJJ",
  ]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(3),
});

const decisionSchema = z.object({
  comment: z.string().min(3),
});

type RequestWithUser = Request & {
  user?: { userId: string; role: Role; employeeId?: string | null };
};

@Controller("leave")
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @UseGuards(AccessTokenGuard)
  @Post("request")
  async requestLeave(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = requestLeaveSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid leave request" });

    const employeeId = req.user?.employeeId ?? null;
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });

    const result = await this.leave.requestLeave(employeeId, parsed.data);
    return res.json(result);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put("request/:id/approve")
  async approve(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

    const updated = await this.leave.decideLeave(id, req.user!.userId, parsed.data.comment, "APPROVED");
    return res.json({ leaveRequest: updated });
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put("request/:id/reject")
  async reject(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

    const updated = await this.leave.decideLeave(id, req.user!.userId, parsed.data.comment, "REJECTED");
    return res.json({ leaveRequest: updated });
  }

  @UseGuards(AccessTokenGuard)
  @Get("balances/:employeeId")
  async balances(
    @Req() req: RequestWithUser,
    @Param("employeeId") employeeId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const role = req.user!.role;
    const actorEmployeeId = req.user!.employeeId ?? null;

    const snapshot = await this.leave.getBalances(role, actorEmployeeId, employeeId);
    return res.json({ snapshot });
  }
}

