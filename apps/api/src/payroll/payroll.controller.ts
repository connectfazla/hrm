import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards, Query } from "@nestjs/common";
import { z } from "zod";
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
  @Get("runs")
  async listRuns() {
    return { runs: await this.payroll.listPayrollRuns() };
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("export")
  async exportCsvTop(@Query("month") month: string, @Res() res: Response) {
    const access = { role: Role.ADMIN, employeeId: null };
    const { csv, filename } = await this.payroll.exportPayrollCsv(access, month);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @UseGuards(AccessTokenGuard)
  @Get("employee/:employeeId/payslips")
  async listPayslips(
    @Param("employeeId") employeeId: string,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const access = { role: req.user?.role as Role, employeeId: req.user?.employeeId ?? null };
    const payslips = await this.payroll.listPayslips(access, employeeId);
    return res.json({ payslips });
  }

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

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(":payslipId/adjustment")
  async addAdjustment(
    @Param("payslipId") payslipId: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const schema = z.object({
      description: z.string().min(1),
      amount: z.number().positive(),
      isAddition: z.boolean(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid adjustment data" });

    const line = await this.payroll.addManualAdjustment(payslipId, parsed.data);
    return res.json({ adjustment: line });
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete("adjustment/:lineId")
  async removeAdjustment(@Param("lineId") lineId: string) {
    await this.payroll.removeAdjustment(lineId);
    return { ok: true };
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

}

