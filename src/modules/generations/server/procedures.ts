import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { websiteInspectionEnabled } from "@/constants";
import { inngest } from "@/inngest/client";
import {
  createGenerationForProject,
  dispatchGeneration,
  failGeneration,
  reconcileStaleQueuedGenerations,
} from "@/lib/generations";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { hasUnlimitedCredits } from "@/lib/usage";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const generationInput = z.object({ generationId: z.string().uuid() });

export const generationsRouter = createTRPCRouter({
  getActive: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await reconcileStaleQueuedGenerations({
        userId: ctx.auth.userId,
        projectId: input.projectId,
      });
      const generation = await prisma.generation.findFirst({
        where: {
          projectId: input.projectId,
          project: { userId: ctx.auth.userId },
          status: { in: ["QUEUED", "RUNNING", "CANCEL_REQUESTED"] },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!generation || !websiteInspectionEnabled()) {
        return generation ? { ...generation, websiteInspection: null } : null;
      }
      const websiteInspection = await prisma.websiteInspection.findUnique({
        where: { generationId: generation.id },
        select: {
          seedUrl: true,
          canonicalOrigin: true,
          status: true,
          pageCount: true,
          pageRoutes: true,
          failureMessage: true,
          qualityStatus: true,
          qualityScore: true,
          qualityReport: true,
          qualityRepairUsed: true,
        },
      });
      return { ...generation, websiteInspection };
    }),
  cancel: protectedProcedure.input(generationInput).mutation(async ({ input, ctx }) => {
    const generation = await prisma.generation.findFirst({
      where: { id: input.generationId, userId: ctx.auth.userId },
    });
    if (!generation) throw new TRPCError({ code: "NOT_FOUND", message: "Build not found." });
    if (!["QUEUED", "RUNNING"].includes(generation.status)) return generation;
    await prisma.generation.update({ where: { id: generation.id }, data: { status: "CANCEL_REQUESTED" } });
    await inngest.send({
      id: `generation-cancel:${generation.id}`,
      name: "codegenie/generation.cancelled",
      data: { generationId: generation.id, projectId: generation.projectId },
    });
    return failGeneration(generation.id, "CANCELLED", "Generation cancelled.");
  }),
  retry: protectedProcedure
    .input(generationInput.extend({ clientRequestId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const previous = await prisma.generation.findFirst({
        where: { id: input.generationId, userId: ctx.auth.userId },
        include: { promptMessage: true },
      });
      if (!previous) throw new TRPCError({ code: "NOT_FOUND", message: "Build not found." });
      if (!["FAILED", "CANCELLED"].includes(previous.status)) {
        throw new TRPCError({ code: "CONFLICT", message: "Only failed or cancelled builds can be retried." });
      }
      const previousInspection = websiteInspectionEnabled()
        ? await prisma.websiteInspection.findUnique({ where: { generationId: previous.id } })
        : null;
      const generation = await createGenerationForProject({
        projectId: previous.projectId,
        prompt: previous.promptMessage.content,
        clientRequestId: input.clientRequestId,
        userId: ctx.auth.userId,
        isPro: ctx.auth.has({ plan: "pro" }),
        isUnlimited: await hasUnlimitedCredits(),
        reference: previousInspection
          ? {
              seedUrl: previousInspection.seedUrl,
              canonicalOrigin: previousInspection.canonicalOrigin,
              status: previousInspection.status === "PARTIAL" ? "PARTIAL" : previousInspection.status === "READY" ? "READY" : "PENDING",
              pages: previousInspection.pages as Prisma.InputJsonValue | undefined,
              contentHash: previousInspection.contentHash,
              pageCount: previousInspection.pageCount,
              pageRoutes: previousInspection.pageRoutes,
            }
          : null,
      });
      await dispatchGeneration(generation.id, generation.projectId);
      return generation;
    }),
});
