import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  E2B_API_KEY: z.string().min(1),
  TOKENROUTER_API_KEY: z.string().min(1),
  TOKENROUTER_BASE_URL: z.string().url().default("https://api.tokenrouter.com/v1/"),
  TOKENROUTER_PRIMARY_MODEL: z.string().min(1).default("qwen/qwen3-coder-next"),
  TOKENROUTER_FALLBACK_MODEL: z.string().min(1).default("openai/gpt-5.4-mini"),
});

export const inspectServerEnv = () => {
  const result = serverSchema.safeParse(process.env);
  if (result.success) return { ok: true as const, missing: [] as string[] };
  return {
    ok: false as const,
    missing: result.error.issues.map((issue) => issue.path.join(".")).filter(Boolean),
  };
};
