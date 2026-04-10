import { Injectable, NotFoundException } from "@nestjs/common";
import nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationType, Role } from "@prisma/client";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  private async email(to: string, subject: string, text: string) {
    const from = process.env.SMTP_FROM ?? "Uppearance HRMS <hrms@uppearance.local>";
    await this.mailer.sendMail({ from, to, subject, text });
  }

  async notifyAdminsLeavePending(args: {
    employeeId: string;
    leaveRequestId: string;
    type: string;
    startDate: string;
    endDate: string;
  }) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: args.employeeId },
      select: { fullName: true, workEmail: true },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true, email: true },
    });

    const notifications = admins.map((a) =>
      this.prisma.notification.create({
        data: {
          userId: a.id,
          type: NotificationType.LEAVE_APPROVAL_PENDING,
          title: "Leave request awaiting approval",
          body: `Employee ${employee?.fullName ?? args.employeeId} requested ${args.type} (${args.startDate} - ${args.endDate}).`,
          metadata: {
            employeeId: args.employeeId,
            leaveRequestId: args.leaveRequestId,
          },
        },
      }),
    );

    await Promise.all(notifications);

    const subject = "Uppearance HRMS - Leave request pending approval";
    const text =
      `Employee: ${employee?.fullName ?? args.employeeId}\n` +
      `Leave type: ${args.type}\n` +
      `Dates: ${args.startDate} to ${args.endDate}\n` +
      `Request ID: ${args.leaveRequestId}\n`;

    await Promise.all(
      admins
        .filter((a) => Boolean(a.email))
        .map((a) => this.email(a.email!, subject, text).catch(() => undefined)),
    );
  }

  async notifyEmployeeDecision(args: {
    employeeId: string;
    leaveRequestId: string;
    decision: "APPROVED" | "REJECTED";
    adminComment?: string | null;
    type: string;
    startDate: string;
    endDate: string;
  }) {
    const employeeUser = await this.prisma.user.findFirst({
      where: { employeeId: args.employeeId },
      select: { id: true, email: true },
    });

    if (!employeeUser) throw new NotFoundException("Employee user not found");

    const title =
      args.decision === "APPROVED" ? "Leave request approved" : "Leave request rejected";
    const body =
      args.decision === "APPROVED"
        ? `Your ${args.type} leave (${args.startDate} - ${args.endDate}) was approved.`
        : `Your ${args.type} leave (${args.startDate} - ${args.endDate}) was rejected.`;

    await this.prisma.notification.create({
      data: {
        userId: employeeUser.id,
        type: NotificationType.LEAVE_DECISION,
        title,
        body: args.adminComment ? `${body}\n\nComment: ${args.adminComment}` : body,
        metadata: {
          employeeId: args.employeeId,
          leaveRequestId: args.leaveRequestId,
          decision: args.decision,
        },
      },
    });

    // Email notifications for leave decisions.
    if (employeeUser.email) {
      const subject = `Uppearance HRMS - ${title}`;
      await this.email(
        employeeUser.email,
        subject,
        `${body}\n\n${args.adminComment ? `Comment: ${args.adminComment}\n` : ""}`,
      );
    }
  }

  async notifyAdminsDocumentExpiry(args: { actorUserId: string; documentCount: number; withinDays: number }) {
    // Create a single alert for the actor admin to avoid spamming on dashboard refresh.
    await this.prisma.notification.create({
      data: {
        userId: args.actorUserId,
        type: NotificationType.DOCUMENT_EXPIRY_WARNING,
        title: "Documents expiring soon",
        body: `${args.documentCount} document(s) are expiring within the next ${args.withinDays} day(s).`,
        metadata: {
          withinDays: args.withinDays,
          documentCount: args.documentCount,
        },
      },
    });
  }

  async notifyAdminsExcessiveLateness(args: {
    employeeId: string;
    lateCount: number;
    monthKey: string;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    await Promise.all(
      admins.map((a) =>
        this.prisma.notification.create({
          data: {
            userId: a.id,
            type: NotificationType.MESSAGE,
            title: "Excessive late arrivals",
            body: `Employee ${args.employeeId} has ${args.lateCount} late arrivals in ${args.monthKey}.`,
            metadata: { employeeId: args.employeeId, lateCount: args.lateCount, monthKey: args.monthKey },
          },
        }),
      ),
    );
  }
}

