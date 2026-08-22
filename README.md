# CodeGenie

CodeGenie is an AI engineering workspace that turns a product brief into a runnable Next.js application. It combines a conversational build loop with generated source files and a live sandbox preview.

## How it works

1. A user signs in with Clerk and describes a product.
2. tRPC stores the project and dispatches an Inngest event.
3. A durable generation job is dispatched to Inngest with per-project concurrency and cancellation.
4. TokenRouter runs Qwen Coder first and a configurable stronger repair model once when validation fails.
5. E2B runs the generated project in an isolated sandbox with constrained file tools and no arbitrary package installation.
6. CodeGenie validates and saves an immutable, downloadable artifact. Temporary previews can be recreated from it.

## Stack

- Next.js 15 and React 19
- Clerk authentication
- tRPC and TanStack Query
- Prisma with PostgreSQL
- Inngest background functions
- TokenRouter through the OpenAI-compatible Agent Kit adapter
- E2B cloud sandboxes
- Tailwind CSS, shadcn/ui, and AI Elements

## Local development

Use Node.js 22 and install dependencies:

```bash
nvm use
npm install
npx prisma generate
```

Start the app on port 3008:

```bash
npm run dev
```

In a second terminal, start Inngest:

```bash
npx inngest-cli@latest dev -u http://localhost:3008/api/inngest
```

Open `http://localhost:3008` and sign in to create a project.

## Environment

Copy `.env.example` to `.env.local` and configure PostgreSQL, Clerk, TokenRouter, E2B, and Inngest. Use a pooled `DATABASE_URL` for the application and `DIRECT_URL` for migrations when the database provider supports separate connection strings. Never commit secrets.

The default model policy is:

- Primary: `qwen/qwen3-coder-next`
- One repair fallback: `openai/gpt-5.4-mini`

Both are configurable through environment variables.

## Production deployment

1. Back up PostgreSQL, then run `npx prisma migrate deploy`.
2. Deploy through Vercel and connect the official Inngest integration to `/api/inngest`.
3. Check `/api/health/live`, then call `/api/health/ready` with the `x-health-secret` header.
4. In Inngest, confirm both `code-agent-v2` and `cancel-generation-sandbox` are registered in the current environment.
5. Run a small staging generation and confirm it reaches a terminal state, creates an artifact, and settles exactly one credit.

Generation failures are persisted with a sanitized failure code and reference ID. Prompt text, generated files, authentication data, and API keys are filtered from Sentry events. Session Replay is not enabled.

## Repository

This project is maintained at [ArjunDeshwal/codegenie](https://github.com/ArjunDeshwal/codegenie).
