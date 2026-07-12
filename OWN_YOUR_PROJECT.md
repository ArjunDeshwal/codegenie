# Own and Customize This Lovable Clone

This guide explains what this repository does, which external accounts it depends on, how to replace the original author's cloud resources with your own, and where to start changing the product.

> Never paste real API keys into source code, Git commits, screenshots, or chat messages. Put local secrets in `.env.local`. This repository already ignores `.env*` files.

## 1. What this project actually is

This is a Next.js application that turns a user's text prompt into a small generated website.

The request flow is:

1. A user signs in with **Clerk**.
2. The browser calls a type-safe **tRPC** endpoint.
3. The endpoint consumes one credit, saves the prompt in **PostgreSQL** through **Prisma**, and sends an **Inngest** event.
4. The Inngest `code-agent` function starts an **E2B** cloud sandbox.
5. A **Gemini** model decides which files and terminal commands to use inside that sandbox.
6. E2B runs the generated Next.js site and provides a preview hostname.
7. The generated files, preview URL, title, and assistant response are stored in PostgreSQL and displayed in the project screen.

The main application runs locally on port **3008**. Generated apps inside E2B run on port **3000**.

### Services you must own

| Service | Purpose | Required locally |
| --- | --- | --- |
| PostgreSQL (Neon, Supabase, local Postgres, etc.) | Projects, messages, fragments, and usage credits | Yes |
| Clerk | Sign-in, users, protected routes, and optional `pro` plan check | Yes |
| Google Gemini | AI coding agent and response/title generation | Yes |
| E2B | Isolated execution and live preview of generated apps | Yes |
| Inngest | Runs the slow generation workflow in the background | Yes |

The README mentions several AI providers and billing, but the current code only uses Gemini. There is no payment/checkout implementation; it only checks whether Clerk says the user has a plan named `pro`.

## 2. Create your private environment file

Create `.env.local` in the repository root. Use this template and replace every placeholder with a value from your own accounts:

```env
# PostgreSQL connection string used by Prisma
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

# This project runs with `npm run dev` on port 3008
NEXT_PUBLIC_APP_URL="http://localhost:3008"

# Google AI Studio / Gemini
GEMINI_API_KEY="your_gemini_key"

# E2B account
E2B_API_KEY="your_e2b_key"

# Clerk application
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"

# Needed when using Inngest Cloud/production. The local Inngest dev server
# normally discovers the app without these.
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""
```

Only variables beginning with `NEXT_PUBLIC_` are sent to the browser. API keys and secret keys must never have that prefix.

## 3. Replace every account-owned resource

### A. Database and Prisma

1. Create a new empty PostgreSQL database in an account you control.
2. Copy its connection URL to `DATABASE_URL`.
3. Install dependencies and apply the checked-in migrations:

```bash
npm install
npx prisma migrate deploy
npx prisma generate
```

For local schema development, create a new migration after editing `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name describe_your_change
```

Optional database viewer:

```bash
npx prisma studio
```

Do not use `prisma db push` as your normal team workflow; migrations preserve a reviewable history of database changes.

### B. Clerk authentication

1. Create your own Clerk application.
2. Add its publishable and secret keys to `.env.local`.
3. In Clerk, allow local origin `http://localhost:3008` if it is not already allowed.
4. Use `/sign-in` and `/sign-up` for the application paths.
5. If you want the existing paid-credit behavior, create a Clerk plan with the slug/name expected by the code: `pro`. Otherwise, change `has({ plan: 'pro' })` in `src/lib/usage.ts`.

The home page and API routes are public at the middleware level, but tRPC's protected procedures still require a signed-in user before reading or creating projects.

### C. Gemini

Create a key in a Google project you control and store it as `GEMINI_API_KEY`. The model is selected three times in `src/inngest/functions.ts` and is currently `gemini-2.0-flash`.

If that model is unavailable to your account, replace all three occurrences with a Gemini model supported by your installed Agent Kit version. Test generation after any model change because model behavior affects tool calling and the required `<task_summary>` output.

### D. E2B — important ownership step

The checked-in E2B configuration still identifies the tutorial author's resources:

- `sandbox-templates/nextjs/e2b.toml` contains a hard-coded `team_id` and `template_id`.
- `src/inngest/functions.ts` creates a template named `vibe-nextjs-bek-2`.

An API key alone does **not** make that template yours. Log in to the E2B CLI using your account, build the template from `sandbox-templates/nextjs`, and use the new template name or ID returned for your team. Follow the current E2B template-build documentation if the installed CLI syntax differs.

After building it:

1. Replace the old team/template identifiers in `sandbox-templates/nextjs/e2b.toml` with yours.
2. Replace `'vibe-nextjs-bek-2'` in `src/inngest/functions.ts` with your template name or ID.
3. Keep `start_cmd = "/compile_page.sh"`; it starts the generated Next.js app on port 3000.

Do not commit a personal E2B API key. The identifiers in `e2b.toml` are not secret, but replacing them prevents accidental dependency on the tutorial author's account.

### E. Inngest

The app exposes its functions at `/api/inngest`. During local development you need both the Next.js server and the Inngest dev server running in separate terminals:

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npx inngest-cli@latest dev -u http://localhost:3008/api/inngest
```

Open the local Inngest dashboard URL printed in Terminal 2 and confirm that `code-agent` is registered. In production, create an Inngest app, configure its event/signing keys in the hosting provider, and sync the deployed `/api/inngest` endpoint.

## 4. First complete local run

Use this order so failures are easier to locate:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Then start the Inngest dev server in another terminal as shown above.

Visit `http://localhost:3008`, sign up through your Clerk application, and submit a small prompt. Verify all of the following:

- Clerk creates a user in your Clerk dashboard.
- A `Project` and user `Message` appear in your database.
- Inngest receives `code-agent/run` and finishes the `code-agent` function.
- E2B creates a sandbox under your E2B team.
- An assistant message and `Fragment` are saved.
- The preview and generated file explorer appear in the project page.

If project creation succeeds but generation never finishes, inspect the Inngest function logs first. That is where Gemini, E2B, and agent errors surface.

## 5. Where to edit the product

### Branding and appearance

- `src/config/site.ts` — product name and metadata description.
- `public/logo.svg` and `src/app/favicon.ico` — logo and browser icon.
- `src/app/globals.css` — global colors and Tailwind theme.
- `src/app/layout.tsx` — Clerk theme, fonts, providers, and metadata wiring.
- `src/modules/home/ui/components/navbar.tsx` — home navigation.

Search for the literal text `Lovable Clone` before renaming:

```bash
rg -n "Lovable Clone|lovable-clone" . -g '!node_modules'
```

Keep the Inngest client ID in `src/inngest/client.ts` stable after production launch, or deliberately rename it in both your code and Inngest configuration.

### Home screen and starter prompts

- `src/app/(home)/page.tsx` — home route composition.
- `src/modules/home/ui/components/project-form.tsx` — main prompt form.
- `src/modules/home/ui/components/projects-list.tsx` — recent projects.
- `src/constants.ts` — example project templates and sandbox timeout.

### Project workspace

- `src/modules/projects/ui/views/project-view.tsx` — project screen.
- `src/modules/projects/ui/components/messages-container.tsx` — conversation.
- `src/modules/projects/ui/components/fragment-web.tsx` — preview/code tabs.
- `src/components/file-explorer.tsx` — generated file browser.

### AI behavior

- `src/prompt.ts` — the coding agent's rules plus title/response prompts.
- `src/inngest/functions.ts` — model, tools, maximum agent iterations, E2B lifecycle, and saving results.

The large `PROMPT` controls what generated sites look like. Change it gradually and test several different prompts; a rule that improves one generation can break tool use in another.

### Data, APIs, credits, and access

- `prisma/schema.prisma` — database models.
- `src/modules/projects/server/procedures.ts` — create/list/read projects.
- `src/modules/messages/server/procedures.ts` — prompt history and follow-up generations.
- `src/lib/usage.ts` — free/pro credit limits and renewal duration.
- `src/middleware.ts` — public versus protected routes.
- `src/trpc/routers/_app.ts` — tRPC router registration.

Currently a free user receives only **1 generation per 30 days**, while a Clerk user with the `pro` plan receives **100**. Change `FREE_POINTS`, `PRO_POINTS`, `DURATION`, and `GENERATION_COST` in `src/lib/usage.ts` to match your business rules.

## 6. Recommended ownership changes before feature work

1. Replace all five external services with accounts you control.
2. Rename the product, metadata, logo, and Inngest app ID.
3. Rebuild and reference your own E2B template.
4. Decide whether to keep Clerk plans and the credit system; the current UI calls this billing, but no checkout is implemented.
5. Review and rewrite `src/prompt.ts` for the kind of sites you want your product to generate.
6. Add error monitoring and structured logs before inviting users.
7. Add automated tests; this repository currently has no test suite.
8. Review the MIT `LICENSE`, retain its required copyright/license notice, and add your own product notices as appropriate.

## 7. Before deploying

- Set all environment variables in the hosting platform; `.env.local` is only for your machine.
- Set `NEXT_PUBLIC_APP_URL` to the exact production origin, such as `https://yourdomain.com`.
- Add the production domain and redirect URLs in Clerk.
- Run `npx prisma migrate deploy` against the production database.
- Confirm the deployed `/api/inngest` endpoint is synced with Inngest Cloud.
- Confirm Inngest Cloud has `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` available to the app.
- Confirm `E2B_API_KEY` belongs to the same E2B team as your rebuilt template.
- Run `npm run build` locally or in CI before deploying.
- Put spending/usage limits on Gemini, E2B, the database, and Inngest where available.

## 8. Known issues and easy traps

- `npm run dev` uses port **3008**, not the usual Next.js port 3000.
- The README's E2B setup is incomplete; the template in this repository is tied to the tutorial configuration until you rebuild it.
- The `lint` script uses `next lint`, which is not a reliable standalone script for this Next.js version. Use `npx eslint .` or update the package script.
- AI generation is asynchronous. Running only Next.js is insufficient; run the Inngest dev server too.
- The generated preview is temporary because E2B sandboxes time out after 30 minutes. The code and preview URL are stored, but there is no permanent deployment pipeline.
- Existing generated projects store their sandbox URL and files, but follow-up generation creates a fresh sandbox. It does not currently copy the previous fragment's files into that new sandbox; only recent chat messages are supplied to the model.
- The middleware makes `/api(.*)` public so Inngest can reach its handler. Authorization for product data is enforced inside protected tRPC procedures; preserve those checks when adding endpoints.
- Never expose `CLERK_SECRET_KEY`, `GEMINI_API_KEY`, `E2B_API_KEY`, `DATABASE_URL`, or Inngest secrets through client components or `NEXT_PUBLIC_` variables.

## 9. A safe way to begin customizing

Make small, reversible commits in this order:

1. `setup: connect owned cloud services`
2. `brand: rename product and replace assets`
3. `product: adjust templates and AI prompt`
4. `product: change credits or remove plan logic`
5. `feature: implement your first unique workflow`

After each step, test sign-in, project creation, the Inngest run, the E2B preview, and a follow-up prompt. This separates configuration failures from changes to your product logic.
