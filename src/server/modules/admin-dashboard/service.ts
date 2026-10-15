import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import { diffDays, fromDbDate, localDateOf, studyDayOf } from "@/server/modules/study/days";
import {
  attentionReasons,
  ATTENTION_LABELS,
  classifyStatus,
  perStudyDay,
  STATUS_LABELS,
  type RespondentStatus,
} from "@/server/modules/study/aggregate";
import { completeness } from "@/server/modules/study/series";
import { getStudySettings } from "@/server/modules/study/settings";

export const dashboardQuerySchema = z.object({
  /** Rentang tanggal pretest (hari ke-1). */
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  status: z.enum(["all", "not_started", "active", "done", "inactive"]).catch("all"),
});
type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/**
 * Dashboard Admin agregat (FR-A-01). Data digabung tanpa identitas, kecuali daftar
 * "Perlu perhatian" yang hanya memakai ID Responden (label penelitian).
 */
export async function getAdminDashboard(query: DashboardQuery, now = new Date()) {
  const settings = await getStudySettings();
  const today = localDateOf(now);

  const all = await prisma.respondent.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      label: true,
      accessStatus: true,
      dayOneDate: true,
      lastActiveAt: true,
      responses: {
        where: { status: "submitted", questionnaire: { type: "posttest" } },
        select: { id: true },
      },
    },
  });

  const rows = all
    .map((r) => {
      const dayOne = r.dayOneDate ? fromDbDate(r.dayOneDate) : null;
      const posttestSubmitted = r.responses.length > 0;
      return {
        ...r,
        dayOne,
        posttestSubmitted,
        status: classifyStatus({ accessStatus: r.accessStatus, dayOne, posttestSubmitted }),
      };
    })
    .filter((r) => query.status === "all" || r.status === query.status)
    .filter((r) => {
      if (!query.from && !query.to) return true;
      if (!r.dayOne) return false;
      if (query.from && diffDays(query.from, r.dayOne) < 0) return false;
      if (query.to && diffDays(r.dayOne, query.to) < 0) return false;
      return true;
    });

  const ids = rows.map((r) => r.id);
  const [statuses, logs, beverages] = await Promise.all([
    prisma.dailyStatus.findMany({
      where: { respondentId: { in: ids } },
      select: { respondentId: true, date: true, studyDay: true },
    }),
    prisma.consumptionLog.groupBy({
      by: ["respondentId", "studyDay", "beverageTypeId"],
      where: {
        respondentId: { in: ids },
        deletedAt: null,
        studyDay: { lte: settings.durationDays },
      },
      _sum: { servings: true, sugarGSnapshot: true },
    }),
    prisma.beverageType.findMany({ select: { id: true, name: true } }),
  ]);

  const statusDatesBy = new Map<string, Set<string>>();
  for (const s of statuses) {
    const set = statusDatesBy.get(s.respondentId) ?? new Set<string>();
    set.add(fromDbDate(s.date));
    statusDatesBy.set(s.respondentId, set);
  }

  // Kartu ringkasan
  const counts: Record<RespondentStatus, number> = {
    not_started: 0,
    active: 0,
    done: 0,
    inactive: 0,
  };
  for (const r of rows) counts[r.status]++;
  const withPretest = rows.filter((r) => r.dayOne);
  const comps = withPretest.map((r) =>
    completeness({
      dayOne: r.dayOne!,
      today,
      durationDays: settings.durationDays,
      statusDates: [...(statusDatesBy.get(r.id) ?? [])],
    }),
  );
  const avgCompleteness = comps.length
    ? Math.round(
        (comps.reduce((s, c) => s + (c.elapsed ? c.filled / c.elapsed : 0), 0) / comps.length) *
          100,
      )
    : null;
  const pct = (n: number) => (rows.length ? Math.round((n / rows.length) * 100) : 0);

  // Per hari ke-
  const perDay = perStudyDay({
    durationDays: settings.durationDays,
    statuses: statuses.filter((s) => s.studyDay <= settings.durationDays),
    logs: logs.map((l) => ({
      respondentId: l.respondentId,
      studyDay: l.studyDay,
      servings: l._sum.servings ?? 0,
      sugarG: l._sum.sugarGSnapshot ?? 0,
    })),
  });

  // Komposisi jenis minuman
  const nameOf = new Map(beverages.map((b) => [b.id, b.name]));
  const comp = new Map<string, number>();
  for (const l of logs) {
    const name = nameOf.get(l.beverageTypeId) ?? "Lainnya";
    comp.set(name, (comp.get(name) ?? 0) + (l._sum.servings ?? 0));
  }
  const composition = [...comp.entries()]
    .map(([beverage, servings]) => ({ beverage, servings }))
    .sort((a, b) => b.servings - a.servings);

  // Corong penyelesaian
  const started = new Set(statuses.map((s) => s.respondentId));
  const funnel = [
    { label: "Kode dibuat", value: rows.length },
    { label: "Pretest selesai", value: withPretest.length },
    { label: "Mulai mencatat", value: withPretest.filter((r) => started.has(r.id)).length },
    { label: "Posttest selesai", value: rows.filter((r) => r.posttestSubmitted).length },
  ];

  // Perlu perhatian (responden aktif saja)
  const attention = rows
    .filter((r) => r.status === "active" && r.dayOne)
    .map((r) => ({
      id: r.id,
      label: r.label,
      studyDay: studyDayOf(r.dayOne!, today),
      lastActiveAt: r.lastActiveAt,
      reasons: attentionReasons({
        dayOne: r.dayOne!,
        today,
        durationDays: settings.durationDays,
        graceDays: settings.posttestGraceDays,
        statusDates: statusDatesBy.get(r.id) ?? new Set(),
        posttestSubmitted: r.posttestSubmitted,
      }).map((x) => ATTENTION_LABELS[x]),
    }))
    .filter((a) => a.reasons.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    durationDays: settings.durationDays,
    total: rows.length,
    counts: (Object.keys(counts) as RespondentStatus[]).map((k) => ({
      key: k,
      label: STATUS_LABELS[k],
      value: counts[k],
    })),
    avgCompleteness,
    pretestPct: pct(withPretest.length),
    posttestPct: pct(rows.filter((r) => r.posttestSubmitted).length),
    perDay,
    composition,
    funnel,
    attention,
  };
}
