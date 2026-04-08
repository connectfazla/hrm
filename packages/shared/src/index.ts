import { z } from 'zod';

export const RoleSchema = z.enum(['ADMIN', 'EMPLOYEE']);
export type Role = z.infer<typeof RoleSchema>;

export const LeaveTypeSchema = z.enum([
  'ANNUAL',
  'EMERGENCY_UNPAID',
  'SICK',
  'MATERNITY',
  'PATERNITY',
  'STUDY',
  'BEREAVEMENT_IMMEDIATE',
  'BEREAVEMENT_EXTENDED',
  'HAJJ',
]);
export type LeaveType = z.infer<typeof LeaveTypeSchema>;

