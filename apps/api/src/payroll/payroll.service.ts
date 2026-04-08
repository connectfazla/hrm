import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
  if (!y || !m || m < 1 || m > 12) throw new Error("Invalid month");
  return new Date(Date.UTC(y, m - 1, 1));
}

function toCsvValue(v: any) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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

  async renderPayslipPdf(payslipId: string) {
    // Minimal PDF generation: plain text summary.
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { employee: true, deductionLines: true },
    });
    if (!payslip) throw new NotFoundException("Payslip not found");

    const doc = new PDFDocument({ size: "A4", margin: 30 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(16).text("Upappearance HRMS - Payslip", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text(`Employee: ${payslip.employee.fullName}`);
    doc.text(`Month: ${payslip.month.toISOString().slice(0, 7)}`);
    doc.moveDown();
    doc.text(`Base Salary: AED ${Number(payslip.baseSalary).toFixed(2)}`);
    doc.text(`Allowances: AED ${Number(payslip.allowances).toFixed(2)}`);
    doc.text(`Deductions: AED ${Number(payslip.deductionsTotal).toFixed(2)}`);
    doc.fontSize(12).text(`Net Pay: AED ${Number(payslip.netPay).toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(10).text("Deduction lines:");
    for (const line of payslip.deductionLines) {
      doc.text(`- ${line.kind}: AED ${Number(line.amount).toFixed(2)}`);
    }

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    return { pdfBuffer, filename: `payslip-${payslipId}.pdf` };
  }
}

