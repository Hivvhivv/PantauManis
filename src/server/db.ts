import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL ?? "") });
}

/**
 * Di dev, client disimpan di globalThis agar hot reload tidak membuka koneksi baru terus-menerus.
 * Setelah migration + `prisma generate`, client lama itu belum mengenal model baru
 * (mis. `prisma.goal` = undefined), jadi buat ulang bila ada model yang hilang.
 */
function isStale(client: PrismaClient): boolean {
  return Object.values(Prisma.ModelName).some(
    (model) => !(model.charAt(0).toLowerCase() + model.slice(1) in client),
  );
}

const cached = globalForPrisma.prisma;
if (cached && isStale(cached)) void cached.$disconnect().catch(() => {});

export const prisma = cached && !isStale(cached) ? cached : createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
