/** Estimasi gula (gram) dari tabel referensi. Selalu ditampilkan sebagai "perkiraan". Modul murni. */
export type SugarLevel = "normal" | "less" | "none";

export type SugarFactors = { less: number; none: number };

export function estimateSugarG(input: {
  sugarGPerServing: number;
  defaultVolumeMl: number;
  volumeMl: number;
  servings: number;
  sugarLevel: SugarLevel | null;
  sugarLevelApplicable: boolean;
  factors: SugarFactors;
}): number {
  const perMl = input.sugarGPerServing / input.defaultVolumeMl;
  const level = input.sugarLevelApplicable ? (input.sugarLevel ?? "normal") : "normal";
  const factor = level === "less" ? input.factors.less : level === "none" ? input.factors.none : 1;
  const grams = perMl * input.volumeMl * input.servings * factor;
  return Math.round(grams * 10) / 10;
}

/** Preset ukuran (FR-R-02). */
export const SIZE_PRESETS = [
  { label: "Gelas kecil", ml: 200 },
  { label: "Gelas sedang", ml: 300 },
  { label: "Gelas besar", ml: 500 },
  { label: "Botol/kaleng", ml: 330 },
  { label: "Botol besar", ml: 600 },
] as const;

export const SUGAR_LEVEL_LABELS: Record<SugarLevel, string> = {
  normal: "Normal",
  less: "Less sugar",
  none: "No sugar",
};
