/** Validasi jawaban dan skor kuesioner. Modul murni. */
export type QuestionOption = { value: string; label: string; score: number };
export type QuestionDef = {
  id: string;
  type: "likert" | "choice" | "text";
  required: boolean;
  options: QuestionOption[] | null;
};

const TEXT_ANSWER_MAX = 2000;

/** Pesan error per id butir; kosong berarti valid. `requireAll` dipakai saat kirim, bukan saat simpan draf. */
export function validateAnswers(
  questions: QuestionDef[],
  answers: Record<string, string>,
  requireAll: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const known = new Set(questions.map((q) => q.id));
  for (const id of Object.keys(answers)) if (!known.has(id)) errors[id] = "Butir tidak dikenal.";

  for (const q of questions) {
    const v = answers[q.id]?.trim() ?? "";
    if (!v) {
      if (requireAll && q.required) errors[q.id] = "Wajib diisi.";
      continue;
    }
    if (q.type === "text") {
      if (v.length > TEXT_ANSWER_MAX) errors[q.id] = `Maksimal ${TEXT_ANSWER_MAX} karakter.`;
    } else if (!q.options?.some((o) => o.value === v)) {
      errors[q.id] = "Pilihan tidak valid.";
    }
  }
  return errors;
}

/** Skor = jumlah skor pilihan pada butir likert/pilihan. */
export function scoreAnswers(questions: QuestionDef[], answers: Record<string, string>): number {
  let total = 0;
  for (const q of questions) {
    if (q.type === "text") continue;
    const opt = q.options?.find((o) => o.value === answers[q.id]);
    if (opt) total += opt.score;
  }
  return total;
}
