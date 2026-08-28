import { spawnSync } from "node:child_process";

if (process.env.VERCEL === "1") {
  const migration = spawnSync(
    "npm",
    ["exec", "prisma", "migrate", "deploy"],
    { stdio: "inherit" },
  );

  if (migration.error) throw migration.error;
  if (migration.status !== 0) process.exit(migration.status || 1);
}
