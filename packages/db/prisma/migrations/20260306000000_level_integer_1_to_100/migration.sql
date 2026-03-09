-- Replace VIP enum level with integer level (1-100) for XP-based leveling
ALTER TABLE "users" DROP COLUMN IF EXISTS "level";
ALTER TABLE "users" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
DROP TYPE IF EXISTS "Level";
