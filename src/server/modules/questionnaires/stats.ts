import "server-only";
import { prisma } from "@/server/db";
import type { QuestionOption } from "./scoring";

/**
 * Rata-rata skor per soal dari seluruh responden, untuk pretest atau posttest.
 *
 * CADANGAN: sengaja belum dipanggil halaman atau endpoint mana pun (tidak tampil di aplikasi).
 * Bila dibutuhkan, panggil dari halaman staf yang sudah memakai `staffForPage()`, mis.:
 *   const rows = await questionAverages("pretest");
 *
 * - Hanya jawaban yang sudah dikirim (bukan draf); responden yang dihapus tidak ikut (BR-11).
 * - Skor diambil dari pilihan jawaban (skala 1–5 atau pilihan ganda); soal isian dilewati.
 * - n = jumlah responden yang menjawab soal itu; mean = null bila belum ada jawaban.
 */
export async function questionAverages(type: "pretest" | "posttest") {
  const q = await prisma.questionnaire.findFirst({
    where: { type, isActive: true },
    orderBy: { version: "desc" },
    include: {
      questions: {
        where: { type: { not: "text" } },
        orderBy: { order: "asc" },
        include: {
          answers: {
            where: {
              response: { status: "submitted", respondent: { deletedAt: null } },
            },
            select: { value: true },
          },
        },
      },
    },
  });
  if (!q) return [];
  return q.questions.map((item) => {
    const opts = (item.options as QuestionOption[] | null) ?? [];
    const scores = item.answers
      .map((a) => opts.find((o) => o.value === a.value)?.score)
      .filter((s): s is number => typeof s === "number");
    return {
      order: item.order,
      text: item.text,
      type: item.type,
      n: scores.length,
      mean: scores.length
        ? Math.round((scores.reduce((t, s) => t + s, 0) / scores.length) * 100) / 100
        : null,
    };
  });
}
