-- Durable generation jobs, credit reservations, immutable artifacts, and restartable previews.
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCEL_REQUESTED', 'CANCELLED');
CREATE TYPE "GenerationStage" AS ENUM ('QUEUED', 'PREPARING', 'RESTORING', 'GENERATING', 'VALIDATING', 'REPAIRING', 'SAVING');
CREATE TYPE "FailureCode" AS ENUM ('DISPATCH_FAILED', 'SANDBOX_FAILED', 'MODEL_FAILED', 'TOOL_INPUT_INVALID', 'VALIDATION_FAILED', 'PERSISTENCE_FAILED', 'CANCELLED', 'INTERNAL', 'LEGACY_ORPHANED');
CREATE TYPE "CreditReservationStatus" AS ENUM ('RESERVED', 'SETTLED', 'REFUNDED');
CREATE TYPE "PreviewStatus" AS ENUM ('STARTING', 'READY', 'EXPIRED', 'FAILED');

ALTER TABLE "Project" ADD COLUMN "activeGenerationId" TEXT;
ALTER TABLE "Fragment" ALTER COLUMN "sandboxUrl" DROP NOT NULL;
ALTER TABLE "Fragment" ADD COLUMN "templateVersion" TEXT NOT NULL DEFAULT 'legacy-1';
ALTER TABLE "Fragment" ADD COLUMN "checksum" TEXT;
ALTER TABLE "Fragment" ADD COLUMN "byteSize" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fragment" ADD COLUMN "isRestorable" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Generation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "promptMessageId" TEXT NOT NULL,
  "resultMessageId" TEXT,
  "baseFragmentId" TEXT,
  "fragmentId" TEXT,
  "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
  "stage" "GenerationStage" NOT NULL DEFAULT 'QUEUED',
  "failureCode" "FailureCode",
  "failureMessage" TEXT,
  "inngestEventId" TEXT,
  "inngestRunId" TEXT,
  "sandboxId" TEXT,
  "primaryModel" TEXT NOT NULL,
  "fallbackModel" TEXT,
  "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditReservation" (
  "id" TEXT NOT NULL,
  "generationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 1,
  "status" "CreditReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  CONSTRAINT "CreditReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PreviewSession" (
  "id" TEXT NOT NULL,
  "fragmentId" TEXT NOT NULL,
  "sandboxId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "status" "PreviewStatus" NOT NULL DEFAULT 'STARTING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PreviewSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_activeGenerationId_key" ON "Project"("activeGenerationId");
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");
CREATE INDEX "Message_projectId_createdAt_id_idx" ON "Message"("projectId", "createdAt", "id");
CREATE UNIQUE INDEX "Generation_promptMessageId_key" ON "Generation"("promptMessageId");
CREATE UNIQUE INDEX "Generation_resultMessageId_key" ON "Generation"("resultMessageId");
CREATE UNIQUE INDEX "Generation_fragmentId_key" ON "Generation"("fragmentId");
CREATE UNIQUE INDEX "Generation_userId_clientRequestId_key" ON "Generation"("userId", "clientRequestId");
CREATE INDEX "Generation_projectId_createdAt_idx" ON "Generation"("projectId", "createdAt");
CREATE INDEX "Generation_status_updatedAt_idx" ON "Generation"("status", "updatedAt");
CREATE UNIQUE INDEX "CreditReservation_generationId_key" ON "CreditReservation"("generationId");
CREATE INDEX "CreditReservation_userId_createdAt_idx" ON "CreditReservation"("userId", "createdAt");
CREATE INDEX "PreviewSession_fragmentId_createdAt_idx" ON "PreviewSession"("fragmentId", "createdAt");
CREATE INDEX "PreviewSession_status_expiresAt_idx" ON "PreviewSession"("status", "expiresAt");

ALTER TABLE "Generation" ADD CONSTRAINT "Generation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_promptMessageId_fkey" FOREIGN KEY ("promptMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_resultMessageId_fkey" FOREIGN KEY ("resultMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_baseFragmentId_fkey" FOREIGN KEY ("baseFragmentId") REFERENCES "Fragment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "Fragment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_activeGenerationId_fkey" FOREIGN KEY ("activeGenerationId") REFERENCES "Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreviewSession" ADD CONSTRAINT "PreviewSession_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "Fragment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve and classify historical conversations. Only an immediately-following
-- assistant result is paired, preventing one result from being attached twice.
WITH ordered AS (
  SELECT
    m.*,
    LEAD(m."id") OVER (PARTITION BY m."projectId" ORDER BY m."createdAt", m."id") AS "nextId",
    LEAD(m."role") OVER (PARTITION BY m."projectId" ORDER BY m."createdAt", m."id") AS "nextRole"
  FROM "Message" m
), classified AS (
  SELECT
    o.*,
    CASE WHEN o."nextRole" = 'ASSISTANT' THEN a."id" END AS "assistantId",
    CASE WHEN o."nextRole" = 'ASSISTANT' THEN a."type" END AS "assistantType",
    CASE WHEN o."nextRole" = 'ASSISTANT' THEN f."id" END AS "fragmentId"
  FROM ordered o
  LEFT JOIN "Message" a ON a."id" = o."nextId"
  LEFT JOIN "Fragment" f ON f."messageId" = a."id"
  WHERE o."role" = 'USER'
)
INSERT INTO "Generation" (
  "id", "userId", "clientRequestId", "projectId", "promptMessageId",
  "resultMessageId", "fragmentId", "status", "stage", "failureCode",
  "failureMessage", "primaryModel", "createdAt", "updatedAt", "finishedAt"
)
SELECT
  c."id", p."userId", 'legacy:' || c."id", c."projectId", c."id",
  c."assistantId", c."fragmentId",
  CASE WHEN c."assistantType" = 'RESULT' AND c."fragmentId" IS NOT NULL
    THEN 'SUCCEEDED'::"GenerationStatus" ELSE 'FAILED'::"GenerationStatus" END,
  'SAVING'::"GenerationStage",
  CASE WHEN c."assistantType" = 'RESULT' AND c."fragmentId" IS NOT NULL
    THEN NULL ELSE 'LEGACY_ORPHANED'::"FailureCode" END,
  CASE WHEN c."assistantType" = 'RESULT' AND c."fragmentId" IS NOT NULL
    THEN NULL ELSE 'This historical generation did not record a complete artifact.' END,
  'legacy', c."createdAt", COALESCE(a."updatedAt", c."updatedAt"), COALESCE(a."updatedAt", c."updatedAt")
FROM classified c
JOIN "Project" p ON p."id" = c."projectId"
LEFT JOIN "Message" a ON a."id" = c."assistantId";

INSERT INTO "PreviewSession" (
  "id", "fragmentId", "sandboxId", "url", "status", "expiresAt", "createdAt", "updatedAt"
)
SELECT
  f."id", f."id", 'legacy', f."sandboxUrl", 'EXPIRED'::"PreviewStatus",
  CURRENT_TIMESTAMP, f."createdAt", CURRENT_TIMESTAMP
FROM "Fragment" f
WHERE f."sandboxUrl" IS NOT NULL;
