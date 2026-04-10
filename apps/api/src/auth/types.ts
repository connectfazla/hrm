import { Role } from "@prisma/client";

export type AuthUser = {
  userId: string;
  role: Role;
  employeeId?: string | null;
  apiKeyId?: string | null;
  apiPermissions?: string[];
};

