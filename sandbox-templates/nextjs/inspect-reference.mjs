import { readFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { chromium } from "playwright-core";

const requestPath = process.argv[2];
if (!requestPath) throw new Error("Inspection request path is required.");

const request = JSON.parse(await readFile(requestPath, "utf8"));
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: [
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    "--no-sandbox",
  ],
});

const trim = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
const excludedPath = /\/(?:login|sign-in|signup|sign-up|account|admin|checkout|cart|privacy|terms)(?:\/|$)/i;
const excludedExtension = /\.(?:pdf|zip|png|jpe?g|gif|webp|svg|mp4|mp3|docx?|xlsx?)(?:$|\?)/i;
const publicHostCache = new Map();
const isPublicAddress = (address) => {
  const parsed = ipaddr.parse(address);
  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) return parsed.toIPv4Address().range() === "unicast";
  return parsed.range() === "unicast";
};
const isSafeRequestUrl = async (rawUrl, allowLocal) => {
  let url;
  try { url = new URL(rawUrl); } catch { return false; }
  if (["data:", "blob:", "about:"].includes(url.protocol)) return true;
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const allowedPorts = allowLocal ? ["80", "443", "3000"] : ["80", "443"];
  if (url.username || url.password || (url.port && !allowedPorts.includes(url.port))) return false;
  if (allowLocal && ["127.0.0.1", "localhost"].includes(url.hostname)) return true;
  if (publicHostCache.has(url.hostname)) return publicHostCache.get(url.hostname);
  try {
    const addresses = ipaddr.isValid(url.hostname)
      ? [{ address: url.hostname }]
      : await lookup(url.hostname, { all: true, verbatim: true });
    const safe = addresses.length > 0 && addresses.every(({ address }) => isPublicAddress(address));
    publicHostCache.set(url.hostname, safe);
    return safe;
  } catch {
    publicHostCache.set(url.hostname, false);
    return false;
  }
};
const applySafeRouting = async (context, allowLocal) => {
  await context.route("**/*", async (route) => {
    if (await isSafeRequestUrl(route.request().url(), allowLocal)) await route.continue();
    else await route.abort("blockedbyclient");
  });
};
const robotsAllows = async (targetUrl) => {
  const target = new URL(targetUrl);
  const context = await browser.newContext({ serviceWorkers: "block", userAgent: "CodeGenieReferenceBot/1.0" });
  await applySafeRouting(context, false);
  const page = await context.newPage();
  try {
    const response = await page.goto(new URL("/robots.txt", target.origin).toString(), { waitUntil: "domcontentloaded", timeout: 8_000 });
    if (!response || response.status() === 404) return true;
    if (!response.ok()) return response.status() !== 401 && response.status() !== 403;
    const text = await page.locator("body").innerText().catch(() => "");
    let applies = false;
    const rules = [];
    for (const rawLine of text.split("\n")) {
      const line = rawLine.replace(/#.*$/, "").trim();
      if (!line) continue;
      const separator = line.indexOf(":");
      if (separator < 0) continue;
      const name = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();
      if (name === "user-agent") applies = value === "*" || /codegenie/i.test(value);
      if (applies && (name === "allow" || name === "disallow") && value) rules.push({ name, value });
    }
    const path = `${target.pathname}${target.search}`;
    const matching = rules.filter((rule) => path.startsWith(rule.value)).sort((left, right) => right.value.length - left.value.length);
    return matching.length === 0 || matching[0].name === "allow";
  } catch {
    return true;
  } finally {
    await context.close();
  }
};
const normalizeRoute = (pathname) => {
  const segments = pathname.split("/").filter(Boolean).slice(0, 3).map((segment) =>
    decodeURIComponent(segment).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
  ).filter(Boolean);
  return segments.length ? `/${segments.join("/")}` : "/";
};

const capture = async (url, viewport, allowLocal = false) => {
  const context = await browser.newContext({
    viewport,
    javaScriptEnabled: true,
    serviceWorkers: "block",
    acceptDownloads: false,
    userAgent: "CodeGenieReferenceBot/1.0",
  });
  await applySafeRouting(context, allowLocal);
  const page = await context.newPage();
  context.on("page", (popup) => {
    if (popup !== page) popup.close().catch(() => undefined);
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}" }).catch(() => undefined);
    await page.waitForTimeout(500);
    const snapshot = await page.evaluate(() => {
      const clean = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
      const visible = (element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 1 && box.height > 1;
      };
      const label = (element) => clean(
        element.getAttribute("aria-label") || element.textContent || element.getAttribute("placeholder") || element.getAttribute("type"),
        160,
      );
      const candidates = Array.from(document.querySelectorAll("header, main > section, main > div, body > section, footer"));
      const sections = candidates.filter(visible).slice(0, 12).map((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          heading: clean(element.querySelector("h1,h2,h3")?.textContent, 240),
          text: clean(element.textContent, 600),
          role: element.getAttribute("role") || element.tagName.toLowerCase(),
          top: Math.round(box.top + scrollY),
          height: Math.round(box.height),
          width: Math.round(box.width),
          backgroundColor: clean(style.backgroundColor, 80),
          color: clean(style.color, 80),
          fontFamily: clean(style.fontFamily, 240),
          fontSize: clean(style.fontSize, 40),
          borderRadius: clean(style.borderRadius, 80),
        };
      });
      const sampled = Array.from(document.querySelectorAll("body *")).filter(visible).slice(0, 180);
      const colors = [];
      const fonts = [];
      for (const element of sampled) {
        const style = getComputedStyle(element);
        for (const color of [style.color, style.backgroundColor, style.borderColor]) {
          if (color && color !== "rgba(0, 0, 0, 0)" && !colors.includes(color)) colors.push(color);
        }
        if (style.fontFamily && !fonts.includes(style.fontFamily)) fonts.push(style.fontFamily);
      }
      return {
        title: clean(document.title, 300),
        description: clean(document.querySelector('meta[name="description"]')?.getAttribute("content"), 600),
        url: location.href,
        headings: Array.from(document.querySelectorAll("h1,h2,h3")).filter(visible).map(label).filter(Boolean).slice(0, 20),
        navigation: Array.from(document.querySelectorAll("nav a, header a")).filter(visible).map(label).filter(Boolean).slice(0, 20),
        controls: Array.from(document.querySelectorAll("button,input,select,textarea,[role=button]")).filter(visible).map((element) => `${element.tagName.toLowerCase()}:${label(element)}`).filter((value) => value.length > 1).slice(0, 30),
        sections,
        colors: colors.slice(0, 16),
        fonts: fonts.slice(0, 8),
        links: Array.from(document.querySelectorAll("a[href]")).map((anchor) => ({
          href: anchor.href,
          text: label(anchor),
          priority: anchor.closest("nav,header") ? 3 : anchor.closest("main") ? 2 : 1,
        })).slice(0, 200),
      };
    });
    return { ...snapshot, viewport };
  } finally {
    await context.close();
  }
};

const makePage = async (url, route, allowLocal = false) => {
  const desktopRaw = await capture(url, { width: 1440, height: 900 }, allowLocal);
  const mobileRaw = await capture(desktopRaw.url, { width: 390, height: 844 }, allowLocal);
  const { links, title, description, url: finalUrl, ...desktop } = desktopRaw;
  const { links: _mobileLinks, title: _mobileTitle, description: _mobileDescription, url: _mobileUrl, ...mobile } = mobileRaw;
  return {
    page: { url: finalUrl, route, title, description, desktop, mobile },
    links,
  };
};

const referenceMode = async () => {
  const maxPages = Math.max(1, Math.min(Number(request.maxPages) || 1, 3));
  if (!(await robotsAllows(request.seedUrl))) throw new Error("Reference URL is disallowed by robots.txt.");
  const seed = await makePage(request.seedUrl, "/");
  const origin = new URL(seed.page.url).origin;
  const ranked = seed.links
    .map((link) => {
      try {
        const url = new URL(link.href);
        url.hash = "";
        return { ...link, url };
      } catch { return null; }
    })
    .filter(Boolean)
    .filter(({ url }) => url.origin === origin && !url.search && url.pathname !== "/" && !excludedPath.test(url.pathname) && !excludedExtension.test(url.pathname))
    .sort((left, right) => right.priority - left.priority);
  const selected = [];
  const seen = new Set([new URL(seed.page.url).pathname]);
  for (const candidate of ranked) {
    if (seen.has(candidate.url.pathname)) continue;
    seen.add(candidate.url.pathname);
    selected.push(candidate.url);
    if (selected.length >= maxPages - 1) break;
  }
  const pages = [seed.page];
  const failures = [];
  for (const url of selected) {
    try {
      if (!(await robotsAllows(url))) {
        failures.push(`Inspection is disallowed for ${trim(url.pathname, 160)}.`);
        continue;
      }
      const captured = await makePage(url.toString(), normalizeRoute(url.pathname));
      pages.push(captured.page);
    } catch {
      failures.push(`Could not inspect ${trim(url.pathname, 160)}.`);
    }
  }
  return { canonicalOrigin: origin, pages, failures };
};

const generatedMode = async () => {
  const origin = new URL(request.baseUrl).origin;
  const pages = [];
  const failures = [];
  for (const route of request.routes.slice(0, 3)) {
    try {
      const captured = await makePage(new URL(route, origin).toString(), route, true);
      pages.push({ ...captured.page, route });
    } catch {
      failures.push(`Could not inspect generated route ${trim(route, 160)}.`);
    }
  }
  if (pages.length === 0) throw new Error("No generated routes could be inspected.");
  return { canonicalOrigin: origin, pages, failures };
};

try {
  const result = request.mode === "generated" ? await generatedMode() : await referenceMode();
  process.stdout.write(JSON.stringify(result));
} finally {
  await browser.close();
}
