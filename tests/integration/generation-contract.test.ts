import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("generation worker contract includes concurrency, cancellation, and terminal failure handling", () => {
  const source = readFileSync("src/inngest/functions.ts", "utf8");
  assert.match(source, /concurrency:\s*\{\s*limit:\s*1/);
  assert.match(source, /cancelOn:/);
  assert.match(source, /onFailure:/);
  assert.match(source, /failGeneration/);
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
