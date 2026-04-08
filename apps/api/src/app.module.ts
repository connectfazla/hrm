import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { EmployeesModule } from "./employees/employees.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { LeaveModule } from "./leave/leave.module";
import { PayrollModule } from "./payroll/payroll.module";
import { DocumentsModule } from "./documents/documents.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Support running from apps/api while keeping a repo-root .env
      envFilePath: ["../../.env", ".env"],
    }),
    ThrottlerModule.forRoot(),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    NotificationsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
