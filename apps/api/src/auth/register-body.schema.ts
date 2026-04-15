import { z } from "zod";

/** Public self-registration: same HR fields as admin employee create, plus access code and password. */
export const registerRequestSchema = z.object({
  registrationCode: z.string().min(1),
  password: z.string().min(8),

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

  baseSalary: z.number().nonnegative(),
  allowances: z.number().nonnegative(),

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

export type RegisterRequestBody = z.infer<typeof registerRequestSchema>;
