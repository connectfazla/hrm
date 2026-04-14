-- Archived employees retain all HR data but cannot authenticate (see auth + archivedAt).
ALTER TABLE "Employee" ADD COLUMN "archivedAt" TIMESTAMP(3);
