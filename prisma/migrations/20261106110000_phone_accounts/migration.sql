-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PhoneSignup" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "accountType" "AccountType" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "next" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneSignup_expiresAt_idx" ON "PhoneSignup"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");


-- Every account can be reached by an email address or a phone number.
ALTER TABLE "User" ADD CONSTRAINT "User_email_or_phone" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
