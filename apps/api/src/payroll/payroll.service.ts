import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  PayrollDeductionKind,
  Role,
} from "@prisma/client";
import PDFDocument from "pdfkit";
import { PrismaService } from "../prisma/prisma.service";

type AccessContext = { role: Role; employeeId: string | null };

function parseMonthParam(month: string) {
  // Expected format: YYYY-MM
  const [y, m] = month.split("-").map((x) => Number(x));
  if (!y || !m || m < 1 || m > 12) throw new BadRequestException("Invalid month format. Use YYYY-MM.");
  return new Date(Date.UTC(y, m - 1, 1));
}

function toCsvValue(v: any) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseDataUrlImage(dataUrl: string | null): Buffer | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async runPayroll(monthParam: string, adminUserId: string) {
    const month = parseMonthParam(monthParam);

    return this.prisma.$transaction(async (tx) => {
      const existingRun = await tx.payrollRun.findFirst({
        where: { month },
      });
      if (existingRun) {
        // Re-running should be possible after DRAFT; but for now treat as idempotent.
        return { payrollRun: existingRun, status: "ALREADY_EXISTS" };
      }

      const payrollRun = await tx.payrollRun.create({
        data: {
          month,
          status: "DRAFT",
          generatedByUserId: adminUserId,
        },
      });

      const employees = await tx.employee.findMany({
        include: { compensation: true },
        orderBy: { fullName: "asc" },
      });

      const deductions = await tx.leaveDeduction.findMany({
        where: { payrollMonth: month },
        include: { leaveRequest: { select: { employeeId: true, type: true } } },
      });

      const deductionsByEmployee = new Map<string, typeof deductions>();
      for (const d of deductions) {
        const empId = d.leaveRequest.employeeId;
        const arr = deductionsByEmployee.get(empId) ?? [];
        arr.push(d);
        deductionsByEmployee.set(empId, arr);
      }

      const payslips = [];

      for (const emp of employees) {
        const monthlySalary =
          Number(emp.compensation?.baseSalary ?? 0) + Number(emp.compensation?.allowances ?? 0);
        const dailyRate = monthlySalary / 30;
        const empDeds = deductionsByEmployee.get(emp.id) ?? [];
        const deductionsTotal = empDeds.reduce((sum, d) => sum + Number(d.deductionAmount), 0);
        const netPay = monthlySalary - deductionsTotal;

        const lineItems = {
          deductions: empDeds.map((d) => ({
            leaveRequestId: d.leaveRequestId,
            payrollMonth: d.payrollMonth,
            deductionAmount: Number(d.deductionAmount),
            details: d.details,
          })),
        };

        const payslip = await tx.payslip.create({
          data: {
            employeeId: emp.id,
            month,
            baseSalary: Number(emp.compensation?.baseSalary ?? 0),
            allowances: Number(emp.compensation?.allowances ?? 0),
            deductionsTotal: deductionsTotal,
            netPay,
            dailyRate,
            lineItems,
            payrollRunId: payrollRun.id,
          },
        });

        for (const d of empDeds) {
          await tx.payrollDeductionLine.create({
            data: {
              payslipId: payslip.id,
              kind: PayrollDeductionKind.OTHER,
              amount: Number(d.deductionAmount),
              referenceId: d.leaveRequestId,
              referenceType: "LeaveRequest",
              details: {
                leaveRequestType: d.leaveRequest.type,
                ...(d.details && typeof d.details === "object" ? (d.details as any) : {}),
              },
            },
          });
        }

        payslips.push(payslip);
      }

      await tx.payrollRun.update({
        where: { id: payrollRun.id },
        data: { status: "FINALIZED" },
      });

      return { payrollRun, payslipsCount: payslips.length };
    });
  }

  async getPayslip(access: AccessContext, employeeId: string, monthParam: string) {
    if (access.role !== Role.ADMIN && access.employeeId !== employeeId) {
      throw new ForbiddenException("Not allowed");
    }

    const month = parseMonthParam(monthParam);
    const payslip = await this.prisma.payslip.findUnique({
      where: { employeeId_month: { employeeId, month } },
      include: { deductionLines: true },
    });

    if (!payslip) throw new NotFoundException("Payslip not found (run payroll first)");
    return payslip;
  }

  async listPayslips(access: AccessContext, employeeId: string) {
    if (access.role !== Role.ADMIN && access.employeeId !== employeeId) {
      throw new ForbiddenException("Not allowed");
    }
    return this.prisma.payslip.findMany({
      where: { employeeId },
      orderBy: { month: "desc" },
      select: {
        id: true,
        month: true,
        baseSalary: true,
        allowances: true,
        deductionsTotal: true,
        netPay: true,
        dailyRate: true,
        generatedAt: true,
      },
    });
  }

  async listPayrollRuns() {
    return this.prisma.payrollRun.findMany({
      orderBy: { month: "desc" },
      include: { _count: { select: { payslips: true } } },
      take: 24,
    });
  }

  async exportPayrollCsv(access: AccessContext, monthParam: string) {
    if (access.role !== Role.ADMIN) throw new ForbiddenException("Admin only");

    const month = parseMonthParam(monthParam);
    const employees = await this.prisma.employee.findMany({ include: { compensation: true }, orderBy: { fullName: "asc" } });
    const payslips = await this.prisma.payslip.findMany({
      where: { month },
      select: { employeeId: true, baseSalary: true, allowances: true, deductionsTotal: true, netPay: true, dailyRate: true },
    });

    const payslipByEmp = new Map(payslips.map((p) => [p.employeeId, p]));

    const header = ["employeeId", "fullName", "baseSalary", "allowances", "deductionsTotal", "netPay", "dailyRate"];
    const rows = employees.map((e) => {
      const p = payslipByEmp.get(e.id);
      return [
        e.id,
        e.fullName,
        p ? Number(p.baseSalary) : Number(e.compensation?.baseSalary ?? 0),
        p ? Number(p.allowances) : Number(e.compensation?.allowances ?? 0),
        p ? Number(p.deductionsTotal) : 0,
        p ? Number(p.netPay) : 0,
        p ? Number(p.dailyRate) : 0,
      ];
    });

    const csv = [header.join(","), ...rows.map((r) => r.map(toCsvValue).join(","))].join("\n");
    const filename = `payroll-${monthParam}.csv`;

    return { csv, filename };
  }

  async addManualAdjustment(payslipId: string, data: { description: string; amount: number; isAddition: boolean }) {
    const payslip = await this.prisma.payslip.findUnique({ where: { id: payslipId } });
    if (!payslip) throw new NotFoundException("Payslip not found");

    const effectiveAmount = data.isAddition ? -Math.abs(data.amount) : Math.abs(data.amount);

    const line = await this.prisma.payrollDeductionLine.create({
      data: {
        payslipId,
        kind: PayrollDeductionKind.OTHER,
        amount: effectiveAmount,
        referenceType: "ManualAdjustment",
        details: { description: data.description, isAddition: data.isAddition },
      },
    });

    await this.recalcPayslipTotals(payslipId);
    return line;
  }

  async removeAdjustment(lineId: string) {
    const line = await this.prisma.payrollDeductionLine.findUnique({ where: { id: lineId } });
    if (!line) throw new NotFoundException("Adjustment not found");

    await this.prisma.payrollDeductionLine.delete({ where: { id: lineId } });
    await this.recalcPayslipTotals(line.payslipId);
  }

  private async recalcPayslipTotals(payslipId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { deductionLines: true },
    });
    if (!payslip) return;

    const deductionsTotal = payslip.deductionLines.reduce((sum, l) => sum + Number(l.amount), 0);
    const gross = Number(payslip.baseSalary) + Number(payslip.allowances);
    const netPay = gross - deductionsTotal;

    await this.prisma.payslip.update({
      where: { id: payslipId },
      data: { deductionsTotal, netPay },
    });
  }

  async renderPayslipPdf(payslipId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { employee: true, deductionLines: true },
    });
    if (!payslip) throw new NotFoundException("Payslip not found");

    const [companyNameSetting, companyLogoSetting] = await Promise.all([
      this.prisma.siteSettings.findUnique({ where: { key: "company_name" }, select: { value: true } }),
      this.prisma.siteSettings.findUnique({ where: { key: "company_logo" }, select: { value: true } }),
    ]);
    const companyName =
      typeof companyNameSetting?.value === "string" ? companyNameSetting.value : "Uppearance HRMS";
    const logoBuffer = parseDataUrlImage(
      typeof companyLogoSetting?.value === "string" ? companyLogoSetting.value : null,
    );

    const doc = new PDFDocument({ size: "A4", margin: 30 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const monthLabel = payslip.month.toISOString().slice(0, 7);
    const gross = Number(payslip.baseSalary) + Number(payslip.allowances);

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 30, 28, { fit: [56, 56], valign: "center" });
      } catch {
        // Ignore invalid logo payload and keep rendering.
      }
    }

    doc.fontSize(18).font("Helvetica-Bold").text(companyName, 95, 32);
    doc.fontSize(10).font("Helvetica").fillColor("#6b7280").text("Official Payslip", 95, 56);
    doc.fillColor("#111827");

    doc.roundedRect(30, 92, 535, 1, 0).fill("#e5e7eb");
    doc.fillColor("#111827");

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Employee", 30, 108);
    doc.font("Helvetica").text(payslip.employee.fullName, 30, 124);
    doc.font("Helvetica-Bold").text("Month", 300, 108);
    doc.font("Helvetica").text(monthLabel, 300, 124);
    doc.font("Helvetica-Bold").text("Generated", 430, 108);
    doc.font("Helvetica").text(new Date(payslip.generatedAt).toLocaleDateString("en-AE"), 430, 124);

    doc.roundedRect(30, 160, 535, 1, 0).fill("#e5e7eb");
    doc.fillColor("#111827");

    const summaryTop = 176;
    const colW = 125;
    const gap = 10;
    const cards = [
      { label: "Base Salary", value: Number(payslip.baseSalary) },
      { label: "Allowances", value: Number(payslip.allowances) },
      { label: "Deductions", value: Number(payslip.deductionsTotal) },
      { label: "Net Pay", value: Number(payslip.netPay) },
    ];
    cards.forEach((c, i) => {
      const x = 30 + i * (colW + gap);
      doc.roundedRect(x, summaryTop, colW, 66, 8).fill(i === 3 ? "#eff6ff" : "#f9fafb");
      doc.fillColor("#6b7280").font("Helvetica").fontSize(9).text(c.label, x + 10, summaryTop + 10);
      doc.fillColor(i === 3 ? "#1d4ed8" : "#111827").font("Helvetica-Bold").fontSize(12).text(
        `AED ${c.value.toFixed(2)}`,
        x + 10,
        summaryTop + 30,
      );
    });
    doc.fillColor("#111827");

    const tableTop = 268;
    doc.font("Helvetica-Bold").fontSize(11).text("Deductions & Adjustments", 30, tableTop);
    doc.fontSize(9).fillColor("#6b7280").text("Line item", 30, tableTop + 20);
    doc.text("Type", 360, tableTop + 20);
    doc.text("Amount (AED)", 455, tableTop + 20, { width: 110, align: "right" });
    doc.fillColor("#111827");
    doc.roundedRect(30, tableTop + 34, 535, 1, 0).fill("#e5e7eb");
    doc.fillColor("#111827");

    let y = tableTop + 44;
    if (payslip.deductionLines.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#6b7280").text("No deductions or manual adjustments.", 30, y);
      y += 24;
    } else {
      for (const line of payslip.deductionLines) {
        const details = (line.details ?? {}) as Record<string, unknown>;
        const description =
          typeof details.description === "string"
            ? details.description
            : typeof details.leaveRequestType === "string"
              ? `${details.leaveRequestType} leave`
              : "Payroll line item";
        const isAddition = details.isAddition === true || Number(line.amount) < 0;
        const amount = Number(line.amount);
        const displayAmount = isAddition ? Math.abs(amount) : amount;
        doc.font("Helvetica").fontSize(10).fillColor("#111827").text(description, 30, y, { width: 320 });
        doc.fontSize(9).fillColor("#6b7280").text(isAddition ? "Addition" : "Deduction", 360, y + 2);
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(isAddition ? "#047857" : "#b91c1c")
          .text(
            `${isAddition ? "+" : "-"} ${displayAmount.toFixed(2)}`,
            455,
            y,
            { width: 110, align: "right" },
          );
        doc.fillColor("#111827");
        y += 22;
      }
    }

    doc.roundedRect(30, Math.max(y + 10, 710), 535, 1, 0).fill("#e5e7eb");
    doc
      .fillColor("#6b7280")
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Gross: AED ${gross.toFixed(2)}    |    Net: AED ${Number(payslip.netPay).toFixed(2)}    |    Generated by Uppearance HRMS`,
        30,
        Math.max(y + 20, 720),
      );

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    return { pdfBuffer, filename: `payslip-${payslipId}.pdf` };
  }
}

