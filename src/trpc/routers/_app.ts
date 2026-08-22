import { messagesRouter } from "@/modules/messages/server/procedures";
import { projectsRouter } from "@/modules/projects/server/procedures";
import { usageRouter } from "@/modules/usage/server/procedure";
import { generationsRouter } from "@/modules/generations/server/procedures";
import { previewsRouter } from "@/modules/previews/server/procedures";
import { createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  projects: projectsRouter,
  usage: usageRouter,
  generations: generationsRouter,
  previews: previewsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
