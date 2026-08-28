import { z } from "zod";

import prisma from "@/lib/prisma";
import { websiteInspectionEnabled } from "@/constants";
import { createGenerationForProject, dispatchGeneration } from "@/lib/generations";
import { hasUnlimitedCredits } from "@/lib/usage";
import { extractReferenceUrl } from "@/lib/reference-url";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const messagesRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "projectId is required" }),
      })
    )
    .query(async ({ input, ctx }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
          project: {
            userId: ctx.auth.userId,
          },
        },
        orderBy: {
          updatedAt: "asc",
        },
        include: {
          fragment: { include: { previewSessions: { orderBy: { createdAt: "desc" }, take: 1 } } },
          promptGeneration: true,
        },
        take: 100,
      });

      if (!websiteInspectionEnabled()) {
        return messages.map((message) => ({
          ...message,
          promptGeneration: message.promptGeneration
            ? { ...message.promptGeneration, websiteInspection: null }
            : null,
        }));
      }
      const inspections = await prisma.websiteInspection.findMany({
        where: {
          generationId: {
            in: messages.flatMap((message) =>
              message.promptGeneration ? [message.promptGeneration.id] : []),
          },
        },
        select: {
          generationId: true,
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
      const inspectionByGeneration = new Map(
        inspections.map(({ generationId, ...inspection }) => [generationId, inspection]),
      );
      return messages.map((message) => ({
        ...message,
        promptGeneration: message.promptGeneration
          ? {
              ...message.promptGeneration,
              websiteInspection: inspectionByGeneration.get(message.promptGeneration.id) || null,
            }
          : null,
      }));
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Value is required" })
          .max(10_000, { message: "Value is too long" }),
        projectId: z.string().min(1, { message: "projectId is required" }),
        clientRequestId: z.string().uuid().optional(),
        referenceUrl: z.string().url().max(2_048).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const inspectionEnabled = websiteInspectionEnabled();
      let referenceUrl: string | null;
      try {
        referenceUrl = inspectionEnabled
          ? extractReferenceUrl(input.value, input.referenceUrl)
          : null;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid reference URL.",
        });
      }
      const generation = await createGenerationForProject({
        projectId: existingProject.id,
        prompt: input.value,
        clientRequestId: input.clientRequestId || crypto.randomUUID(),
        userId: ctx.auth.userId,
        isPro: ctx.auth.has({ plan: "pro" }),
        isUnlimited: await hasUnlimitedCredits(),
        reference: inspectionEnabled && referenceUrl ? { seedUrl: referenceUrl } : null,
      });
      await dispatchGeneration(generation.id, existingProject.id);
      return generation.promptMessage;
    }),
});
