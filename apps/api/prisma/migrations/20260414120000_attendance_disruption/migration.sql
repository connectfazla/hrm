-- CreateEnum
CREATE TYPE "AttendanceDisruptionKind" AS ENUM ('POWER_OUTAGE', 'INTERNET_OUTAGE', 'OTHER');

-- CreateTable
CREATE TABLE "AttendanceDisruption" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "kind" "AttendanceDisruptionKind" NOT NULL,
    "detail" TEXT,
    "workSessionId" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceDisruption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceDisruption_employeeId_recordedAt_idx" ON "AttendanceDisruption"("employeeId", "recordedAt");

-- AddForeignKey
ALTER TABLE "AttendanceDisruption" ADD CONSTRAINT "AttendanceDisruption_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceDisruption" ADD CONSTRAINT "AttendanceDisruption_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
