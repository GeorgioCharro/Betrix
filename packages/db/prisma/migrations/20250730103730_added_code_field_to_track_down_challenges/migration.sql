/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `challenges` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "challenges_code_key" ON "challenges"("code");
