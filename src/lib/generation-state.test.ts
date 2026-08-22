import assert from "node:assert/strict";
import test from "node:test";

import { canTransitionGeneration } from "./generation-state";

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
