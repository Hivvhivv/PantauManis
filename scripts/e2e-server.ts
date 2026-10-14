/**
 * Server untuk test e2e: Postgres baru (port 54331), migration, akun staf uji, lalu `next dev` di port 3100.
 * Dijalankan otomatis oleh Playwright (lihat playwright.config.ts).
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { migrateDeploy, startEmbeddedPostgres } from "./lib/embedded-pg";

export const E2E_PASSWORD = "Rahasia-E2E-123";

async function main() {
  const { pg, url } = await startEmbeddedPostgres({
    name: "pg-e2e",
    port: 54331,
    database: "pantaumanis_e2e",
    fresh: true,
  });
  migrateDeploy(url);

  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  const passwordHash = await hash(E2E_PASSWORD);
  await prisma.staffUser.createMany({
    data: [
      {
        name: "Super E2E",
        email: "super@e2e.id",
        role: "superadmin",
        passwordHash,
        mustChangePassword: false,
      },
      {
        name: "Admin E2E",
        email: "admin@e2e.id",
        role: "admin",
        passwordHash,
        mustChangePassword: false,
      },
    ],
  });
  await prisma.$disconnect();

  const next = spawn("npx", ["next", "dev", "-p", "3100"], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: url,
      APP_URL: "http://localhost:3100",
      ACCESS_CODE_HMAC_SECRET: randomBytes(32).toString("base64"),
      ACCESS_CODE_ENC_KEY: randomBytes(32).toString("base64"),
    },
  });

  const stop = async () => {
    next.kill();
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  next.on("exit", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
