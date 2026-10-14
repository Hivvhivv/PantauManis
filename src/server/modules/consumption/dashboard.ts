import "server-only";
import { prisma } from "@/server/db";
import type { ReadyRespondent } from "@/server/auth/guards";
import {
  addDays,
  diffDays,
  editableDates,
  fromDbDate,
  localDateOf,
  studyDayOf,
  toDbDate,
  toLocalDateTime,
} from "@/server/modules/study/days";
import {
  buildDays,
  completeness,
  composition,
  rangeDates,
  RANGES,
  weekly,
  type DayPoint,
  type LogLite,
  type RangeKey,
} from "@/server/modules/study/series";
import { getStudySettings } from "@/server/modules/study/settings";
import type { HistoryQuery } from "./schemas";

async function loadRange(respondentId: string, from: string, to: string, beverageTypeId?: string) {
  const where = {
    respondentId,
    deletedAt: null,
    localDate: { gte: toDbDate(from), lte: toDbDate(to) },
    ...(beverageTypeId ? { beverageTypeId } : {}),
  };
  const [logs, statuses] = await Promise.all([
    prisma.consumptionLog.findMany({
      where,
      include: { beverageType: { select: { name: true, icon: true } } },
      orderBy: { consumedAt: "desc" },
    }),
    prisma.dailyStatus.findMany({
      where: { respondentId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
    }),
  ]);
  return { logs, statuses };
}

const lite = (l: {
  localDate: Date;
  servings: number;
  sugarGSnapshot: number;
  beverageType: { name: string };
}): LogLite => ({
  localDate: fromDbDate(l.localDate),
  servings: l.servings,
  sugarG: l.sugarGSnapshot,
  beverage: l.beverageType.name,
});

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

/** Data Dashboard Responden (FR-R-03). Hanya data milik responden yang login. */
export async function getDashboard(r: ReadyRespondent, range: RangeKey, now = new Date()) {
  const settings = await getStudySettings();
  const today = localDateOf(now);
  const dayOne = fromDbDate(r.dayOneDate);
  const periodEnd = addDays(dayOne, settings.durationDays - 1);
  const { from, to } = rangeDates(range, today, dayOne, settings.durationDays);

  // Satu query mencakup rentang grafik + periode 14 hari (untuk kalender) + hari ini.
  const qFrom = [from, dayOne].sort()[0]!;
  const qTo = [to, periodEnd, today].sort().at(-1)!;
  const { logs, statuses } = await loadRange(r.id, qFrom, qTo);
  const all = logs.map(lite);
  const st = statuses.map((s) => ({ date: fromDbDate(s.date), status: s.status }));
  const inRange = (d: string) => diffDays(from, d) >= 0 && diffDays(d, to) >= 0;

  const days = buildDays({
    from,
    to,
    today,
    dayOne,
    logs: all.filter((l) => inRange(l.localDate)),
    statuses: st,
  });
  const calendar = buildDays({
    from: dayOne,
    to: periodEnd,
    today,
    dayOne,
    logs: all,
    statuses: st,
  });
  const todayPoint: DayPoint = buildDays({
    from: today,
    to: today,
    today,
    dayOne,
    logs: all,
    statuses: st,
  })[0]!;

  // Aktivitas terbaru: 5 catatan terakhir milik responden ini, tanpa batas rentang.
  const recentRows = await prisma.consumptionLog.findMany({
    where: { respondentId: r.id, deletedAt: null },
    include: { beverageType: { select: { name: true, icon: true } } },
    orderBy: { consumedAt: "desc" },
    take: 5,
  });
  const editable = new Set(editableDates(today, dayOne, settings.backfillDays));

  const recorded = days.filter((d) => d.state === "filled" || d.state === "zero");
  const totalDrinks = days.reduce((s, d) => s + d.drinks, 0);
  const totalSugar = Math.round(days.reduce((s, d) => s + d.sugarG, 0) * 10) / 10;

  return {
    range,
    rangeLabel: RANGES[range].label,
    from,
    to,
    today,
    studyDay: studyDayOf(dayOne, today),
    durationDays: settings.durationDays,
    todayPoint,
    days,
    weeks: range === "1y" ? weekly(days) : null,
    calendar,
    composition: composition(all.filter((l) => inRange(l.localDate))),
    completeness: completeness({
      dayOne,
      today,
      durationDays: settings.durationDays,
      statusDates: st.map((s) => s.date),
    }),
    recent: recentRows.map((l) => ({
      id: l.id,
      beverage: l.beverageType.name,
      icon: l.beverageType.icon,
      volumeMl: l.volumeMl,
      servings: l.servings,
      sugarG: l.sugarGSnapshot,
      date: fromDbDate(l.localDate),
      time: toLocalDateTime(l.consumedAt).slice(11),
      editable: editable.has(fromDbDate(l.localDate)),
    })),
    summary: {
      totalDrinks,
      totalSugar,
      recordedDays: recorded.length,
      zeroDays: days.filter((d) => d.state === "zero").length,
      emptyDays: days.filter((d) => d.state === "empty").length,
      avgSugarPerRecordedDay: recorded.length
        ? Math.round((totalSugar / recorded.length) * 10) / 10
        : 0,
    },
  };
}

/** Riwayat per hari (FR-R-04), filter tanggal dan jenis minuman. */
export async function getHistory(r: ReadyRespondent, query: HistoryQuery, now = new Date()) {
  const settings = await getStudySettings();
  const today = localDateOf(now);
  const dayOne = fromDbDate(r.dayOneDate);
  let to = query.to && diffDays(query.to, today) >= 0 ? query.to : today;
  let from = query.from ?? [addDays(to, -13), dayOne].sort().at(-1)!;
  if (diffDays(from, dayOne) > 0) from = dayOne;
  if (diffDays(from, to) < 0) [from, to] = [to, from];
  if (diffDays(from, to) > 366) from = addDays(to, -366);

  const { logs, statuses } = await loadRange(r.id, from, to, query.beverageTypeId);
  const editable = new Set(editableDates(today, dayOne, settings.backfillDays));
  const days = buildDays({
    from,
    to,
    today,
    dayOne,
    logs: logs.map(lite),
    statuses: statuses.map((s) => ({ date: fromDbDate(s.date), status: s.status })),
  })
    .filter((d) => d.state !== "before" && d.state !== "future")
    .reverse();

  return {
    from,
    to,
    days: days.map((d) => ({
      ...d,
      editable: editable.has(d.date),
      logs: logs
        .filter((l) => fromDbDate(l.localDate) === d.date)
        .map((l) => ({
          id: l.id,
          time: toLocalDateTime(l.consumedAt).slice(11),
          beverage: l.beverageType.name,
          icon: l.beverageType.icon,
          volumeMl: l.volumeMl,
          servings: l.servings,
          sugarLevel: l.sugarLevel,
          sugarG: l.sugarGSnapshot,
          note: l.note,
          isBackfill: l.isBackfill,
          isOutOfPeriod: l.isOutOfPeriod,
        })),
    })),
  };
}
