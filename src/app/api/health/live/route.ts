export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, service: "codegenie" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
