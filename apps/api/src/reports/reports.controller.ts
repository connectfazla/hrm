import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("summary")
  async summary() {
    return this.reports.getSummary();
  }

  @Get("attendance")
  async attendance(
    @Query("year") yearQ?: string,
    @Query("month") monthQ?: string,
    @Query("department") department?: string,
  ) {
    const year = yearQ ? Number(yearQ) : new Date().getFullYear();
    const month = monthQ ? Number(monthQ) : null;
    return this.reports.getAttendanceReport(year, month, department);
  }
}
