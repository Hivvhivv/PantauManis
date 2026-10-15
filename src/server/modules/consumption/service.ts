import "server-only";
import { prisma, type Tx } from "@/server/db";
import type { ReadyRespondent } from "@/server/auth/guards";
import { businessRule, conflict, notFound, validationError } from "@/server/http/errors";
import {
  diffDays,
  editableDates,
  fromDbDate,
  fromLocalDateTime,
  localDateOf,
  studyDayOf,
  toDbDate,
} from "@/server/modules/study/days";
import { estimateSugarG } from "@/server/modules/study/estimate";
import { getStudySettings, type StudySettings } from "@/server/modules/study/settings";
import type { LogInput } from "./schemas";

/** Toleransi jam perangkat yang sedikit maju. */
const FUTURE_TOLERANCE_MS = 2 * 60 * 1000;

type Ctx = { r: ReadyRespondent; settings: StudySettings; today: string; dayOne: string };

async function context(r: ReadyRespondent, now: Date): Promise<Ctx> {
  return {
    r,
    settings: await getStudySettings(),
    today: localDateOf(now),
    dayOne: fromDbDate(r.dayOneDate),
  };
}

function assertEditableDate(ctx: Ctx, date: string, field = "consumedAt") {
  if (diffDays(ctx.dayOne, date) < 0) {
    throw validationError({ [field]: "Tanggal sebelum hari pertama penelitianmu." });
  }
  if (!editableDates(ctx.today, ctx.dayOne, ctx.settings.backfillDays).includes(date)) {
    throw validationError({
      [field]: `Catatan hanya bisa diisi untuk hari ini dan ${ctx.settings.backfillDays} hari sebelumnya.`,
    });
  }
}

/** Validasi BR-04/05 lalu hitung kolom turunan (snapshot gula, hari ke-, susulan, luar periode). */
async function prepare(ctx: Ctx, input: LogInput, now: Date) {
  const consumedAt = fromLocalDateTime(input.consumedAt);
  if (Number.isNaN(consumedAt.getTime()))
    throw validationError({ consumedAt: "Waktu minum tidak valid." });
  if (consumedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw validationError({ consumedAt: "Waktu minum tidak boleh di masa depan." });
  }
  const localDate = localDateOf(consumedAt);
  assertEditableDate(ctx, localDate);

  const bev = await prisma.beverageType.findUnique({ where: { id: input.beverageTypeId } });
  if (!bev || !bev.isActive)
    throw validationError({ beverageTypeId: "Jenis minuman tidak tersedia." });

  const sugarLevel = bev.sugarLevelApplicable ? (input.sugarLevel ?? "normal") : null;
  const studyDay = studyDayOf(ctx.dayOne, localDate);
  return {
    beverageTypeId: bev.id,
    volumeMl: input.volumeMl,
    servings: input.servings,
    sugarLevel,
    sugarGSnapshot: estimateSugarG({
      sugarGPerServing: bev.sugarGPerServing,
      defaultVolumeMl: bev.defaultVolumeMl,
      volumeMl: input.volumeMl,
      servings: input.servings,
      sugarLevel,
      sugarLevelApplicable: bev.sugarLevelApplicable,
      factors: ctx.settings.sugarFactors,
    }),
    consumedAt,
    localDate: toDbDate(localDate),
    studyDay,
    isBackfill: localDate !== ctx.today,
    isOutOfPeriod: studyDay > ctx.settings.durationDays,
    note: input.note ?? null,
    local: localDate,
  };
}

/** Status hari mengikuti catatan: ada minuman → Terisi; tanpa minuman → hapus status (Belum diisi). */
async function syncDayStatus(tx: Tx, ctx: Ctx, date: string) {
  const count = await tx.consumptionLog.count({
    where: { respondentId: ctx.r.id, localDate: toDbDate(date), deletedAt: null },
  });
  const key = { respondentId_date: { respondentId: ctx.r.id, date: toDbDate(date) } };
  if (count > 0) {
    // BR-03: hari berstatus Nol otomatis menjadi Terisi saat ada minuman.
    await tx.dailyStatus.upsert({
      where: key,
      create: {
        respondentId: ctx.r.id,
        date: toDbDate(date),
        studyDay: studyDayOf(ctx.dayOne, date),
        status: "filled",
      },
      update: { status: "filled" },
    });
  } else {
    await tx.dailyStatus.deleteMany({
      where: { respondentId: ctx.r.id, date: toDbDate(date), status: "filled" },
    });
  }
}

export async function createLog(r: ReadyRespondent, input: LogInput, now = new Date()) {
  const ctx = await context(r, now);
  const { local, ...data } = await prepare(ctx, input, now);
  return prisma.$transaction(async (tx) => {
    const log = await tx.consumptionLog.create({ data: { ...data, respondentId: r.id } });
    await syncDayStatus(tx, ctx, local);
    return { id: log.id, sugarG: log.sugarGSnapshot, studyDay: log.studyDay };
  });
}

/** Catatan milik responden ini saja (BR-09); milik orang lain diperlakukan tidak ada. */
async function ownLog(r: ReadyRespondent, id: string) {
  const log = await prisma.consumptionLog.findFirst({
    where: { id, respondentId: r.id, deletedAt: null },
  });
  if (!log) throw notFound("Catatan tidak ditemukan.");
  return log;
}

export async function getOwnLog(r: ReadyRespondent, id: string) {
  const log = await ownLog(r, id);
  return {
    id: log.id,
    beverageTypeId: log.beverageTypeId,
    volumeMl: log.volumeMl,
    servings: log.servings,
    sugarLevel: log.sugarLevel,
    consumedAt: log.consumedAt,
    note: log.note,
    localDate: fromDbDate(log.localDate),
  };
}

export async function updateLog(r: ReadyRespondent, id: string, input: LogInput, now = new Date()) {
  const ctx = await context(r, now);
  const before = await ownLog(r, id);
  const oldDate = fromDbDate(before.localDate);
  assertEditableDate(ctx, oldDate);
  const { local, ...data } = await prepare(ctx, input, now);
  await prisma.$transaction(async (tx) => {
    await tx.consumptionLog.update({ where: { id }, data });
    await syncDayStatus(tx, ctx, local);
    if (oldDate !== local) await syncDayStatus(tx, ctx, oldDate);
  });
}

export async function deleteLog(r: ReadyRespondent, id: string, now = new Date()) {
  const ctx = await context(r, now);
  const log = await ownLog(r, id);
  const date = fromDbDate(log.localDate);
  assertEditableDate(ctx, date);
  await prisma.$transaction(async (tx) => {
    await tx.consumptionLog.update({ where: { id }, data: { deletedAt: now } });
    await syncDayStatus(tx, ctx, date);
  });
}

/** "Hari ini saya tidak minum minuman manis" → status Nol (BR-02). Ditolak bila sudah ada minuman. */
export async function markZeroDay(r: ReadyRespondent, date: string, now = new Date()) {
  const ctx = await context(r, now);
  assertEditableDate(ctx, date, "date");
  await prisma.$transaction(async (tx) => {
    const drinks = await tx.consumptionLog.count({
      where: { respondentId: r.id, localDate: toDbDate(date), deletedAt: null },
    });
    if (drinks > 0) {
      throw conflict(
        "Kamu sudah mencatat minuman di hari ini. Hapus catatannya dulu jika memang tidak minum.",
      );
    }
    await tx.dailyStatus.upsert({
      where: { respondentId_date: { respondentId: r.id, date: toDbDate(date) } },
      create: {
        respondentId: r.id,
        date: toDbDate(date),
        studyDay: studyDayOf(ctx.dayOne, date),
        status: "zero",
      },
      update: { status: "zero" },
    });
  });
}

/** Batalkan status Nol (mis. salah tekan). */
export async function clearZeroDay(r: ReadyRespondent, date: string, now = new Date()) {
  const ctx = await context(r, now);
  assertEditableDate(ctx, date, "date");
  const res = await prisma.dailyStatus.deleteMany({
    where: { respondentId: r.id, date: toDbDate(date), status: "zero" },
  });
  if (res.count === 0) throw businessRule("NOT_ZERO", "Hari ini tidak berstatus Nol.");
}
