/** Label ID Responden berurutan (R001, R002, …). Modul murni. */

function formatLabel(prefix: string, n: number, width = 3): string {
  return `${prefix}${String(n).padStart(width, "0")}`;
}

/** Nomor berikutnya setelah label terbesar dengan awalan yang sama. */
export function nextLabelNumber(existingLabels: string[], prefix: string): number {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const l of existingLabels) {
    const m = re.exec(l);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** Deret label, mis. ("R", 1, 50) → R001…R050. Lebar mengikuti angka terbesar, minimal 3 digit. */
export function labelRange(prefix: string, start: number, count: number): string[] {
  const width = Math.max(3, String(start + count - 1).length);
  return Array.from({ length: count }, (_, i) => formatLabel(prefix, start + i, width));
}
