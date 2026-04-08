import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AccessTokenGuard, RolesGuard],
})
export class AttendanceModule {}

