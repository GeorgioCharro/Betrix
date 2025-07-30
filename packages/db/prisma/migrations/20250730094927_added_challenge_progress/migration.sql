/*
  Warnings:

  - You are about to drop the column `userWon` on the `challenges` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "challenges" DROP COLUMN "userWon";

-- CreateTable
CREATE TABLE "challenge_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenge_progress_userId_idx" ON "challenge_progress"("userId");

-- CreateIndex
CREATE INDEX "challenge_progress_challengeId_idx" ON "challenge_progress"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_progress_userId_challengeId_key" ON "challenge_progress"("userId", "challengeId");

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
