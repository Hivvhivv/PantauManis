import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError, businessRule } from "@/server/http/errors";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import type { QuestionOption } from "./scoring";

/**
 * Pengelolaan soal kuesioner oleh staf (ADR-010). Satu set soal dipakai untuk pretest DAN
 * posttest agar skor bisa dibandingkan; soal dikunci begitu ada responden yang mulai mengisi.
 */

export const LIKERT_DEFAULT = ["Tidak pernah", "Jarang", "Kadang-kadang", "Sering", "Selalu"];

const text = z.string().trim().min(1, "Wajib diisi.").max(500, "Maksimal 500 karakter.");
const label = z.string().trim().min(1, "Wajib diisi.").max(60, "Maksimal 60 karakter.");

const itemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("likert"),
    text,
    required: z.boolean(),
    labels: z.array(label).length(5, "Skala harus 5 tingkat."),
    /** Skor terbalik: tingkat 1 bernilai 5 (untuk butir bernada negatif). */
    reverse: z.boolean(),
  }),
  z.object({
    type: z.literal("choice"),
    text,
    required: z.boolean(),
    choices: z
      .array(
        z.object({
          label,
          score: z.number({ error: "Skor harus angka." }).min(-100).max(100),
        }),
      )
      .min(2, "Minimal 2 pilihan.")
      .max(10, "Maksimal 10 pilihan."),
  }),
  z.object({ type: z.literal("text"), text, required: z.boolean() }),
]);

export const instrumentSchema = z.object({
  questions: z.array(itemSchema).min(1, "Minimal 1 soal.").max(50, "Maksimal 50 soal."),
});
export type InstrumentItem = z.infer<typeof itemSchema>;

/** Nilai jawaban = "1".."n" (dipakai sebagai kode angka di ekspor, ADR-007). */
export function toOptions(item: InstrumentItem): QuestionOption[] | null {
  if (item.type === "likert") {
    return item.labels.map((l, i) => ({
      value: String(i + 1),
      label: l,
      score: item.reverse ? 5 - i : i + 1,
    }));
  }
  if (item.type === "choice") {
    return item.choices.map((c, i) => ({ value: String(i + 1), label: c.label, score: c.score }));
  }
  return null;
}

function fromQuestion(q: {
  text: string;
  type: string;
  required: boolean;
  options: unknown;
}): InstrumentItem {
  const opts = (q.options as QuestionOption[] | null) ?? [];
  if (q.type === "likert" && opts.length === 5) {
    return {
      type: "likert",
      text: q.text,
      required: q.required,
      labels: opts.map((o) => o.label),
      reverse: opts[0]!.score > opts[4]!.score,
    };
  }
  if (q.type === "text") return { type: "text", text: q.text, required: q.required };
  return {
    type: "choice",
    text: q.text,
    required: q.required,
    choices: opts.map((o) => ({ label: o.label, score: o.score })),
  };
}

async function activePair() {
  const find = (type: "pretest" | "posttest") =>
    prisma.questionnaire.findFirst({
      where: { type, isActive: true },
      orderBy: { version: "desc" },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  const [pre, post] = await Promise.all([find("pretest"), find("posttest")]);
  if (!pre || !post) {
    throw new AppError(503, "QUESTIONNAIRE_UNAVAILABLE", "Kuesioner belum tersedia.");
  }
  return { pre, post };
}

/** Soal (diambil dari pretest; posttest selalu salinan yang sama) + status kunci. */
export async function getInstrument() {
  const { pre, post } = await activePair();
  const responses = await prisma.questionnaireResponse.count({
    where: { questionnaireId: { in: [pre.id, post.id] } },
  });
  return {
    questions: pre.questions.map(fromQuestion),
    isPlaceholder: pre.isPlaceholder,
    responses,
    locked: responses > 0,
  };
}

/** Ganti seluruh soal pretest dan posttest. Ditolak bila sudah ada jawaban responden. */
export async function saveInstrument(input: z.infer<typeof instrumentSchema>, actor: Actor) {
  const { pre, post } = await activePair();
  await prisma.$transaction(async (tx) => {
    const responses = await tx.questionnaireResponse.count({
      where: { questionnaireId: { in: [pre.id, post.id] } },
    });
    if (responses > 0) {
      throw businessRule(
        "QUESTIONNAIRE_LOCKED",
        "Soal tidak bisa diubah karena sudah ada responden yang mengisi kuesioner.",
      );
    }
    for (const q of [pre, post]) {
      await tx.question.deleteMany({ where: { questionnaireId: q.id } });
      await tx.question.createMany({
        data: input.questions.map((item, i) => ({
          questionnaireId: q.id,
          order: i + 1,
          text: item.text,
          type: item.type,
          required: item.required,
          options: toOptions(item) ?? undefined,
        })),
      });
      await tx.questionnaire.update({ where: { id: q.id }, data: { isPlaceholder: false } });
    }
    await writeAudit(
      {
        actor,
        action: AuditAction.QuestionnaireUpdated,
        metadata: { questions: input.questions.length },
      },
      tx,
    );
  });
}
