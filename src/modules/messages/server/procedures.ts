import { z } from "zod";

import prisma from "@/lib/prisma";
import { createGenerationForProject, dispatchGeneration } from "@/lib/generations";
import { hasUnlimitedCredits } from "@/lib/usage";
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

      return messages;
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

      const generation = await createGenerationForProject({
        projectId: existingProject.id,
        prompt: input.value,
        clientRequestId: input.clientRequestId || crypto.randomUUID(),
        userId: ctx.auth.userId,
        isPro: ctx.auth.has({ plan: "pro" }),
        isUnlimited: await hasUnlimitedCredits(),
      });
      await dispatchGeneration(generation.id, existingProject.id);
      return generation.promptMessage;
    }),
});
