-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "fileHash" TEXT;

-- AlterTable
ALTER TABLE "ProcessingJob" ADD COLUMN     "fileHash" TEXT;

-- CreateIndex
CREATE INDEX "Document_fileHash_idx" ON "Document"("fileHash");

-- CreateIndex
CREATE INDEX "ProcessingJob_fileHash_idx" ON "ProcessingJob"("fileHash");
