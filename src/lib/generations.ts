import { TRPCError } from "@trpc/server";

import {
  CreditReservationStatus,
  FailureCode,
  GenerationStage,
  GenerationStatus,
  Prisma,
} from "@/generated/prisma";
import { inngest } from "@/inngest/client";
import {
  CREDIT_PERIOD_DAYS,
  FREE_GENERATION_CREDITS,
  PRO_GENERATION_CREDITS,
} from "@/lib/credit-plan";
import { GENERATION_QUEUE_TIMEOUT_MS } from "@/lib/generation-state";
import prisma from "@/lib/prisma";

export const PRIMARY_MODEL =
  process.env.TOKENROUTER_PRIMARY_MODEL || "qwen/qwen3-coder-next";
export const FALLBACK_MODEL =
  process.env.TOKENROUTER_FALLBACK_MODEL || "openai/gpt-5.4-mini";

const CREDIT_PERIOD_MS = CREDIT_PERIOD_DAYS * 24 * 60 * 60 * 1_000;

type Db = Prisma.TransactionClient;

export interface GenerationReferenceInput {
  seedUrl: string;
  canonicalOrigin?: string | null;
  status?: "PENDING" | "READY" | "PARTIAL";
  pages?: Prisma.InputJsonValue;
  contentHash?: string | null;
  pageCount?: number;
  pageRoutes?: string[];
}

const referenceCreateData = (reference?: GenerationReferenceInput | null) =>
  reference
    ? {
        websiteInspection: {
          create: {
            seedUrl: reference.seedUrl,
            canonicalOrigin: reference.canonicalOrigin,
            status: reference.status || "PENDING",
            pages: reference.pages,
            contentHash: reference.contentHash,
            pageCount: reference.pageCount || 0,
            pageRoutes: reference.pageRoutes || [],
          },
        },
      }
    : {};

const reserveCredit = async (
  tx: Db,
  userId: string,
  isPro: boolean,
  isUnlimited: boolean,
) => {
  if (process.env.NODE_ENV === "development" || isUnlimited) return 0;

  const now = new Date();
  const allowance = isPro ? PRO_GENERATION_CREDITS : FREE_GENERATION_CREDITS;
  const existing = await tx.usage.findUnique({ where: { key: userId } });
  const expired = !existing?.expire || existing.expire <= now;
  const used = expired ? 0 : existing.points;

  if (used >= allowance) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You ran out of generation credits.",
    });
  }

  await tx.usage.upsert({
    where: { key: userId },
    create: {
      key: userId,
      points: 1,
      expire: new Date(now.getTime() + CREDIT_PERIOD_MS),
    },
    update: expired
      ? { points: 1, expire: new Date(now.getTime() + CREDIT_PERIOD_MS) }
      : { points: { increment: 1 } },
  });

  return 1;
};

export const generationInclude = {
  promptMessage: true,
  resultMessage: { include: { fragment: { include: { previewSessions: true } } } },
  fragment: { include: { previewSessions: true } },
} satisfies Prisma.GenerationInclude;

export const createGenerationForProject = async ({
  projectId,
  prompt,
  clientRequestId,
  userId,
  isPro,
  isUnlimited,
  reference,
}: {
  projectId: string;
  prompt: string;
  clientRequestId: string;
  userId: string;
  isPro: boolean;
  isUnlimited: boolean;
  reference?: GenerationReferenceInput | null;
}) => {
  const duplicate = await prisma.generation.findUnique({
    where: { userId_clientRequestId: { userId, clientRequestId } },
    include: generationInclude,
  });
  if (duplicate) return duplicate;

  return prisma.$transaction(
    async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId, userId },
        include: {
          messages: {
            where: { fragment: { isNot: null } },
            include: { fragment: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      }
      if (project.activeGenerationId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This project already has an active generation.",
        });
      }

      const points = await reserveCredit(tx, userId, isPro, isUnlimited);
      const promptMessage = await tx.message.create({
        data: { projectId, content: prompt, role: "USER", type: "RESULT" },
      });
      const generation = await tx.generation.create({
        data: {
          userId,
          clientRequestId,
          projectId,
          promptMessageId: promptMessage.id,
          baseFragmentId: project.messages[0]?.fragment?.id,
          primaryModel: PRIMARY_MODEL,
          fallbackModel: FALLBACK_MODEL,
          creditReservation: { create: { userId, points } },
          ...referenceCreateData(reference),
        },
        include: generationInclude,
      });

      const claimed = await tx.project.updateMany({
        where: { id: projectId, activeGenerationId: null },
        data: { activeGenerationId: generation.id, updatedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This project already has an active generation.",
        });
      }

      return generation;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
};

export const createProjectWithGeneration = async ({
  name,
  prompt,
  clientRequestId,
  userId,
  isPro,
  isUnlimited,
  reference,
}: {
  name: string;
  prompt: string;
  clientRequestId: string;
  userId: string;
  isPro: boolean;
  isUnlimited: boolean;
  reference?: GenerationReferenceInput | null;
}) => {
  const duplicate = await prisma.generation.findUnique({
    where: { userId_clientRequestId: { userId, clientRequestId } },
    include: { project: true },
  });
  if (duplicate) return { project: duplicate.project, generation: duplicate };

  return prisma.$transaction(
    async (tx) => {
      const points = await reserveCredit(tx, userId, isPro, isUnlimited);
      const project = await tx.project.create({ data: { name, userId } });
      const promptMessage = await tx.message.create({
        data: { projectId: project.id, content: prompt, role: "USER", type: "RESULT" },
      });
      const generation = await tx.generation.create({
        data: {
          userId,
          clientRequestId,
          projectId: project.id,
          promptMessageId: promptMessage.id,
          primaryModel: PRIMARY_MODEL,
          fallbackModel: FALLBACK_MODEL,
          creditReservation: { create: { userId, points } },
          ...referenceCreateData(reference),
        },
      });
      await tx.project.update({
        where: { id: project.id },
        data: { activeGenerationId: generation.id },
      });
      return { project, generation };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
};

export const dispatchGeneration = async (generationId: string, projectId: string) => {
  try {
    const result = await inngest.send({
      id: `generation:${generationId}`,
      name: "codegenie/generation.requested",
      data: { generationId, projectId },
    });
    await prisma.generation.update({
      where: { id: generationId },
      data: { inngestEventId: result.ids[0] },
    });
  } catch {
    await failGeneration(
      generationId,
      FailureCode.DISPATCH_FAILED,
      "The generation worker could not be reached. Retry this build.",
    );
    return false;
  }
  return true;
};

export const refundReservation = async (tx: Db, generationId: string) => {
  const reservation = await tx.creditReservation.findUnique({
    where: { generationId },
  });
  if (!reservation || reservation.status !== CreditReservationStatus.RESERVED) return;

  await tx.creditReservation.update({
    where: { id: reservation.id },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });
  if (reservation.points > 0) {
    const usage = await tx.usage.findUnique({ where: { key: reservation.userId } });
    if (usage) {
      await tx.usage.update({
        where: { key: reservation.userId },
        data: { points: Math.max(0, usage.points - reservation.points) },
      });
    }
  }
};

export const failGeneration = async (
  generationId: string,
  code: FailureCode,
  userMessage: string,
) =>
  prisma.$transaction(async (tx) => {
    const generation = await tx.generation.findUnique({ where: { id: generationId } });
    if (!generation || ["SUCCEEDED", "FAILED", "CANCELLED"].includes(generation.status)) {
      return generation;
    }
    await refundReservation(tx, generationId);
    const status = code === "CANCELLED" ? GenerationStatus.CANCELLED : GenerationStatus.FAILED;
    const updated = await tx.generation.update({
      where: { id: generationId },
      data: {
        status,
        failureCode: code,
        failureMessage: userMessage.slice(0, 1_000),
        finishedAt: new Date(),
      },
    });
    await tx.project.updateMany({
      where: { id: generation.projectId, activeGenerationId: generationId },
      data: { activeGenerationId: null, updatedAt: new Date() },
    });
    return updated;
  });

export const reconcileStaleQueuedGenerations = async ({
  userId,
  projectId,
  now = new Date(),
}: {
  userId?: string;
  projectId?: string;
  now?: Date;
} = {}) => {
  const cutoff = new Date(now.getTime() - GENERATION_QUEUE_TIMEOUT_MS);
  const stale = await prisma.generation.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(projectId ? { projectId } : {}),
      status: GenerationStatus.QUEUED,
      stage: GenerationStage.QUEUED,
      createdAt: { lte: cutoff },
    },
    select: { id: true, projectId: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  if (stale.length === 0) return 0;

  let reconciled = 0;
  for (const generation of stale) {
    const didReconcile = await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.generation.updateMany({
          where: {
            id: generation.id,
            status: GenerationStatus.QUEUED,
            stage: GenerationStage.QUEUED,
            createdAt: { lte: cutoff },
          },
          data: {
            status: GenerationStatus.FAILED,
            failureCode: FailureCode.WORKER_UNAVAILABLE,
            failureMessage:
              "A generation worker did not start within two minutes. Your credit was refunded; retry the build.",
            finishedAt: now,
          },
        });
        if (claimed.count !== 1) return false;

        await refundReservation(tx, generation.id);
        await tx.project.updateMany({
          where: {
            id: generation.projectId,
            activeGenerationId: generation.id,
          },
          data: { activeGenerationId: null, updatedAt: now },
        });
        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
    if (didReconcile) reconciled += 1;
  }
  return reconciled;
};

export const claimGenerationStart = async (generationId: string) => {
  const claimed = await prisma.generation.updateMany({
    where: {
      id: generationId,
      status: GenerationStatus.QUEUED,
      stage: GenerationStage.QUEUED,
    },
    data: {
      status: GenerationStatus.RUNNING,
      stage: GenerationStage.PREPARING,
      startedAt: new Date(),
      attemptCount: { increment: 1 },
    },
  });
  return claimed.count === 1;
};

export const updateGenerationStage = (
  generationId: string,
  stage: GenerationStage,
  data: Prisma.GenerationUpdateInput = {},
) =>
  prisma.generation.updateMany({
    where: { id: generationId, status: GenerationStatus.RUNNING },
    data: { stage, ...data },
  });
