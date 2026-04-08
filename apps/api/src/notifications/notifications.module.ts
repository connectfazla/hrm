import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, AccessTokenGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}

