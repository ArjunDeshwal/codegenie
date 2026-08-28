import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("generation worker contract includes concurrency, cancellation, and terminal failure handling", () => {
  const source = readFileSync("src/inngest/functions.ts", "utf8");
  assert.match(source, /concurrency:\s*\{\s*limit:\s*1/);
  assert.match(source, /cancelOn:/);
  assert.match(source, /onFailure:/);
  assert.match(source, /failGeneration/);
  assert.match(source, /claimGenerationStart/);
});

test("dispatch events contain identifiers rather than prompt content", () => {
  const source = readFileSync("src/lib/generations.ts", "utf8");
  const dispatch = source.slice(source.indexOf("export const dispatchGeneration"), source.indexOf("export const refundReservation"));
  assert.match(dispatch, /data:\s*\{\s*generationId,\s*projectId\s*\}/);
  assert.doesNotMatch(dispatch, /prompt|content|value/);
});

test("the additive migration preserves and classifies historical prompts", () => {
  const migration = readFileSync("prisma/migrations/20260822090000_generation_pipeline_v2/migration.sql", "utf8");
  assert.match(migration, /LEGACY_ORPHANED/);
  assert.match(migration, /INSERT INTO "Generation"/);
  assert.match(migration, /Project_activeGenerationId_key/);
});

test("stale queued generations fail clearly and refund their reservation", () => {
  const source = readFileSync("src/lib/generations.ts", "utf8");
  assert.match(source, /reconcileStaleQueuedGenerations/);
  assert.match(source, /WORKER_UNAVAILABLE/);
  assert.match(source, /refundReservation/);
  assert.match(source, /activeGenerationId: null/);
});

test("the Inngest route serves the current generation and cancellation workers", () => {
  const source = readFileSync("src/app/api/inngest/route.ts", "utf8");
  assert.match(source, /codeAgentFunction/);
  assert.match(source, /cancelGenerationFunction/);
});

test("unlimited credits are controlled by Clerk private metadata", () => {
  const usageSource = readFileSync("src/lib/usage.ts", "utf8");
  const accessSource = readFileSync("src/lib/credit-access.ts", "utf8");
  assert.match(usageSource, /privateMetadata/);
  assert.match(accessSource, /codegenieUnlimitedCredits/);
});

test("readFiles guidance and validation agree on relative workspace paths", () => {
  const prompt = readFileSync("src/prompt.ts", "utf8");
  const worker = readFileSync("src/inngest/functions.ts", "utf8");
  assert.doesNotMatch(prompt, /readFiles[^\n]*\/home\/user/);
  assert.match(prompt, /components\/ui\/button\.tsx/);
  assert.match(worker, /READ_ERROR:/);
});
