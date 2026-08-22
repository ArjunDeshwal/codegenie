import { auth } from "@clerk/nextjs/server";
import { strToU8, zipSync } from "fflate";

import prisma from "@/lib/prisma";
import type { FileCollection } from "@/types";

export async function GET(_request: Request, context: { params: Promise<{ fragmentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { fragmentId } = await context.params;
  const fragment = await prisma.fragment.findFirst({
    where: { id: fragmentId, message: { project: { userId } } },
    include: { message: { include: { project: true } } },
  });
  if (!fragment) return Response.json({ error: "Not found" }, { status: 404 });

  const files = fragment.files as FileCollection;
  const archive = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, strToU8(content)]));
  const scaffold = {
    "package.json": JSON.stringify({
      name: fragment.message.project.name,
      private: true,
      scripts: { dev: "next dev", build: "next build", start: "next start" },
      dependencies: {
        next: "15.5.23", react: "^19.2.8", "react-dom": "^19.2.8", "lucide-react": "^0.523.0",
        "class-variance-authority": "^0.7.1", clsx: "^2.1.1", "tailwind-merge": "^3.3.1", "radix-ui": "^1.4.2",
      },
      devDependencies: { typescript: "^5", "@types/node": "^22", "@types/react": "^19", "@types/react-dom": "^19", tailwindcss: "^4", "@tailwindcss/postcss": "^4" },
    }, null, 2),
    "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2017", lib: ["dom", "dom.iterable", "esnext"], strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", paths: { "@/*": ["./*"] } }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"] }, null, 2),
    "next.config.ts": "import type { NextConfig } from 'next';\nconst config: NextConfig = {};\nexport default config;\n",
    "postcss.config.mjs": "export default { plugins: { '@tailwindcss/postcss': {} } };\n",
  };
  for (const [path, content] of Object.entries(scaffold)) {
    if (!archive[path]) archive[path] = strToU8(content);
  }
  archive["README.md"] = strToU8(`# ${fragment.title}\n\nExported from CodeGenie. Artifact template: ${fragment.templateVersion}.\n`);
  const zip = zipSync(archive, { level: 6 });
  const filename = `${fragment.message.project.name.replace(/[^a-z0-9-]/gi, "-")}.zip`;
  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
