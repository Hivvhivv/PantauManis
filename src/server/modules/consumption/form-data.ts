import "server-only";
import { prisma } from "@/server/db";
import type { ReadyRespondent } from "@/server/auth/guards";
import { listBeverageTypes } from "@/server/modules/beverages/service";
import {
  diffDays,
  editableDates,
  fromDbDate,
  localDateOf,
  toDbDate,
  toLocalDateTime,
} from "@/server/modules/study/days";
import { SIZE_PRESETS } from "@/server/modules/study/estimate";
import { getStudySettings } from "@/server/modules/study/settings";

const dayLabel = (date: string, today: string) => {
  const ago = diffDays(date, today);
  const pretty = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
  if (ago === 0) return `Hari ini (${pretty})`;
  if (ago === 1) return `Kemarin (${pretty})`;
  return `${ago} hari lalu (${pretty})`;
};

/**
 * Data untuk form pencatatan: jenis minuman aktif, preset ukuran, tanggal yang boleh diisi,
 * dan minuman favorit (jenis yang paling sering dicatat responden ini sendiri).
 */
export async function logFormData(r: ReadyRespondent, now = new Date()) {
  const [settings, types] = await Promise.all([
    getStudySettings(),
    listBeverageTypes({ activeOnly: true }),
  ]);
  const today = localDateOf(now);
  const dates = editableDates(today, fromDbDate(r.dayOneDate), settings.backfillDays).reverse();

  const counts = await prisma.consumptionLog.groupBy({
    by: ["beverageTypeId"],
    where: { respondentId: r.id, deletedAt: null, beverageTypeId: { in: types.map((t) => t.id) } },
    _count: { _all: true },
    orderBy: { _count: { beverageTypeId: "desc" } },
    take: 4,
  });
  const favorites = await Promise.all(
    counts.map(async (c) => {
      const last = await prisma.consumptionLog.findFirst({
        where: { respondentId: r.id, beverageTypeId: c.beverageTypeId, deletedAt: null },
        orderBy: { consumedAt: "desc" },
        select: { volumeMl: true },
      });
      return {
        beverageTypeId: c.beverageTypeId,
        volumeMl: last?.volumeMl ?? null,
        count: c._count._all,
      };
    }),
  );

  // Status hari ini: kartu "tidak minum" hanya ditampilkan bila hari ini belum tercatat.
  const todayStatus = await prisma.dailyStatus.findUnique({
    where: { respondentId_date: { respondentId: r.id, date: toDbDate(today) } },
    select: { status: true },
  });

  return {
    todayRecorded: !!todayStatus,
    beverages: types.map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      defaultVolumeMl: t.defaultVolumeMl,
      sugarGPerServing: t.sugarGPerServing,
      sugarLevelApplicable: t.sugarLevelApplicable,
    })),
    sizes: SIZE_PRESETS,
    factors: settings.sugarFactors,
    backfillDays: settings.backfillDays,
    dates: dates.map((d) => ({ value: d, label: dayLabel(d, today) })),
    favorites,
    nowLocal: toLocalDateTime(now),
    today,
  };
}
