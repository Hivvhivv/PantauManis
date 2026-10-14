import "server-only";
import { prisma } from "@/server/db";
import { conflict, notFound } from "@/server/http/errors";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import type { BeverageTypeInput } from "./schemas";

/** Referensi minuman (FR-A-06). Perubahan tidak mengubah catatan lama (sugar_g_snapshot). */
export async function listBeverageTypes(opts: { activeOnly?: boolean } = {}) {
  return prisma.beverageType.findMany({
    where: opts.activeOnly ? { isActive: true } : {},
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getBeverageType(id: string) {
  const b = await prisma.beverageType.findUnique({ where: { id } });
  if (!b) throw notFound("Jenis minuman tidak ditemukan.");
  return b;
}

async function assertNameFree(name: string, exceptId?: string) {
  const other = await prisma.beverageType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });
  if (other)
    throw conflict("Nama jenis minuman sudah ada.", { name: "Nama jenis minuman sudah ada." });
}

export async function createBeverageType(input: BeverageTypeInput, actor: Actor) {
  await assertNameFree(input.name);
  const b = await prisma.beverageType.create({ data: input });
  await writeAudit({
    actor,
    action: AuditAction.BeverageTypeCreated,
    targetType: "beverage_type",
    targetId: b.id,
  });
  return b;
}

export async function updateBeverageType(id: string, input: BeverageTypeInput, actor: Actor) {
  const before = await getBeverageType(id);
  await assertNameFree(input.name, id);
  const b = await prisma.beverageType.update({ where: { id }, data: input });
  await writeAudit({
    actor,
    action: AuditAction.BeverageTypeUpdated,
    targetType: "beverage_type",
    targetId: id,
    metadata: {
      sugarBefore: before.sugarGPerServing,
      sugarAfter: b.sugarGPerServing,
      volumeBefore: before.defaultVolumeMl,
      volumeAfter: b.defaultVolumeMl,
    },
  });
  return b;
}
