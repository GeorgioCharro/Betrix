-- DropForeignKey
ALTER TABLE "case_opens" DROP CONSTRAINT "case_opens_userId_fkey";

-- AlterTable
ALTER TABLE "case_opens" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "case_opens" ADD CONSTRAINT "case_opens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "case_opens_user_status_idx" RENAME TO "case_opens_userId_status_idx";
