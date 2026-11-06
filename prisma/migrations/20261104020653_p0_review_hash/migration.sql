-- AlterTable
ALTER TABLE "ReviewTask" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "ReviewTask_entityType_entityId_contentHash_idx" ON "ReviewTask"("entityType", "entityId", "contentHash");
