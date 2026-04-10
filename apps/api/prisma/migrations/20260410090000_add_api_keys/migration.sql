-- AlterTable - add new fields to existing ApiKey table
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "keyPrefix" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY['read']::TEXT[];
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Rename column if needed (scopes -> permissions handled by default)
-- Drop old columns if they exist
ALTER TABLE "ApiKey" DROP COLUMN IF EXISTS "scopes";

-- Rename createdByUserId to createdById if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ApiKey' AND column_name = 'createdByUserId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ApiKey' AND column_name = 'createdById') THEN
      ALTER TABLE "ApiKey" RENAME COLUMN "createdByUserId" TO "createdById";
    END IF;
  END IF;
END $$;

-- CreateIndex if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
