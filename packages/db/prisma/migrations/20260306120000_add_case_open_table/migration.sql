-- Create table to store case openings with pending/completed status
CREATE TYPE "CaseOpenStatus" AS ENUM ('pending', 'completed');

CREATE TABLE "case_opens" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "winningItemName" TEXT NOT NULL,
  "winningItemValue" DOUBLE PRECISION NOT NULL,
  "priceInCents" INTEGER NOT NULL,
  "payoutInCents" INTEGER NOT NULL,
  "status" "CaseOpenStatus" NOT NULL DEFAULT 'pending',
  "roll" DOUBLE PRECISION NOT NULL,
  "nonce" INTEGER NOT NULL,
  "serverSeedHash" TEXT NOT NULL,
  "clientSeed" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "case_opens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "case_opens_user_status_idx" ON "case_opens"("userId", "status");

