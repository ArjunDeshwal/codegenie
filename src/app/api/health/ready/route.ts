import { inspectServerEnv } from "@/lib/env";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.HEALTHCHECK_SECRET;
  if (!secret || request.headers.get("x-health-secret") !== secret) {
    return Response.json({ ok: false }, { status: 404 });
  }
  const environment = inspectServerEnv();
  if (!environment.ok) {
    return Response.json({ ok: false, missing: environment.missing }, { status: 503 });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
