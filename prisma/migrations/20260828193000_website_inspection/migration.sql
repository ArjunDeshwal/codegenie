ALTER TYPE "GenerationStage" ADD VALUE IF NOT EXISTS 'INSPECTING';
ALTER TYPE "GenerationStage" ADD VALUE IF NOT EXISTS 'COMPARING';
ALTER TYPE "FailureCode" ADD VALUE IF NOT EXISTS 'REFERENCE_UNAVAILABLE';

CREATE TYPE "WebsiteInspectionStatus" AS ENUM ('PENDING', 'READY', 'PARTIAL', 'FAILED');
CREATE TYPE "WebsiteQualityStatus" AS ENUM ('PENDING', 'PASSED', 'NEEDS_REFINEMENT', 'UNAVAILABLE');

CREATE TABLE "WebsiteInspection" (
  "id" TEXT NOT NULL,
  "generationId" TEXT NOT NULL,
  "seedUrl" TEXT NOT NULL,
  "canonicalOrigin" TEXT,
  "status" "WebsiteInspectionStatus" NOT NULL DEFAULT 'PENDING',
  "pages" JSONB,
  "contentHash" TEXT,
  "pageCount" INTEGER NOT NULL DEFAULT 0,
  "pageRoutes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "failureMessage" TEXT,
  "qualityStatus" "WebsiteQualityStatus" NOT NULL DEFAULT 'PENDING',
  "qualityScore" INTEGER,
  "qualityReport" JSONB,
  "qualityRepairUsed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteInspection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteInspection_generationId_key" ON "WebsiteInspection"("generationId");
CREATE INDEX "WebsiteInspection_status_updatedAt_idx" ON "WebsiteInspection"("status", "updatedAt");

ALTER TABLE "WebsiteInspection"
  ADD CONSTRAINT "WebsiteInspection_generationId_fkey"
  FOREIGN KEY ("generationId") REFERENCES "Generation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
