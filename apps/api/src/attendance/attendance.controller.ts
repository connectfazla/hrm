import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
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

type RequestWithUser = Request & { user?: { userId: string; role: Role; employeeId?: string | null } };

@Controller()
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @UseGuards(AccessTokenGuard)
  @Post("attendance/clock-in")
  async clockIn(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });
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
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = clockOutSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

    const updated = await this.attendance.clockOut(employeeId, parsed.data.comment, new Date());
    return res.json({ session: updated });
  }

  @UseGuards(AccessTokenGuard)
  @Post("attendance/lunch-start")
  async lunchStart(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });
    const lunch = await this.attendance.lunchStart(employeeId, new Date());
    return res.json({ lunch });
  }

  @UseGuards(AccessTokenGuard)
  @Post("attendance/lunch-end")
  async lunchEnd(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });
    const lunch = await this.attendance.lunchEnd(employeeId, new Date());
    return res.json({ lunch });
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
  @Get("reports/attendance")
  async attendanceReport(
    @Query("year") yearQ?: string,
    @Query("month") monthQ?: string,
  ) {
    const year = yearQ ? Number(yearQ) : new Date().getUTCFullYear();
    const month = monthQ ? Number(monthQ) : null;
    return this.attendance.adminLateReport(year, month);
  }
}

