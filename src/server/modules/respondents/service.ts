import "server-only";
import { prisma, type Tx } from "@/server/db";
import { env } from "@/server/env";
import {
  formatAccessCode,
  formatAccessCodeForCard,
  generateAccessCode,
  hmacAccessCode,
  maskAccessCode,
} from "@/server/crypto/access-code";
import { decrypt, encrypt } from "@/server/crypto/encryption";
import { revokeRespondentSessions } from "@/server/auth/sessions";
import { conflict, notFound, validationError } from "@/server/http/errors";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import type { Prisma } from "@/generated/prisma/client";
import { parseImportCsv, toCsv } from "./csv";
import { labelRange, nextLabelNumber } from "./labels";
import type { BulkCreateInput, ListQuery, RespondentInput, RespondentUpdate } from "./schemas";

export const PAGE_SIZE = 20;

/** Kode akses yang baru dibuat. Teks kode hanya dikembalikan ke staf, tidak pernah dicatat di log. */
export type IssuedCode = { id: string; label: string; code: string; codeForCard: string };

const toDate = (d: string | null | undefined) =>
  d ? new Date(`${d}T00:00:00.000Z`) : d === null ? null : undefined;

async function newUniqueCode(tx: Tx, taken: Set<string> = new Set()) {
  const { ACCESS_CODE_HMAC_SECRET, ACCESS_CODE_ENC_KEY } = env();
  for (let attempt = 0; attempt < 50; attempt++) {
    const digits = generateAccessCode();
    const hmac = hmacAccessCode(digits, ACCESS_CODE_HMAC_SECRET);
    if (taken.has(hmac)) continue;
    const exists = await tx.respondent.findUnique({
      where: { accessCodeHmac: hmac },
      select: { id: true },
    });
    if (exists) continue;
    taken.add(hmac);
    return { digits, hmac, encrypted: encrypt(digits, ACCESS_CODE_ENC_KEY) };
  }
  throw new Error("Gagal membuat kode akses unik");
}

function decryptDigits(encrypted: string): string {
  return decrypt(encrypted, env().ACCESS_CODE_ENC_KEY);
}

async function allLabels(tx: Tx | typeof prisma = prisma): Promise<string[]> {
  // Termasuk responden terhapus: label tetap unik agar data penelitian tidak tertukar.
  const rows = await tx.respondent.findMany({ select: { label: true } });
  return rows.map((r) => r.label);
}

export async function suggestNextLabel(prefix = "R"): Promise<string> {
  return labelRange(prefix, nextLabelNumber(await allLabels(), prefix), 1)[0]!;
}

async function assertLabelsFree(tx: Tx, labels: string[], exceptId?: string) {
  const taken = await tx.respondent.findMany({
    where: { label: { in: labels }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { label: true },
  });
  if (taken.length) {
    const list = taken.map((t) => t.label).join(", ");
    throw conflict(`ID Responden sudah dipakai: ${list}.`, {
      label: `ID Responden sudah dipakai: ${list}.`,
    });
  }
}

async function insertRespondents(
  tx: Tx,
  rows: (RespondentInput & { label: string })[],
  actor: Actor,
): Promise<IssuedCode[]> {
  await assertLabelsFree(
    tx,
    rows.map((r) => r.label),
  );
  const taken = new Set<string>();
  const issued: IssuedCode[] = [];
  for (const row of rows) {
    const code = await newUniqueCode(tx, taken);
    const r = await tx.respondent.create({
      data: {
        label: row.label,
        initials: row.initials ?? null,
        startDate: toDate(row.startDate) ?? null,
        notes: row.notes ?? null,
        accessCodeHmac: code.hmac,
        accessCodeEncrypted: code.encrypted,
        createdById: actor.type === "staff" ? actor.id : null,
      },
    });
    await writeAudit(
      { actor, action: AuditAction.RespondentCreated, targetType: "respondent", targetId: r.id },
      tx,
    );
    issued.push({
      id: r.id,
      label: r.label,
      code: formatAccessCode(code.digits),
      codeForCard: formatAccessCodeForCard(code.digits),
    });
  }
  return issued;
}

export async function createRespondent(input: RespondentInput, actor: Actor): Promise<IssuedCode> {
  return prisma.$transaction(async (tx) => {
    const label = input.label ?? labelRange("R", nextLabelNumber(await allLabels(tx), "R"), 1)[0]!;
    const [issued] = await insertRespondents(tx, [{ ...input, label }], actor);
    return issued!;
  });
}

export async function bulkCreateRespondents(
  input: BulkCreateInput,
  actor: Actor,
): Promise<IssuedCode[]> {
  return prisma.$transaction(
    async (tx) => {
      const start = input.startNumber ?? nextLabelNumber(await allLabels(tx), input.prefix);
      const labels = labelRange(input.prefix, start, input.count);
      const issued = await insertRespondents(
        tx,
        labels.map((label) => ({ label })),
        actor,
      );
      await writeAudit(
        {
          actor,
          action: AuditAction.RespondentsBulkCreated,
          metadata: { count: issued.length, first: labels[0]!, last: labels[labels.length - 1]! },
        },
        tx,
      );
      return issued;
    },
    { timeout: 60_000 },
  );
}

export async function importRespondentsCsv(text: string, actor: Actor): Promise<IssuedCode[]> {
  const parsed = parseImportCsv(text);
  if (!parsed.ok) {
    const fields = Object.fromEntries(
      parsed.errors.map((e) => [`baris_${e.row}`, `Baris ${e.row}: ${e.message}`]),
    );
    throw validationError(fields, "Berkas CSV berisi kesalahan. Tidak ada data yang disimpan.");
  }
  return prisma.$transaction(
    async (tx) => {
      const issued = await insertRespondents(tx, parsed.rows, actor);
      await writeAudit(
        { actor, action: AuditAction.RespondentsImported, metadata: { count: issued.length } },
        tx,
      );
      return issued;
    },
    { timeout: 120_000 },
  );
}

async function findActive(id: string) {
  const r = await prisma.respondent.findFirst({ where: { id, deletedAt: null } });
  if (!r) throw notFound("Responden tidak ditemukan.");
  return r;
}

export async function updateRespondent(id: string, input: RespondentUpdate, actor: Actor) {
  await findActive(id);
  return prisma.$transaction(async (tx) => {
    await assertLabelsFree(tx, [input.label], id);
    const data: Prisma.RespondentUpdateInput = {
      label: input.label,
      initials: input.initials ?? null,
      startDate: toDate(input.startDate) ?? null,
      notes: input.notes ?? null,
    };
    await tx.respondent.update({ where: { id }, data });
    await writeAudit(
      { actor, action: AuditAction.RespondentUpdated, targetType: "respondent", targetId: id },
      tx,
    );
  });
}

/** Menampilkan kode lengkap (tombol tampilkan/salin). Setiap pembukaan dicatat (ADR-004). */
export async function revealCode(id: string, actor: Actor) {
  const r = await findActive(id);
  const digits = decryptDigits(r.accessCodeEncrypted);
  await writeAudit({
    actor,
    action: AuditAction.RespondentCodeRevealed,
    targetType: "respondent",
    targetId: id,
  });
  return { code: formatAccessCode(digits), codeForCard: formatAccessCodeForCard(digits) };
}

/** Reset kode: kode lama langsung tidak berlaku, sesi dicabut, data penelitian tetap utuh (BR-08, AC-10). */
export async function resetCode(id: string, actor: Actor): Promise<IssuedCode> {
  await findActive(id);
  const issued = await prisma.$transaction(async (tx) => {
    const code = await newUniqueCode(tx);
    const r = await tx.respondent.update({
      where: { id },
      data: { accessCodeHmac: code.hmac, accessCodeEncrypted: code.encrypted },
    });
    await tx.respondentSession.deleteMany({ where: { respondentId: id } });
    await writeAudit(
      { actor, action: AuditAction.RespondentCodeReset, targetType: "respondent", targetId: id },
      tx,
    );
    return {
      id,
      label: r.label,
      code: formatAccessCode(code.digits),
      codeForCard: formatAccessCodeForCard(code.digits),
    };
  });
  return issued;
}

export async function setAccessStatus(id: string, status: "active" | "inactive", actor: Actor) {
  const r = await findActive(id);
  if (r.accessStatus === status) return;
  await prisma.$transaction(async (tx) => {
    await tx.respondent.update({ where: { id }, data: { accessStatus: status } });
    if (status === "inactive")
      await tx.respondentSession.deleteMany({ where: { respondentId: id } });
    await writeAudit(
      {
        actor,
        action:
          status === "active" ? AuditAction.RespondentActivated : AuditAction.RespondentDeactivated,
        targetType: "respondent",
        targetId: id,
      },
      tx,
    );
  });
}

/** Hapus lunak (BR-11): data tetap tersimpan, dikeluarkan dari daftar dan analisis. Khusus Superadmin. */
export async function softDeleteRespondent(id: string, actor: Actor) {
  await findActive(id);
  await prisma.$transaction(async (tx) => {
    await tx.respondent.update({
      where: { id },
      data: { deletedAt: new Date(), accessStatus: "inactive" },
    });
    await writeAudit(
      { actor, action: AuditAction.RespondentDeleted, targetType: "respondent", targetId: id },
      tx,
    );
  });
  await revokeRespondentSessions(id);
}

export type RespondentListItem = {
  id: string;
  label: string;
  initials: string | null;
  maskedCode: string;
  accessStatus: "active" | "inactive";
  lastActiveAt: Date | null;
  createdAt: Date;
};

export async function listRespondents(query: ListQuery) {
  const where: Prisma.RespondentWhereInput = {
    deletedAt: null,
    ...(query.status !== "all" ? { accessStatus: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { label: { contains: query.q, mode: "insensitive" } },
            { initials: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.RespondentOrderByWithRelationInput[] =
    query.sort === "created"
      ? [{ createdAt: "desc" }]
      : query.sort === "last_active"
        ? [{ lastActiveAt: { sort: "desc", nulls: "last" } }]
        : [{ label: "asc" }];

  const [total, rows] = await Promise.all([
    prisma.respondent.count({ where }),
    prisma.respondent.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const items: RespondentListItem[] = rows.map((r) => ({
    id: r.id,
    label: r.label,
    initials: r.initials,
    maskedCode: maskAccessCode(decryptDigits(r.accessCodeEncrypted)),
    accessStatus: r.accessStatus,
    lastActiveAt: r.lastActiveAt,
    createdAt: r.createdAt,
  }));
  return {
    items,
    total,
    page: query.page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Detail ringkas (FR-A-03): tanpa data hasil. */
export async function getRespondentDetail(id: string) {
  const r = await prisma.respondent.findFirst({
    where: { id, deletedAt: null },
    include: { createdBy: { select: { name: true } } },
  });
  if (!r) throw notFound("Responden tidak ditemukan.");
  return {
    id: r.id,
    label: r.label,
    initials: r.initials,
    maskedCode: maskAccessCode(decryptDigits(r.accessCodeEncrypted)),
    accessStatus: r.accessStatus,
    startDate: r.startDate,
    notes: r.notes,
    createdByName: r.createdBy?.name ?? null,
    createdAt: r.createdAt,
    lastActiveAt: r.lastActiveAt,
  };
}

/** CSV daftar kode untuk dibagikan saat rekrutmen. Dicatat di audit log. */
export async function exportCodesCsv(actor: Actor): Promise<string> {
  const rows = await prisma.respondent.findMany({
    where: { deletedAt: null },
    orderBy: { label: "asc" },
  });
  await writeAudit({
    actor,
    action: AuditAction.RespondentCodesDownloaded,
    metadata: { count: rows.length },
  });
  return toCsv(
    ["id_responden", "inisial", "kode_akses", "status_akses"],
    rows.map((r) => [
      r.label,
      r.initials ?? "",
      formatAccessCodeForCard(decryptDigits(r.accessCodeEncrypted)),
      r.accessStatus === "active" ? "Aktif" : "Nonaktif",
    ]),
  );
}

/** Data kartu kode (Cetak Kartu). Tanpa `ids` = semua responden aktif. Dicatat di audit log. */
export async function cardsData(actor: Actor, ids?: string[]) {
  const rows = await prisma.respondent.findMany({
    where: { deletedAt: null, accessStatus: "active", ...(ids?.length ? { id: { in: ids } } : {}) },
    orderBy: { label: "asc" },
  });
  await writeAudit({
    actor,
    action: AuditAction.RespondentCardsPrinted,
    metadata: { count: rows.length },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    codeForCard: formatAccessCodeForCard(decryptDigits(r.accessCodeEncrypted)),
  }));
}
