import type { GenerationStatus } from "@/generated/prisma";

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
