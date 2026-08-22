import { TRPCError } from "@trpc/server";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { createProjectWithGeneration, dispatchGeneration } from "@/lib/generations";
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const created = await createProjectWithGeneration({
        userId: ctx.auth.userId,
        isPro: ctx.auth.has({ plan: "pro" }),
        name: generateSlug(2, { format: "kebab" }),
        prompt: input.value,
        clientRequestId: input.clientRequestId || crypto.randomUUID(),
      });
      await dispatchGeneration(created.generation.id, created.project.id);
      return created;
    }),
});
