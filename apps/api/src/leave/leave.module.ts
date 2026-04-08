import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { LeaveController } from "./leave.controller";
import { LeaveService } from "./leave.service";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [LeaveController],
  providers: [LeaveService, AccessTokenGuard, RolesGuard],
})
export class LeaveModule {}

