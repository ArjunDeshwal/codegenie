import { createHash } from "node:crypto";

import { Sandbox } from "@e2b/code-interpreter";
import * as Sentry from "@sentry/nextjs";
import { createAgent, createNetwork, createState, createTool, type Message, openai, type Tool } from "@inngest/agent-kit";
import { z } from "zod";

import { SANDBOX_TIMEOUT_IN_MS } from "@/constants";
import { FailureCode, GenerationStage } from "@/generated/prisma";
import {
  claimGenerationStart,
  failGeneration,
  FALLBACK_MODEL,
  PRIMARY_MODEL,
  updateGenerationStage,
} from "@/lib/generations";
import prisma from "@/lib/prisma";
import { PROMPT } from "@/prompt";
import type { FileCollection } from "@/types";
import { generatedFilesInputSchema, generatedFilesToolMessage, validateReadPaths, writeGeneratedFiles } from "./generated-files";
import { inngest } from "./client";
import { validateSandboxPreview, validationMessage } from "./sandbox-health";
import { getSandbox } from "./utils";

interface AgentState {
  title: string;
  summary: string;
  files: FileCollection;
  changedPaths: string[];
  previewValidated: boolean;
  operationCount: number;
}

const model = (modelName: string) => openai({
  model: modelName,
  apiKey: process.env.TOKENROUTER_API_KEY,
  baseUrl: process.env.TOKENROUTER_BASE_URL || "https://api.tokenrouter.com/v1/",
  defaultParameters: { temperature: 0.1 },
});

const userFailure = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/sandbox|e2b/i.test(message)) return [FailureCode.SANDBOX_FAILED, "The preview environment could not be prepared. Retry the build."] as const;
  if (/token|model|openai|fetch|timeout/i.test(message)) return [FailureCode.MODEL_FAILED, "The code model did not complete the build. Your credit was refunded."] as const;
  return [FailureCode.INTERNAL, "The build stopped unexpectedly. Your credit was refunded."] as const;
};

const killSandbox = async (sandboxId: string | null | undefined) => {
  if (!sandboxId) return;
  try { await Sandbox.kill(sandboxId); } catch { /* Already expired or terminated. */ }
};

const collectArtifactFiles = async (sandbox: Sandbox, overrides: FileCollection) => {
  const collected: FileCollection = { ...overrides };
  const queue = ["app/layout.tsx", "app/globals.css", "lib/utils.ts", ...Object.keys(overrides)];
  const visited = new Set<string>();
  const importPattern = /from\s+["']@\/(components|lib)\/([^"']+)["']/g;

  while (queue.length > 0 && Object.keys(collected).length < 80) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    if (!collected[path]) {
      try { collected[path] = String(await sandbox.files.read(path)); } catch { continue; }
    }
    for (const match of collected[path].matchAll(importPattern)) {
      const base = `${match[1]}/${match[2]}`;
      for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]) {
        if (!visited.has(candidate)) queue.push(candidate);
      }
    }
  }
  return collected;
};

const makeAgent = (sandboxId: string, selectedModel: string) => createAgent<AgentState>({
  name: `code-agent-${selectedModel.replace(/[^a-z0-9]/gi, "-")}`,
  description: "A constrained frontend coding agent",
  system: PROMPT,
  model: model(selectedModel),
  tools: [
    createTool({
      name: "createOrUpdateFiles",
      description: "Create or update frontend source files in approved directories.",
      parameters: generatedFilesInputSchema,
      handler: async ({ files }, { step, network }: Tool.Options<AgentState>) => {
        network.state.data.operationCount += 1;
        const result = await step?.run(`write-files-${network.state.data.operationCount}`, async () =>
          writeGeneratedFiles(await getSandbox(sandboxId), network.state.data.files, files));
        if (!result) return "WRITE_ERROR: The write did not run.";
        network.state.data.files = result.files;
        network.state.data.changedPaths = Array.from(new Set([...network.state.data.changedPaths, ...result.writtenPaths]));
        network.state.data.previewValidated = false;
        return generatedFilesToolMessage(result);
      },
    }),
    createTool({
      name: "readFiles",
      description: "Read approved frontend source files.",
      parameters: z.object({ files: z.array(z.string()).min(1).max(20) }),
      handler: async ({ files }, { step, network }) => {
        let safePaths: string[];
        try {
          safePaths = validateReadPaths(files);
        } catch (error) {
          const message = error instanceof z.ZodError
            ? error.issues.map((issue) => issue.message).join(" ")
            : "Invalid file path.";
          return `READ_ERROR: ${message} Use paths relative to /home/user, such as components/ui/button.tsx.`;
        }
        network.state.data.operationCount += 1;
        return step?.run(`read-files-${network.state.data.operationCount}`, async () => {
          const sandbox = await getSandbox(sandboxId);
          const contents = await Promise.all(safePaths.map(async (path) => ({ path, content: await sandbox.files.read(path) })));
          return JSON.stringify(contents).slice(0, 80_000);
        });
      },
    }),
    createTool({
      name: "deleteFiles",
      description: "Delete approved frontend source files.",
      parameters: z.object({ files: z.array(z.string()).min(1).max(20) }),
      handler: async ({ files }, { step, network }) => {
        const safePaths = validateReadPaths(files);
        network.state.data.operationCount += 1;
        await step?.run(`delete-files-${network.state.data.operationCount}`, async () => {
          const sandbox = await getSandbox(sandboxId);
          await Promise.all(safePaths.map((path) => sandbox.files.remove(path)));
        });
        for (const path of safePaths) delete network.state.data.files[path];
        network.state.data.changedPaths = Array.from(new Set([...network.state.data.changedPaths, ...safePaths]));
        network.state.data.previewValidated = false;
        return `FILES_DELETED: ${safePaths.join(", ")}`;
      },
    }),
    createTool({
      name: "validateApp",
      description: "Compile and probe the generated application.",
      parameters: z.object({}),
      handler: async (_input, { step, network }) => {
        if (network.state.data.changedPaths.length === 0 || !network.state.data.files["app/page.tsx"]) {
          network.state.data.previewValidated = false;
          return "VALIDATION_ERROR: A meaningful app/page.tsx change is required.";
        }
        network.state.data.operationCount += 1;
        const result = await step?.run(`validate-app-${network.state.data.operationCount}`, async () =>
          validateSandboxPreview(await getSandbox(sandboxId)));
        network.state.data.previewValidated = Boolean(result?.ok);
        return result ? validationMessage(result) : "VALIDATION_ERROR: Validation did not run.";
      },
    }),
    createTool({
      name: "completeGeneration",
      description: "Finish after validation with a short title and user summary.",
      parameters: z.object({ title: z.string().trim().min(1).max(60), summary: z.string().trim().min(1).max(600) }),
      handler: async ({ title, summary }, { network }) => {
        if (!network.state.data.previewValidated || network.state.data.changedPaths.length === 0) {
          return "COMPLETION_REJECTED: Call validateApp successfully after the final file change.";
        }
        network.state.data.title = title;
        network.state.data.summary = summary;
        return "GENERATION_COMPLETE";
      },
    }),
  ],
});

const runAgent = async ({ sandboxId, prompt, selectedModel, state, maxIter }: {
  sandboxId: string;
  prompt: string;
  selectedModel: string;
  state: ReturnType<typeof createState<AgentState>>;
  maxIter: number;
}) => {
  const agent = makeAgent(sandboxId, selectedModel);
  const network = createNetwork<AgentState>({
    name: `generation-${selectedModel}`,
    agents: [agent],
    maxIter,
    defaultState: state,
    router: ({ network }) => network.state.data.summary && network.state.data.previewValidated ? undefined : agent,
  });
  await network.run(prompt, { state });
};

export const codeAgentFunction = inngest.createFunction(
  {
    id: "code-agent-v2",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.projectId" },
    cancelOn: [{ event: "codegenie/generation.cancelled", if: "async.data.generationId == event.data.generationId" }],
    onFailure: async ({ event }) => {
      const original = event.data.event as { data?: { generationId?: string } };
      if (!original.data?.generationId) return;
      const generation = await prisma.generation.findUnique({ where: { id: original.data.generationId } });
      const [code, message] = userFailure(event.data.error);
      Sentry.captureException(event.data.error, { tags: {
        generationId: original.data.generationId,
        stage: generation?.stage,
        model: generation?.fallbackUsed ? generation.fallbackModel : generation?.primaryModel,
        failureCode: code,
      } });
      await killSandbox(generation?.sandboxId);
      await failGeneration(original.data.generationId, code, message);
    },
  },
  { event: "codegenie/generation.requested" },
  async ({ event, step }) => {
    const generationId = String(event.data.generationId);
    const generation = await step.run("load-generation", () => prisma.generation.findUnique({
      where: { id: generationId },
      include: { promptMessage: true, baseFragment: true },
    }));
    if (!generation || ["CANCELLED", "SUCCEEDED", "FAILED"].includes(generation.status)) return;

    const claimed = await step.run("mark-preparing", () =>
      claimGenerationStart(generationId));
    if (!claimed) return;
    const sandboxId = await step.run("create-sandbox", async () => {
      const sandbox = await Sandbox.create("codegenie-nextjs");
      await sandbox.setTimeout(SANDBOX_TIMEOUT_IN_MS);
      await prisma.generation.update({ where: { id: generationId }, data: { sandboxId: sandbox.sandboxId } });
      return sandbox.sandboxId;
    });

    const baseFiles = (generation.baseFragment?.files || {}) as FileCollection;
    if (Object.keys(baseFiles).length > 0) {
      await step.run("restore-artifact", async () => {
        await updateGenerationStage(generationId, GenerationStage.RESTORING);
        const sandbox = await getSandbox(sandboxId);
        for (const [path, content] of Object.entries(baseFiles)) await sandbox.files.write(path, content);
      });
    }

    const history = await step.run("load-history", async () => {
      const rows = await prisma.message.findMany({
        where: { projectId: generation.projectId, id: { not: generation.promptMessageId } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 6,
      });
      return rows.reverse().map<Message>((message) => ({
        type: "text", role: message.role === "ASSISTANT" ? "assistant" : "user", content: message.content,
      }));
    });
    const state = createState<AgentState>({
      title: "", summary: "", files: baseFiles, changedPaths: [], previewValidated: false, operationCount: 0,
    }, { messages: history });

    await step.run("mark-generating", () => updateGenerationStage(generationId, GenerationStage.GENERATING));
    await runAgent({ sandboxId, prompt: generation.promptMessage.content, selectedModel: generation.primaryModel || PRIMARY_MODEL, state, maxIter: 10 });
    await step.run("mark-validating", () => updateGenerationStage(generationId, GenerationStage.VALIDATING));
    let validation = await step.run("final-validation-primary", async () => {
      if (state.data.changedPaths.length === 0 || !state.data.files["app/page.tsx"]) return { ok: false, restarted: false, error: "No meaningful page artifact was generated." };
      return validateSandboxPreview(await getSandbox(sandboxId));
    });

    if ((!validation.ok || !state.data.summary) && generation.fallbackModel) {
      await step.run("mark-repairing", () => updateGenerationStage(generationId, GenerationStage.REPAIRING, { fallbackUsed: true }));
      state.data.summary = ""; state.data.title = ""; state.data.previewValidated = false;
      await runAgent({
        sandboxId,
        prompt: `Finish or repair the current application. The primary model did not complete successfully: ${validation.error || "the structured completion was missing"}. Inspect existing files, make the minimum complete fix, validate, then call completeGeneration.`,
        selectedModel: generation.fallbackModel || FALLBACK_MODEL,
        state, maxIter: 6,
      });
      validation = await step.run("final-validation-fallback", async () => validateSandboxPreview(await getSandbox(sandboxId)));
    }

    const current = await prisma.generation.findUnique({ where: { id: generationId } });
    if (!current || ["CANCELLED", "CANCEL_REQUESTED"].includes(current.status)) { await killSandbox(sandboxId); return; }
    if (!validation.ok || !state.data.summary || state.data.changedPaths.length === 0) {
      Sentry.captureMessage("Generated artifact failed final validation", { level: "warning", tags: {
        generationId, stage: GenerationStage.VALIDATING, model: current.fallbackUsed ? current.fallbackModel : current.primaryModel,
        failureCode: FailureCode.VALIDATION_FAILED,
      } });
      await killSandbox(sandboxId);
      await failGeneration(generationId, FailureCode.VALIDATION_FAILED, `The generated app did not pass validation: ${(validation.error || "unknown error").slice(0, 500)}`);
      return;
    }

    await step.run("save-artifact", async () => {
      await updateGenerationStage(generationId, GenerationStage.SAVING);
      const sandbox = await getSandbox(sandboxId);
      const artifactFiles = await collectArtifactFiles(sandbox, state.data.files);
      const filesJson = JSON.stringify(artifactFiles);
      const checksum = createHash("sha256").update(filesJson).digest("hex");
      const sandboxUrl = `https://${sandbox.getHost(3000)}`;
      const expiresAt = new Date(Date.now() + SANDBOX_TIMEOUT_IN_MS);
      await prisma.$transaction(async (tx) => {
        const resultMessage = await tx.message.create({
          data: {
            projectId: generation.projectId, content: state.data.summary, role: "ASSISTANT", type: "RESULT",
            fragment: { create: {
              sandboxUrl, title: state.data.title || "Generated App", files: artifactFiles,
              templateVersion: "codegenie-nextjs-v1", checksum, byteSize: Buffer.byteLength(filesJson), isRestorable: true,
              previewSessions: { create: { sandboxId, url: sandboxUrl, status: "READY", expiresAt } },
            } },
          }, include: { fragment: true },
        });
        await tx.creditReservation.updateMany({ where: { generationId, status: "RESERVED" }, data: { status: "SETTLED", settledAt: new Date() } });
        await tx.generation.update({ where: { id: generationId }, data: {
          status: "SUCCEEDED", resultMessageId: resultMessage.id, fragmentId: resultMessage.fragment!.id, finishedAt: new Date(),
        } });
        await tx.project.update({ where: { id: generation.projectId }, data: { activeGenerationId: null, updatedAt: new Date() } });
      });
    });
  },
);

export const cancelGenerationFunction = inngest.createFunction(
  { id: "cancel-generation-sandbox", retries: 1 },
  { event: "codegenie/generation.cancelled" },
  async ({ event, step }) => {
    const generation = await step.run("load-cancelled-generation", () => prisma.generation.findUnique({ where: { id: event.data.generationId } }));
    await step.run("kill-cancelled-sandbox", () => killSandbox(generation?.sandboxId));
  },
);
