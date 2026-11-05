-- CreateTable
CREATE TABLE "SavedWork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedWork_userId_updatedAt_idx" ON "SavedWork"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedWork_userId_key_key" ON "SavedWork"("userId", "key");

-- AddForeignKey
ALTER TABLE "SavedWork" ADD CONSTRAINT "SavedWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
