import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";

import type { Sandbox } from "@e2b/code-interpreter";
import ipaddr from "ipaddr.js";
import { z } from "zod";

import { extractReferenceUrl, normalizeReferenceUrl } from "@/lib/reference-url";

const MAX_REFERENCE_URL_LENGTH = 2_048;
const MAX_REFERENCE_CONTEXT_LENGTH = 32_000;
const REFERENCE_REQUEST_PATH = "/tmp/codegenie-reference-request.json";
const GENERATED_REQUEST_PATH = "/tmp/codegenie-generated-request.json";
const INSPECTOR_SCRIPT_PATH = "/home/user/.codegenie/inspect-reference.mjs";

const colorSchema = z.string().max(80);
const sectionSchema = z.object({
  heading: z.string().max(240),
  text: z.string().max(600),
  role: z.string().max(80),
  top: z.number(),
  height: z.number(),
  width: z.number(),
  backgroundColor: colorSchema,
  color: colorSchema,
  fontFamily: z.string().max(240),
  fontSize: z.string().max(40),
  borderRadius: z.string().max(80),
}).strip();

const viewportSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  headings: z.array(z.string().max(240)).max(20),
  navigation: z.array(z.string().max(160)).max(20),
  controls: z.array(z.string().max(160)).max(30),
  sections: z.array(sectionSchema).max(12),
  colors: z.array(colorSchema).max(16),
  fonts: z.array(z.string().max(240)).max(8),
}).strip();

export const inspectedPageSchema = z.object({
  url: z.string().url().max(MAX_REFERENCE_URL_LENGTH),
  route: z.string().startsWith("/").max(240),
  title: z.string().max(300),
  description: z.string().max(600),
  desktop: viewportSchema,
  mobile: viewportSchema,
}).strip();

export const websiteInspectionResultSchema = z.object({
  canonicalOrigin: z.string().url().max(MAX_REFERENCE_URL_LENGTH),
  pages: z.array(inspectedPageSchema).min(1).max(3),
  failures: z.array(z.string().max(300)).max(3).default([]),
}).strip();

export type InspectedPage = z.infer<typeof inspectedPageSchema>;
export type WebsiteInspectionResult = z.infer<typeof websiteInspectionResultSchema>;

export interface WebsiteQualityReport {
  score: number;
  band: "HIGH" | "MEDIUM" | "NEEDS_REFINEMENT";
  differences: string[];
  routeScores: Array<{ route: string; score: number }>;
}

export { extractReferenceUrl, normalizeReferenceUrl };

const isPublicAddress = (address: string) => {
  const parsed = ipaddr.parse(address);
  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
    return parsed.toIPv4Address().range() === "unicast";
  }
  return parsed.range() === "unicast";
};

export const assertPublicReferenceUrl = async (
  rawUrl: string,
  resolver: typeof lookup = lookup,
) => {
  const normalized = normalizeReferenceUrl(rawUrl);
  const url = new URL(normalized);
  if (ipaddr.isValid(url.hostname)) {
    if (!isPublicAddress(url.hostname)) throw new Error("Reference URL must be public.");
    return normalized;
  }
  const addresses = await resolver(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Reference URL resolved to a non-public address.");
  }
  return normalized;
};

const runInspector = async (
  sandbox: Sandbox,
  requestPath: string,
  request: Record<string, unknown>,
) => {
  await sandbox.files.write(requestPath, JSON.stringify(request));
  const command = await sandbox.commands.run(
    `node ${INSPECTOR_SCRIPT_PATH} ${requestPath}`,
    { timeoutMs: 100_000 },
  );
  const parsed = JSON.parse(command.stdout.trim()) as unknown;
  return websiteInspectionResultSchema.parse(parsed);
};

export const inspectWebsite = async (sandbox: Sandbox, seedUrl: string) => {
  const safeUrl = await assertPublicReferenceUrl(seedUrl);
  return runInspector(sandbox, REFERENCE_REQUEST_PATH, {
    mode: "reference",
    seedUrl: safeUrl,
    maxPages: 3,
  });
};

export const inspectGeneratedRoutes = async (
  sandbox: Sandbox,
  routes: string[],
) => runInspector(sandbox, GENERATED_REQUEST_PATH, {
  mode: "generated",
  baseUrl: "http://127.0.0.1:3000",
  routes: routes.slice(0, 3),
});

const ratioScore = (left: number, right: number) => {
  if (left === right) return 1;
  if (left === 0 || right === 0) return 0;
  return Math.min(left, right) / Math.max(left, right);
};

const overlapScore = (left: string[], right: string[]) => {
  const a = new Set(left.map((value) => value.toLowerCase()));
  const b = new Set(right.map((value) => value.toLowerCase()));
  if (a.size === 0 && b.size === 0) return 1;
  const overlap = [...a].filter((value) => b.has(value)).length;
  return overlap / Math.max(a.size, b.size, 1);
};

const comparePage = (reference: InspectedPage, generated?: InspectedPage) => {
  if (!generated) return { score: 0, differences: [`Missing generated route ${reference.route}.`] };
  const differences: string[] = [];
  const hierarchy = (
    ratioScore(reference.desktop.sections.length, generated.desktop.sections.length) +
    ratioScore(reference.desktop.headings.length, generated.desktop.headings.length)
  ) / 2;
  const controlTypes = (values: string[]) => values.map((value) => value.split(":", 1)[0]);
  const components = overlapScore(
    controlTypes(reference.desktop.controls),
    controlTypes(generated.desktop.controls),
  );
  const colors = overlapScore(reference.desktop.colors, generated.desktop.colors);
  const fonts = overlapScore(reference.desktop.fonts, generated.desktop.fonts);
  const responsive = (
    ratioScore(reference.mobile.sections.length, generated.mobile.sections.length) +
    ratioScore(reference.mobile.navigation.length, generated.mobile.navigation.length)
  ) / 2;
  const score = Math.round((hierarchy * 30) + (components * 20) + (colors * 20) + (fonts * 15) + (responsive * 15));
  if (hierarchy < 0.75) differences.push(`${reference.route}: section or heading hierarchy differs.`);
  if (components < 0.6) differences.push(`${reference.route}: controls and interactions differ.`);
  if (colors < 0.45) differences.push(`${reference.route}: dominant colours differ.`);
  if (fonts < 0.5) differences.push(`${reference.route}: typography differs.`);
  if (responsive < 0.7) differences.push(`${reference.route}: mobile structure differs.`);
  return { score, differences };
};

export const compareWebsiteInspections = (
  reference: WebsiteInspectionResult,
  generated: WebsiteInspectionResult,
): WebsiteQualityReport => {
  const routeScores = reference.pages.map((page) => {
    const comparison = comparePage(page, generated.pages.find((candidate) => candidate.route === page.route));
    return { route: page.route, ...comparison };
  });
  const score = Math.round(routeScores.reduce((total, route) => total + route.score, 0) / routeScores.length);
  return {
    score,
    band: score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "NEEDS_REFINEMENT",
    differences: routeScores.flatMap((route) => route.differences).slice(0, 6),
    routeScores: routeScores.map(({ route, score: routeScore }) => ({ route, score: routeScore })),
  };
};

export const websiteInspectionHash = (result: WebsiteInspectionResult) =>
  createHash("sha256").update(JSON.stringify(result)).digest("hex");

export const buildReferenceContext = (result: WebsiteInspectionResult) => {
  const context = structuredClone({
    policy: "Create an original recreation. Do not copy logos, branded text, source code, or hotlink source assets.",
    canonicalOrigin: result.canonicalOrigin,
    routes: result.pages.map((page) => page.route),
    pages: result.pages,
  });
  let compact = JSON.stringify(context);
  while (compact.length > MAX_REFERENCE_CONTEXT_LENGTH) {
    let reduced = false;
    for (const page of context.pages) {
      for (const viewport of [page.desktop, page.mobile]) {
        for (const values of [viewport.sections, viewport.controls, viewport.headings, viewport.navigation, viewport.colors]) {
          if (values.length > 4) {
            values.pop();
            reduced = true;
          }
        }
      }
    }
    if (!reduced) break;
    compact = JSON.stringify(context);
  }
  return compact;
};
