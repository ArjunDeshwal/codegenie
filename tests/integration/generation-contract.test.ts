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

test("free generation allowance is shared by billing and pricing UI", () => {
  const planSource = readFileSync("src/lib/credit-plan.ts", "utf8");
  const generationSource = readFileSync("src/lib/generations.ts", "utf8");
  const usageSource = readFileSync("src/lib/usage.ts", "utf8");
  const pricingSource = readFileSync("src/app/(home)/pricing/page.tsx", "utf8");
  assert.match(planSource, /FREE_GENERATION_CREDITS\s*=\s*3/);
  assert.match(generationSource, /FREE_GENERATION_CREDITS/);
  assert.match(usageSource, /FREE_GENERATION_CREDITS/);
  assert.match(pricingSource, /FREE_GENERATION_CREDITS/);
});

test("readFiles guidance and validation agree on relative workspace paths", () => {
  const prompt = readFileSync("src/prompt.ts", "utf8");
  const worker = readFileSync("src/inngest/functions.ts", "utf8");
  assert.doesNotMatch(prompt, /readFiles[^\n]*\/home\/user/);
  assert.match(prompt, /components\/ui\/button\.tsx/);
  assert.match(worker, /READ_ERROR:/);
});

test("website references use durable inspection and one bounded quality repair", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const migration = readFileSync("prisma/migrations/20260828193000_website_inspection/migration.sql", "utf8");
  const worker = readFileSync("src/inngest/functions.ts", "utf8");
  const inspector = readFileSync("sandbox-templates/nextjs/inspect-reference.mjs", "utf8");
  assert.match(schema, /model WebsiteInspection/);
  assert.match(migration, /REFERENCE_UNAVAILABLE/);
  assert.match(worker, /inspectWebsite/);
  assert.match(worker, /compareWebsiteInspections/);
  assert.match(worker, /qualityRepairUsed: true/);
  assert.match(worker, /maxIter: 4/);
  assert.match(inspector, /maxPages/);
  assert.match(inspector, /robotsAllows/);
  assert.match(inspector, /isPublicAddress/);
});

test("reference recreation policy forbids copied branding and source assets", () => {
  const prompt = readFileSync("src/prompt.ts", "utf8");
  const inspection = readFileSync("src/lib/website-inspection.ts", "utf8");
  assert.match(prompt, /original recreations/i);
  assert.match(prompt, /never copy source code, logos, branded copy, or source asset URLs/i);
  assert.match(inspection, /Do not copy logos, branded text, source code, or hotlink source assets/);
});
