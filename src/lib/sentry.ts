import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const sensitiveKeys = /prompt|content|files|authorization|cookie|api[-_]?key|token|secret/i;

const scrub = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    sensitiveKeys.test(key) ? "[Filtered]" : scrub(child),
  ]));
};

export const beforeSend = (event: ErrorEvent, _hint: EventHint) => scrub(event) as ErrorEvent;
