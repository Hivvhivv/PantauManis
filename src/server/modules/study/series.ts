/**
 * Pengolahan data dashboard (FR-R-03). Modul murni.
 * "Belum diisi" (tidak ada catatan) dan "Nol" tidak pernah disamakan (BR-02, ADR-005).
 */
import { addDays, dateRange, diffDays, studyDayOf } from "./days";

export type DayState = "filled" | "zero" | "empty" | "future" | "before";

export type DayPoint = {
  date: string;
  studyDay: number | null;
  state: DayState;
  drinks: number;
  sugarG: number;
};

export type LogLite = { localDate: string; servings: number; sugarG: number; beverage: string };
export type StatusLite = { date: string; status: "filled" | "zero" };

export const RANGES = {
  "1w": { label: "1 minggu", days: 7 },
  "2w": { label: "2 minggu", days: 14 },
  "1m": { label: "1 bulan", days: 30 },
  "1y": { label: "1 tahun", days: 365 },
} as const;
export type RangeKey = keyof typeof RANGES;

/**
 * Rentang tanggal grafik. "2w" = periode penelitian hari ke-1–14 (default);
 * rentang lain = N hari terakhir sampai hari ini.
 */
export function rangeDates(range: RangeKey, today: string, dayOne: string, durationDays: number) {
  if (range === "2w") return { from: dayOne, to: addDays(dayOne, durationDays - 1) };
  return { from: addDays(today, -(RANGES[range].days - 1)), to: today };
}

export function buildDays(params: {
  from: string;
  to: string;
  today: string;
  dayOne: string;
  logs: LogLite[];
  statuses: StatusLite[];
}): DayPoint[] {
  const byDate = new Map<string, { drinks: number; sugarG: number }>();
  for (const l of params.logs) {
    const cur = byDate.get(l.localDate) ?? { drinks: 0, sugarG: 0 };
    cur.drinks += l.servings;
    cur.sugarG += l.sugarG;
    byDate.set(l.localDate, cur);
  }
  const statusBy = new Map(params.statuses.map((s) => [s.date, s.status]));

  return dateRange(params.from, params.to).map((date) => {
    const agg = byDate.get(date) ?? { drinks: 0, sugarG: 0 };
    const before = diffDays(params.dayOne, date) < 0;
    const future = diffDays(params.today, date) > 0;
    const st = statusBy.get(date);
    const state: DayState = before
      ? "before"
      : future
        ? "future"
        : st === "filled"
          ? "filled"
          : st === "zero"
            ? "zero"
            : "empty";
    return {
      date,
      studyDay: before ? null : studyDayOf(params.dayOne, date),
      state,
      drinks: agg.drinks,
      sugarG: Math.round(agg.sugarG * 10) / 10,
    };
  });
}

/** Untuk rentang 1 tahun: jumlahkan per minggu agar grafik tetap terbaca. */
export function weekly(days: DayPoint[]): { label: string; drinks: number; sugarG: number }[] {
  const out: { label: string; drinks: number; sugarG: number }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    out.push({
      label: chunk[0]!.date,
      drinks: chunk.reduce((s, d) => s + d.drinks, 0),
      sugarG: Math.round(chunk.reduce((s, d) => s + d.sugarG, 0) * 10) / 10,
    });
  }
  return out;
}

export function composition(logs: LogLite[]): { beverage: string; servings: number }[] {
  const m = new Map<string, number>();
  for (const l of logs) m.set(l.beverage, (m.get(l.beverage) ?? 0) + l.servings);
  return [...m.entries()]
    .map(([beverage, servings]) => ({ beverage, servings }))
    .sort((a, b) => b.servings - a.servings);
}

/** Kelengkapan = hari terisi (termasuk Nol) / hari berjalan dalam periode (PRD FR-A-02). */
export function completeness(params: {
  dayOne: string;
  today: string;
  durationDays: number;
  statusDates: string[];
}): { filled: number; elapsed: number } {
  const elapsed = Math.min(
    params.durationDays,
    Math.max(0, diffDays(params.dayOne, params.today) + 1),
  );
  const last = addDays(params.dayOne, elapsed - 1);
  const filled = params.statusDates.filter(
    (d) => diffDays(params.dayOne, d) >= 0 && diffDays(d, last) >= 0,
  ).length;
  return { filled, elapsed };
}
