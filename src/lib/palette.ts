/** Warna kategori untuk grafik komposisi dan legendanya (harus sama di keduanya). */
const CATEGORY_COLORS = [
  "#c96f3b",
  "#d9a35c",
  "#8a9a5b",
  "#e3c25a",
  "#6f97c4",
  "#a98bc4",
  "#c9b8a6",
  "#7e4722",
];

export const categoryColor = (i: number) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]!;
