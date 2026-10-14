import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

export function prismaFromEnv() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diatur (.env).");
  return new PrismaClient({ adapter: new PrismaPg(url) });
}

/** Membaca argumen --nama nilai. */
export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
