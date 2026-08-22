import { Sandbox } from "@e2b/code-interpreter";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { SANDBOX_TIMEOUT_IN_MS } from "@/constants";
import prisma from "@/lib/prisma";
import { validateSandboxPreview } from "@/inngest/sandbox-health";
import type { FileCollection } from "@/types";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const previewsRouter = createTRPCRouter({
  restart: protectedProcedure
    .input(z.object({ fragmentId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const fragment = await prisma.fragment.findFirst({
        where: { id: input.fragmentId, message: { project: { userId: ctx.auth.userId } } },
      });
      if (!fragment) throw new TRPCError({ code: "NOT_FOUND", message: "Build not found." });
      if (!fragment.isRestorable) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This legacy build cannot be restarted safely." });
      }

      const recentRestarts = await prisma.previewSession.count({
        where: {
          fragment: { message: { project: { userId: ctx.auth.userId } } },
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1_000) },
        },
      });
      if (recentRestarts >= 5) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Preview restart limit reached. Try again later." });
      }

      const sandbox = await Sandbox.create("codegenie-nextjs");
      try {
        await sandbox.setTimeout(SANDBOX_TIMEOUT_IN_MS);
        for (const [path, content] of Object.entries(fragment.files as FileCollection)) {
          await sandbox.files.write(path, content);
        }
        const validation = await validateSandboxPreview(sandbox);
        if (!validation.ok) {
          await sandbox.kill();
          throw new TRPCError({ code: "BAD_REQUEST", message: "The saved artifact no longer compiles in the current template." });
        }
        const url = `https://${sandbox.getHost(3000)}`;
        const expiresAt = new Date(Date.now() + SANDBOX_TIMEOUT_IN_MS);
        return prisma.$transaction(async (tx) => {
          await tx.previewSession.updateMany({
            where: { fragmentId: fragment.id, status: { in: ["STARTING", "READY"] } },
            data: { status: "EXPIRED" },
          });
          const session = await tx.previewSession.create({
            data: { fragmentId: fragment.id, sandboxId: sandbox.sandboxId, url, status: "READY", expiresAt },
          });
          await tx.fragment.update({ where: { id: fragment.id }, data: { sandboxUrl: url } });
          return session;
        });
      } catch (error) {
        try { await sandbox.kill(); } catch { /* Already terminated. */ }
        throw error;
      }
    }),
});
