const MAX_REFERENCE_URL_LENGTH = 2_048;
const urlPattern = /https?:\/\/[^\s<>"'`]+/i;

export const normalizeReferenceUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_REFERENCE_URL_LENGTH) {
    throw new Error("Reference URL is missing or too long.");
  }
  const url = new URL(trimmed);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Reference URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("Reference URLs cannot include credentials.");
  }
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new Error("Reference URLs can only use ports 80 or 443.");
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("Reference URL must be a public website.");
  }
  url.hash = "";
  return url.toString();
};

export const extractReferenceUrl = (
  prompt: string,
  explicitReferenceUrl?: string | null,
) => {
  if (explicitReferenceUrl === null) return null;
  const candidate = explicitReferenceUrl || prompt.match(urlPattern)?.[0];
  if (!candidate) return null;
  return normalizeReferenceUrl(candidate.replace(/[),.;!?]+$/, ""));
};

export const removeReferenceUrl = (prompt: string) =>
  prompt.replace(urlPattern, "").replace(/\s{2,}/g, " ").trim();
