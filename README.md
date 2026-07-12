# CodeGenie

CodeGenie is an AI engineering workspace that turns a product brief into a runnable Next.js application. It combines a conversational build loop with generated source files and a live sandbox preview.

## How it works

1. A user signs in with Clerk and describes a product.
2. tRPC stores the project and dispatches an Inngest event.
3. The CodeGenie agent uses Gemini to plan and generate the application.
4. E2B runs the generated project in an isolated sandbox.
5. CodeGenie saves the response, source files, and preview URL for continued iteration.

## Stack

- Next.js 15 and React 19
- Clerk authentication
- tRPC and TanStack Query
- Prisma with PostgreSQL
- Inngest background functions
- Google Gemini through Inngest Agent Kit
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

CodeGenie expects private local configuration for PostgreSQL, Clerk, Gemini, E2B, and Inngest. Keep secrets in `.env` or `.env.local`; never commit them.

## Repository

This project is maintained at [ArjunDeshwal/codegenie](https://github.com/ArjunDeshwal/codegenie).

## License

See [LICENSE](./LICENSE).
