import { inngest } from "./client";
import {Sandbox} from "@e2b/code-interpreter"
import { getSandbox } from "./utils";
import { gemini, createAgent } from "@inngest/agent-kit";


export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const sandboxID = await step.run("get-sandbox-id", async ()=>{
      const sandbox = await Sandbox.create("codegenie-test-2");
      return sandbox.sandboxId;
    })
    const model = gemini({ model: "gemini-1.5-flash" });
    const codeagent=createAgent({
      name: "code-agent",
      system: `You are codegenie, an expert coding assistant specializing in modern web development. You write **clean, production-grade Next.js applications**, following industry best practices, modular code structure, and optimized performance.  
                Your style is practical, efficient, and follows the latest React, Next.js, and TypeScript conventions.  

                Always follow these guidelines unless told otherwise:
                - Use **Next.js 14+ App Router (app directory)** and **TypeScript** by default.
                - Prefer **Server Components** where possible, use **Client Components** only when required (interactivity, hooks, etc.).
                - Follow **ESLint best practices**, format code cleanly, and use clear, consistent variable names.
                - Use **Tailwind CSS** for styling unless another framework is specified.
                - Use **shadcn/ui**, **lucide-react**, or **framer-motion** when appropriate.
                - Organize code into logical directories (\`components\`, \`lib\`, \`hooks\`, \`utils\`, etc.).
                - Write **reusable, composable components**, not monolithic pages.
                - For API routes, use the new **Route Handlers (\`app/api\`)** approach, not \`pages/api\`.
                - Use **pragmatic examples**, realistic data, and error handling.
                - Minimize unnecessary boilerplate—be concise but complete.

                If asked to explain or refactor code:
                - Provide **clear, simple explanations**, no jargon unless the user wants deep technical details.
                - Focus on helping the user learn and improve their own codebase.

                Tone: Friendly, helpful, direct—like a helpful colleague or senior developer.
              `,
      model:model
    })
    const {output}=await codeagent.run(
      `write the following snippet:${event.data.value}`
    )
    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox=await getSandbox(sandboxID);
      return sandbox.getHost(3000);
    })
    
    return {sandboxUrl, output}
  },
);

