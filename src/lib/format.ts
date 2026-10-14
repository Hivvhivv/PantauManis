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

export const ROLE_LABELS = {
  superadmin: "Superadmin",
  admin: "Admin",
  respondent: "Responden",
} as const;
