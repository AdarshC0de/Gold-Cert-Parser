-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "companyName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxDevices" INTEGER NOT NULL DEFAULT 2,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "refNumber" TEXT,
    "refDate" TEXT,
    "manufacturer" TEXT,
    "origin" TEXT,
    "agent" TEXT,
    "invoiceNo" TEXT,
    "certNo" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "rawOcrText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRow" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "rowOrder" INTEGER NOT NULL,
    "gram" TEXT NOT NULL,
    "gramValue" DOUBLE PRECISION,
    "count" INTEGER NOT NULL,
    "serialFrom" INTEGER NOT NULL,
    "serialTo" INTEGER NOT NULL,
    "series" TEXT NOT NULL,
    "purity" TEXT,
    "brand" TEXT,

    CONSTRAINT "DocumentRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_userId_fingerprint_key" ON "UserSession"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "DocumentRow_gram_series_serialFrom_serialTo_idx" ON "DocumentRow"("gram", "series", "serialFrom", "serialTo");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRow" ADD CONSTRAINT "DocumentRow_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
