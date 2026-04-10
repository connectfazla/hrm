import { Body, Controller, Get, Param, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { Response, Request } from "express";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { AttendanceService } from "./attendance.service";

const clockOutSchema = z.object({
  comment: z.string().min(5),
});

const updateSessionSchema = z.object({
  clockInAt: z.string().datetime(),
  clockOutAt: z.string().datetime().nullable().optional(),
  workComment: z.string().max(500).nullable().optional(),
});

type RequestWithUser = Request & { user?: { userId: string; role: Role; employeeId?: string | null } };

@Controller()
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @UseGuards(AccessTokenGuard)
  @Post("attendance/clock-in")
  async clockIn(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(403).json({ message: "No employee profile linked to your account. Please log out and log back in." });
    const session = await this.attendance.clockIn(employeeId, new Date());
    return res.json({ session });
  }

  @UseGuards(AccessTokenGuard)
  @Post("attendance/clock-out")
  async clockOut(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(403).json({ message: "No employee profile linked to your account. Please log out and log back in." });

    const parsed = clockOutSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

    const updated = await this.attendance.clockOut(employeeId, parsed.data.comment, new Date());
    return res.json({ session: updated });
  }

  @UseGuards(AccessTokenGuard)
  @Post("attendance/lunch-start")
  async lunchStart(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(403).json({ message: "No employee profile linked to your account. Please log out and log back in." });
    const lunch = await this.attendance.lunchStart(employeeId, new Date());
    return res.json({ lunch });
  }

  @UseGuards(AccessTokenGuard)
  @Post("attendance/lunch-end")
  async lunchEnd(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(403).json({ message: "No employee profile linked to your account. Please log out and log back in." });
    const lunch = await this.attendance.lunchEnd(employeeId, new Date());
    return res.json({ lunch });
  }

  @UseGuards(AccessTokenGuard)
  @Get("attendance/:employeeId/sessions")
  async sessions(
    @Req() req: RequestWithUser,
    @Param("employeeId") employeeId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limitQ?: string,
  ) {
    const role = req.user?.role!;
    const access = { role, employeeId: req.user?.employeeId ?? null };
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const limit = limitQ ? Math.min(Number(limitQ), 500) : 100;
    return this.attendance.getSessions(access, employeeId, fromDate, toDate, limit);
  }

  @UseGuards(AccessTokenGuard)
  @Get("attendance/:employeeId")
  async timesheet(
    @Req() req: RequestWithUser,
    @Param("employeeId") employeeId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("period") period?: "daily" | "weekly" | "monthly",
  ) {
    const role = req.user?.role!;
    const access = { role, employeeId: req.user?.employeeId ?? null };

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const safePeriod = period ?? "daily";

    return this.attendance.getTimesheet(access, employeeId, fromDate, toDate, safePeriod);
  }

  @UseGuards(AccessTokenGuard)
  @Get("attendance/:employeeId/export")
  async exportTimesheet(
    @Req() req: RequestWithUser,
    @Param("employeeId") employeeId: string,
    @Res() res: Response,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("period") period?: "daily" | "weekly" | "monthly",
    @Query("format") format?: "csv" | "pdf",
  ) {
    const role = req.user?.role!;
    const access = { role, employeeId: req.user?.employeeId ?? null };

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const safePeriod = period ?? "daily";
    const safeFormat = format ?? "csv";

    if (safeFormat === "pdf") {
      const { pdfBuffer, filename } = await this.attendance.exportTimesheetPdf(
        access,
        employeeId,
        fromDate,
        toDate,
        safePeriod,
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    }

    const { csv, filename } = await this.attendance.exportTimesheetCsv(
      access,
      employeeId,
      fromDate,
      toDate,
      safePeriod,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put("attendance/session/:sessionId")
  async updateSession(
    @Param("sessionId") sessionId: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = updateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid session payload" });
    }

    const session = await this.attendance.updateSessionAdmin(sessionId, {
      clockInAt: new Date(parsed.data.clockInAt),
      clockOutAt: parsed.data.clockOutAt ? new Date(parsed.data.clockOutAt) : null,
      workComment: parsed.data.workComment ?? null,
    });
    return res.json({ session });
  }

}

