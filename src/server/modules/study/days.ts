/**
 * Kalender penelitian (BR-01, BR-05, ADR-005). Modul murni.
 * Tanggal lokal ditulis sebagai string "YYYY-MM-DD" menurut Asia/Jakarta.
 */
const STUDY_TZ = "Asia/Jakarta";

const localFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Tanggal lokal (Asia/Jakarta) dari sebuah waktu. */
export function localDateOf(d: Date): string {
  return localFmt.format(d);
}

/** "YYYY-MM-DD" → Date tengah malam UTC (untuk kolom @db.Date). */
export function toDbDate(local: string): Date {
  return new Date(`${local}T00:00:00.000Z`);
}

/** Date dari kolom @db.Date → "YYYY-MM-DD". */
export function fromDbDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(local: string, n: number): string {
  const d = toDbDate(local);
  d.setUTCDate(d.getUTCDate() + n);
  return fromDbDate(d);
}

/** Selisih hari b − a. */
export function diffDays(a: string, b: string): number {
  return Math.round((toDbDate(b).getTime() - toDbDate(a).getTime()) / 86_400_000);
}

/** Hari penelitian: tanggal pretest = hari ke-1. */
export function studyDayOf(dayOne: string, date: string): number {
  return diffDays(dayOne, date) + 1;
}

/** Daftar tanggal dari `from` sampai `to` (inklusif). */
export function dateRange(from: string, to: string): string[] {
  const n = diffDays(from, to);
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addDays(from, i));
}

/**
 * Tanggal yang boleh dicatat/diubah hari ini: hari ini sampai `backfillDays` ke belakang,
 * tetapi tidak sebelum hari ke-1 (BR-04, BR-05).
 */
export function editableDates(today: string, dayOne: string, backfillDays: number): string[] {
  const from = [addDays(today, -backfillDays), dayOne].sort().at(-1)!;
  return dateRange(from, today);
}

/** Waktu lokal Jakarta "YYYY-MM-DDTHH:mm" → Date (UTC). Jakarta tidak memakai DST (UTC+7). */
export function fromLocalDateTime(local: string): Date {
  return new Date(`${local}:00+07:00`);
}

/** Date → "YYYY-MM-DDTHH:mm" waktu Jakarta (untuk <input type="datetime-local">). */
export function toLocalDateTime(d: Date): string {
  const shifted = new Date(d.getTime() + 7 * 3_600_000);
  return shifted.toISOString().slice(0, 16);
}
