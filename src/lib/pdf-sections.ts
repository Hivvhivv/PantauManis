/** Bagian laporan PDF yang bisa dicentang (ADR-009). */
export const PDF_SECTIONS = {
  keseluruhan: "Ringkasan keseluruhan (agregat semua responden)",
  ringkasan: "Ringkasan & grafik",
  kalender: "Kalender kelengkapan",
  log: "Log konsumsi",
  target: "Target",
  kuesioner: "Pretest & posttest",
  edukasi: "Edukasi",
} as const;

export type PdfSection = keyof typeof PDF_SECTIONS;

/** Bagian untuk PDF satu responden (tanpa agregat). */
export const RESPONDENT_SECTIONS = Object.keys(PDF_SECTIONS).filter(
  (k) => k !== "keseluruhan",
) as PdfSection[];

/** Dari query `?b=…&b=…`. Tidak ada yang valid = semua bagian yang diizinkan. */
export function parseSections(
  raw: string | string[] | undefined,
  allowed: readonly PdfSection[],
): PdfSection[] {
  const picked = [raw ?? []]
    .flat()
    .filter((s): s is PdfSection => allowed.includes(s as PdfSection));
  return picked.length ? allowed.filter((s) => picked.includes(s)) : [...allowed];
}
