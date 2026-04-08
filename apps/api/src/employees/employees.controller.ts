import { Body, Controller, Get, Param, Post, Put, Req, Res, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { Response, Request } from "express";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { EmployeesService } from "./employees.service";

const createEmployeeSchema = z.object({
  fullName: z.string().min(1),
  jobTitle: z.string().min(1),
  department: z.string().min(1),
  dateOfBirth: z.string().min(1),
  nationality: z.string().min(1),
  personalEmail: z.string().email().optional().nullable(),
  workEmail: z.string().email(),
  phone: z.string().min(5),
  emiratesIdNumber: z.string().min(1),
  emiratesIdExpiryDate: z.string().min(1),
  passportNumber: z.string().min(1),
  passportExpiryDate: z.string().min(1),
  dateJoined: z.string().min(1),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
  notes: z.string().optional().nullable(),
  initialPassword: z.string().min(8),

  // Compensation
  baseSalary: z.number().nonnegative(),
  allowances: z.number().nonnegative(),

  // Bank + emergency contact
  bankAccount: z.object({
    bankName: z.string().min(1),
    accountHolderName: z.string().min(1),
    iban: z.string().optional().nullable(),
    accountNumber: z.string().optional().nullable(),
  }),
  emergencyContact: z.object({
    name: z.string().min(1),
    relation: z.string().min(1),
    phone: z.string().min(5),
  }),
});

const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .extend({
    // For salary updates specifically.
    salaryChangeReason: z.string().optional().nullable(),
  })
  .omit({ initialPassword: true });

type RequestWithUser = Request & { user?: { userId: string; role: Role; employeeId?: string | null } };

@Controller("employees")
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @UseGuards(AccessTokenGuard)
  @Get()
  async list(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const user = req.user!;
    const data = await this.employees.listForUser(user.role, user.employeeId ?? null);
    return res.json({ employees: data });
  }

  @UseGuards(AccessTokenGuard)
  @Get(":id")
  async getById(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user!;
    const employee = await this.employees.getForUser(user.role, user.employeeId ?? null, id);
    return res.json({ employee });
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() body: unknown, @Req() req: RequestWithUser) {
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) return { message: "Invalid employee payload" };

    const actor = req.user!;
    const created = await this.employees.createEmployee(parsed.data, actor.userId);
    return { employee: created };
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(":id")
  async update(
    @Body() body: unknown,
    @Param("id") id: string,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid employee payload" });

    const actor = req.user!;
    const updated = await this.employees.updateEmployee(id, parsed.data, actor.userId);
    return res.json({ employee: updated });
  }
}

