import assert from "node:assert/strict";
import test from "node:test";

import {
  GENERATION_QUEUE_TIMEOUT_MS,
  canTransitionGeneration,
  isQueuedGenerationStale,
} from "./generation-state";

test("generation terminal states cannot be reopened", () => {
  for (const status of ["SUCCEEDED", "FAILED", "CANCELLED"] as const) {
    assert.equal(canTransitionGeneration(status, "RUNNING"), false);
  }
});

test("queued and running generations support cancellation and failure", () => {
  assert.equal(canTransitionGeneration("QUEUED", "CANCEL_REQUESTED"), true);
  assert.equal(canTransitionGeneration("RUNNING", "FAILED"), true);
  assert.equal(canTransitionGeneration("CANCEL_REQUESTED", "CANCELLED"), true);
});

test("a queued generation becomes stale after two minutes", () => {
  const now = new Date("2026-08-28T10:00:00.000Z");
  assert.equal(
    isQueuedGenerationStale(
      {
        status: "QUEUED",
        stage: "QUEUED",
        createdAt: new Date(now.getTime() - GENERATION_QUEUE_TIMEOUT_MS),
      },
      now,
    ),
    true,
  );
  assert.equal(
    isQueuedGenerationStale(
      {
        status: "RUNNING",
        stage: "PREPARING",
        createdAt: new Date(now.getTime() - GENERATION_QUEUE_TIMEOUT_MS * 2),
      },
      now,
    ),
    false,
  );
});
