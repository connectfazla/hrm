import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PayrollController } from "./payroll.controller";
import { PayrollService } from "./payroll.service";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

@Module({
  imports: [PrismaModule],
  controllers: [PayrollController],
  providers: [PayrollService, AccessTokenGuard, RolesGuard],
})
export class PayrollModule {}

