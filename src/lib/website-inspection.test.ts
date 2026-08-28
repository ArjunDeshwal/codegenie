import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPublicReferenceUrl,
  compareWebsiteInspections,
  extractReferenceUrl,
  normalizeReferenceUrl,
  type WebsiteInspectionResult,
} from "./website-inspection";

test("extracts and normalizes one explicit website reference", () => {
  assert.equal(
    extractReferenceUrl("Clone https://example.com/pricing#plans, please"),
    "https://example.com/pricing",
  );
  assert.equal(extractReferenceUrl("Build a dashboard"), null);
  assert.equal(extractReferenceUrl("Clone https://example.com", null), null);
});

test("rejects unsafe reference URL shapes", () => {
  assert.throws(() => normalizeReferenceUrl("file:///etc/passwd"));
  assert.throws(() => normalizeReferenceUrl("https://user:pass@example.com"));
  assert.throws(() => normalizeReferenceUrl("http://localhost/admin"));
  assert.throws(() => normalizeReferenceUrl("https://example.com:8443"));
});

test("rejects addresses that resolve to private networks", async () => {
  const privateResolver = async () => [{ address: "127.0.0.1", family: 4 }];
  await assert.rejects(() => assertPublicReferenceUrl("https://example.com", privateResolver as never));
  const publicResolver = async () => [{ address: "93.184.216.34", family: 4 }];
  await assert.doesNotReject(() => assertPublicReferenceUrl("https://example.com", publicResolver as never));
});

const viewport = {
  width: 1440,
  height: 900,
  headings: ["Build faster"],
  navigation: ["Features", "Pricing"],
  controls: ["button:Get started"],
  sections: [{
    heading: "Build faster", text: "Product overview", role: "section", top: 0,
    height: 700, width: 1200, backgroundColor: "rgb(0, 0, 0)",
    color: "rgb(255, 255, 255)", fontFamily: "Inter", fontSize: "16px", borderRadius: "0px",
  }],
  colors: ["rgb(0, 0, 0)", "rgb(255, 255, 255)"],
  fonts: ["Inter"],
};

test("scores matching page briefs as high alignment", () => {
  const result: WebsiteInspectionResult = {
    canonicalOrigin: "https://example.com",
    failures: [],
    pages: [{
      url: "https://example.com/", route: "/", title: "Example", description: "",
      desktop: viewport, mobile: { ...viewport, width: 390, height: 844 },
    }],
  };
  const comparison = compareWebsiteInspections(result, result);
  assert.equal(comparison.score, 100);
  assert.equal(comparison.band, "HIGH");
});

test("reports a missing generated route as needing refinement", () => {
  const reference: WebsiteInspectionResult = {
    canonicalOrigin: "https://example.com",
    failures: [],
    pages: [
      { url: "https://example.com/", route: "/", title: "Home", description: "", desktop: viewport, mobile: { ...viewport, width: 390, height: 844 } },
      { url: "https://example.com/pricing", route: "/pricing", title: "Pricing", description: "", desktop: viewport, mobile: { ...viewport, width: 390, height: 844 } },
    ],
  };
  const generated: WebsiteInspectionResult = {
    canonicalOrigin: "http://127.0.0.1:3000",
    failures: [],
    pages: [reference.pages[0]],
  };
  const comparison = compareWebsiteInspections(reference, generated);
  assert.equal(comparison.band, "NEEDS_REFINEMENT");
  assert.match(comparison.differences.join(" "), /Missing generated route \/pricing/);
});
