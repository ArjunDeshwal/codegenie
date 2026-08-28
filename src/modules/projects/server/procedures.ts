import { TRPCError } from "@trpc/server";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { websiteInspectionEnabled } from "@/constants";
import {
  createProjectWithGeneration,
  dispatchGeneration,
  reconcileStaleQueuedGenerations,
} from "@/lib/generations";
import { hasUnlimitedCredits } from "@/lib/usage";
import { extractReferenceUrl } from "@/lib/reference-url";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "id is required" }),
      })
    )
    .query(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return existingProject;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    await reconcileStaleQueuedGenerations({ userId: ctx.auth.userId });
    const projects = await prisma.project.findMany({
      where: {
        userId: ctx.auth.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
      include: { activeGeneration: { select: { status: true, stage: true } } },
    });

    return projects;
  }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Value is required" })
          .max(10_000, { message: "Value is too long" }),
        clientRequestId: z.string().uuid().optional(),
        referenceUrl: z.string().url().max(2_048).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
      const created = await createProjectWithGeneration({
        userId: ctx.auth.userId,
        isPro: ctx.auth.has({ plan: "pro" }),
        isUnlimited: await hasUnlimitedCredits(),
        name: generateSlug(2, { format: "kebab" }),
        prompt: input.value,
        clientRequestId: input.clientRequestId || crypto.randomUUID(),
        reference: inspectionEnabled && referenceUrl ? { seedUrl: referenceUrl } : null,
      });
      await dispatchGeneration(created.generation.id, created.project.id);
      return created;
    }),
});
