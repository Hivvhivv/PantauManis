/**
 * Target pribadi dan umpan balik berbasis aturan (FR-R-06, BR-10). Modul murni.
 * Umpan balik hanya membandingkan dengan target milik responden sendiri, bernada positif,
 * dan tidak pernah memuat label risiko atau diagnosis.
 */
import { addDays, diffDays } from "@/server/modules/study/days";
import type { DayPoint } from "@/server/modules/study/series";

export type GoalMetric = "drinks" | "sugar";

export const GOAL_LIMITS: Record<GoalMetric, { min: number; max: number; unit: string }> = {
  drinks: { min: 0, max: 20, unit: "minuman" },
  sugar: { min: 0, max: 500, unit: "g gula" },
};

const GOAL_CHANGE_INTERVAL_DAYS = 7;

/** Kata yang tidak boleh muncul di umpan balik (BR-10). */
export const FORBIDDEN_FEEDBACK_WORDS = [
  "risiko",
  "berisiko",
  "prediabetes",
  "diabetes",
  "diagnosis",
  "bahaya",
  "berbahaya",
  "gagal",
  "buruk",
  "obesitas",
];

export function goalLabel(metric: GoalMetric, value: number): string {
  return metric === "drinks"
    ? `Maksimal ${value} minuman manis per hari`
    : `Maksimal ${value} g gula dari minuman per hari`;
}

type WeekProgress = {
  /** Hari yang dinilai (tercatat: Terisi atau Nol) dalam 7 hari terakhir sejak target berlaku. */
  recorded: number;
  achieved: number;
  /** Hari "Belum diisi" dalam jendela yang sama; tidak dihitung tercapai maupun tidak. */
  empty: number;
  days: { date: string; state: DayPoint["state"]; value: number; achieved: boolean | null }[];
};

/**
 * Progres 7 hari terakhir (sampai hari ini), hanya sejak tanggal target mulai berlaku.
 * Hari Nol bernilai 0 dan dinilai; hari Belum diisi tidak dinilai.
 */
export function weekProgress(params: {
  days: DayPoint[];
  today: string;
  goalStart: string;
  metric: GoalMetric;
  target: number;
}): WeekProgress {
  const from = [addDays(params.today, -(GOAL_CHANGE_INTERVAL_DAYS - 1)), params.goalStart]
    .sort()
    .at(-1)!;
  const window = params.days.filter(
    (d) => diffDays(from, d.date) >= 0 && diffDays(d.date, params.today) >= 0,
  );
  const out = window.map((d) => {
    const value = params.metric === "drinks" ? d.drinks : d.sugarG;
    const recorded = d.state === "filled" || d.state === "zero";
    return {
      date: d.date,
      state: d.state,
      value,
      achieved: recorded ? value <= params.target : null,
    };
  });
  return {
    recorded: out.filter((d) => d.achieved !== null).length,
    achieved: out.filter((d) => d.achieved === true).length,
    empty: window.filter((d) => d.state === "empty").length,
    days: out,
  };
}

/** Kalimat umpan balik positif (contoh PRD: "Kamu mencapai target 4 dari 7 hari minggu ini"). */
export function feedbackMessage(p: WeekProgress | null): string {
  if (!p) return "Tetapkan target pribadimu untuk melihat progres mingguan di sini.";
  const emptyNote =
    p.empty > 0 ? ` Ada ${p.empty} hari yang belum diisi; yuk, lengkapi catatanmu.` : "";
  if (p.recorded === 0) return `Mulai catat minumanmu untuk melihat progres targetmu.${emptyNote}`;
  if (p.achieved === p.recorded) {
    return `Hebat! Kamu mencapai target di semua ${p.recorded} hari yang tercatat minggu ini. 🎉${emptyNote}`;
  }
  if (p.achieved > 0) {
    return `Kamu mencapai target ${p.achieved} dari ${p.recorded} hari yang tercatat minggu ini. Terus pertahankan! 💪${emptyNote}`;
  }
  return `Minggu ini targetmu belum tercapai, dan itu tidak apa-apa. Setiap hari adalah kesempatan baru untuk mencoba lagi. 🌱${emptyNote}`;
}

/** Tanggal paling cepat target boleh diubah lagi (sekali per minggu). */
export function nextChangeDate(lastChangeDate: string): string {
  return addDays(lastChangeDate, GOAL_CHANGE_INTERVAL_DAYS);
}
