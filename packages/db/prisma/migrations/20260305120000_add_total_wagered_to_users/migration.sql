-- Track total wagered amount per user (in major currency units)
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "total_wagered" DOUBLE PRECISION NOT NULL DEFAULT 0;

