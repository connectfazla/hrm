import { Controller, Get, Param, Post, Req, Res, UseGuards, Query } from "@nestjs/common";
import type { Response, Request } from "express";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { PayrollService } from "./payroll.service";

type RequestWithUser = Request & { user?: { userId: string; role: Role; employeeId?: string | null } };

@Controller("payroll")
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(":month/run")
  async run(
    @Param("month") month: string,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    const actorUserId = req.user?.userId;
    if (!actorUserId) return { message: "Unauthorized" };
    return this.payroll.runPayroll(month, actorUserId);
  }

  @UseGuards(AccessTokenGuard)
  @Get(":employeeId/:month")
  async getPayslip(
    @Param("employeeId") employeeId: string,
    @Param("month") month: string,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const access = { role: req.user?.role as Role, employeeId: req.user?.employeeId ?? null };
    const payslip = await this.payroll.getPayslip(access, employeeId, month);
    return res.json({ payslip });
  }

  @UseGuards(AccessTokenGuard)
  @Get(":employeeId/:month/payslip.pdf")
  async payslipPdf(
    @Param("employeeId") employeeId: string,
    @Param("month") month: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const access = { role: req.user?.role as Role, employeeId: req.user?.employeeId ?? null };
    const payslip = await this.payroll.getPayslip(access, employeeId, month);
    const { pdfBuffer, filename } = await this.payroll.renderPayslipPdf(payslip.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("export")
  async exportCsv(
    @Query("month") month: string,
    @Res() res: Response,
  ) {
    const access = { role: Role.ADMIN, employeeId: null };
    const { csv, filename } = await this.payroll.exportPayrollCsv(access, month);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    return res.send(csv);
  }
}

