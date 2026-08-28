import type { GenerationStatus } from "@/generated/prisma";

export const GENERATION_QUEUE_TIMEOUT_MS = 2 * 60 * 1_000;

export const isQueuedGenerationStale = (
  generation: { status: GenerationStatus; stage: string; createdAt: Date },
  now = new Date(),
) =>
  generation.status === "QUEUED" &&
  generation.stage === "QUEUED" &&
  generation.createdAt.getTime() <= now.getTime() - GENERATION_QUEUE_TIMEOUT_MS;

const transitions: Record<GenerationStatus, GenerationStatus[]> = {
  QUEUED: ["RUNNING", "FAILED", "CANCEL_REQUESTED", "CANCELLED"],
  RUNNING: ["SUCCEEDED", "FAILED", "CANCEL_REQUESTED", "CANCELLED"],
  CANCEL_REQUESTED: ["CANCELLED", "FAILED"],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
};

export const canTransitionGeneration = (from: GenerationStatus, to: GenerationStatus) =>
  from === to || transitions[from].includes(to);
