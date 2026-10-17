/**
 * Siapa yang menerima pengingat hari ini (ADR-011). Modul murni.
 * - "posttest": jendela posttest terbuka dan belum dikirim (prioritas).
 * - "daily": dalam periode (hari ke-1..durasi) dan hari ini masih Belum diisi.
 *   Hari Nol dan Terisi sudah tercatat, jadi tidak diingatkan (BR-02).
 * Paling banyak satu pengingat per responden per hari.
 */
import { posttestState } from "@/server/modules/study/posttest";
import { studyDayOf } from "@/server/modules/study/days";

export type ReminderKind = "daily" | "posttest";

export function reminderFor(p: {
  dayOne: string;
  today: string;
  durationDays: number;
  graceDays: number;
  /** Ada baris daily_status hari ini (Terisi atau Nol). */
  recordedToday: boolean;
  posttestSubmitted: boolean;
}): ReminderKind | null {
  const pt = posttestState({
    dayOne: p.dayOne,
    today: p.today,
    durationDays: p.durationDays,
    graceDays: p.graceDays,
    submitted: p.posttestSubmitted,
  });
  if (pt === "open") return "posttest";
  const day = studyDayOf(p.dayOne, p.today);
  if (day >= 1 && day <= p.durationDays && !p.recordedToday) return "daily";
  return null;
}

/** Isi notifikasi: netral, tanpa nama, angka gula, atau label kesehatan (BR-10). */
export const REMINDER_MESSAGES: Record<ReminderKind, { title: string; body: string; url: string }> =
  {
    daily: {
      title: "PantauManis",
      body: "Sudah catat minuman manis hari ini? Ketuk untuk mencatat 🥤",
      url: "/catat",
    },
    posttest: {
      title: "PantauManis",
      body: "Kuesioner akhir sudah tersedia. Hanya beberapa menit!",
      url: "/posttest",
    },
  };
