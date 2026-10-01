-- AlterTable
ALTER TABLE "User" ADD COLUMN     "testOwnerId" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "certificateTemplateId" TEXT;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateSnapshot" JSONB;

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'CLASSIC',
    "accent" TEXT NOT NULL DEFAULT '#4338ca',
    "issuer" TEXT NOT NULL,
    "issuerEn" TEXT NOT NULL,
    "signatory" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_testOwnerId_idx" ON "User"("testOwnerId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

