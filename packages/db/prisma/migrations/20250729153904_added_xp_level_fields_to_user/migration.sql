-- CreateEnum
CREATE TYPE "Level" AS ENUM ('none', 'vip', 'vip_plus', 'diamond');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level" "Level" NOT NULL DEFAULT 'none',
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;
