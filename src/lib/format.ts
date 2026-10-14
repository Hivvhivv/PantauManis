/** Format tampilan: waktu disimpan UTC, ditampilkan Asia/Jakarta (DD MMM YYYY). */
const TZ = "Asia/Jakarta";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: TZ,
});
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
// Kolom DATE (tanpa jam) disimpan sebagai tengah malam UTC; tampilkan apa adanya.
const plainDateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(d: Date | string | null | undefined): string {
  return d ? dateFmt.format(new Date(d)) : "—";
}

export function formatDateTime(d: Date | string | null | undefined): string {
  return d ? `${dateTimeFmt.format(new Date(d))} WIB` : "—";
}

export function formatPlainDate(d: Date | string | null | undefined): string {
  return d ? plainDateFmt.format(new Date(d)) : "—";
}

/** Nilai untuk <input type="date">. */
export function toDateInput(d: Date | string | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

/** "6/14", atau "Selesai (hari 20)" setelah periode berakhir. */
export function studyDayLabel(p: { studyDay: number | null; durationDays: number }): string {
  if (p.studyDay === null) return "—";
  return p.studyDay > p.durationDays
    ? `Selesai (hari ${p.studyDay})`
    : `${p.studyDay}/${p.durationDays}`;
}

/** Tanggal "YYYY-MM-DD" (tanpa jam) → "14 Okt 2026". */
export function formatLocalDate(d: string): string {
  return formatPlainDate(`${d}T00:00:00Z`);
}

export const ROLE_LABELS = {
  superadmin: "Superadmin",
  admin: "Admin",
  respondent: "Responden",
} as const;
