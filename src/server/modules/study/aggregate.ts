/**
 * Agregat Dashboard Admin (FR-A-01). Modul murni; data diambil oleh admin-dashboard service.
 * "Belum diisi" tidak pernah ikut dirata-rata; hari Nol dihitung sebagai 0 (ADR-005).
 */
import { addDays, diffDays, studyDayOf } from "./days";

export type RespondentStatus = "not_started" | "active" | "done" | "inactive";

export const STATUS_LABELS: Record<RespondentStatus, string> = {
  not_started: "Belum mulai",
  active: "Aktif",
  done: "Selesai",
  inactive: "Nonaktif",
};

export function classifyStatus(r: {
  accessStatus: "active" | "inactive";
  dayOne: string | null;
  posttestSubmitted: boolean;
}): RespondentStatus {
  if (r.accessStatus === "inactive") return "inactive";
  if (r.posttestSubmitted) return "done";
  if (!r.dayOne) return "not_started";
  return "active";
}

export type DayAgg = { studyDay: number; n: number; avgSugarG: number; avgDrinks: number };

/**
 * Rata-rata per hari ke-1..durasi, hanya dari responden yang mencatat (Terisi/Nol) hari itu.
 * `statuses`: hari tercatat per responden; `logs`: total per responden per hari ke-.
 */
export function perStudyDay(params: {
  durationDays: number;
  statuses: { respondentId: string; studyDay: number }[];
  logs: { respondentId: string; studyDay: number; servings: number; sugarG: number }[];
}): DayAgg[] {
  const key = (r: string, d: number) => `${r}:${d}`;
  const totals = new Map<string, { servings: number; sugarG: number }>();
  for (const l of params.logs) {
    const cur = totals.get(key(l.respondentId, l.studyDay)) ?? { servings: 0, sugarG: 0 };
    cur.servings += l.servings;
    cur.sugarG += l.sugarG;
    totals.set(key(l.respondentId, l.studyDay), cur);
  }
  const round = (x: number) => Math.round(x * 10) / 10;
  return Array.from({ length: params.durationDays }, (_, i) => {
    const day = i + 1;
    const recorded = params.statuses.filter((s) => s.studyDay === day);
    let sugar = 0;
    let drinks = 0;
    for (const s of recorded) {
      const t = totals.get(key(s.respondentId, day));
      sugar += t?.sugarG ?? 0;
      drinks += t?.servings ?? 0;
    }
    const n = recorded.length;
    return {
      studyDay: day,
      n,
      avgSugarG: n ? round(sugar / n) : 0,
      avgDrinks: n ? round(drinks / n) : 0,
    };
  });
}

export type AttentionReason = "two_days_empty" | "posttest_missing";

export const ATTENTION_LABELS: Record<AttentionReason, string> = {
  two_days_empty: "Belum mengisi 2 hari berturut-turut",
  posttest_missing: "Periode berakhir, posttest belum diisi",
};

/**
 * Daftar "Perlu perhatian": responden aktif yang (a) kemarin dan lusa sama-sama Belum diisi
 * di dalam periode, atau (b) jendela posttest sudah tutup tanpa posttest.
 */
export function attentionReasons(params: {
  dayOne: string;
  today: string;
  durationDays: number;
  graceDays: number;
  statusDates: Set<string>;
  posttestSubmitted: boolean;
}): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const periodEnd = addDays(params.dayOne, params.durationDays - 1);
  const y1 = addDays(params.today, -1);
  const y2 = addDays(params.today, -2);
  const inPeriod = (d: string) => diffDays(params.dayOne, d) >= 0 && diffDays(d, periodEnd) >= 0;
  if (inPeriod(y1) && inPeriod(y2) && !params.statusDates.has(y1) && !params.statusDates.has(y2)) {
    reasons.push("two_days_empty");
  }
  const day = studyDayOf(params.dayOne, params.today);
  if (!params.posttestSubmitted && day > params.durationDays + params.graceDays) {
    reasons.push("posttest_missing");
  }
  return reasons;
}
