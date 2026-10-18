import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import type { QuestionOption } from "@/server/modules/questionnaires/scoring";
import { questionAverages } from "@/server/modules/questionnaires/stats";
import { makeRespondent } from "../support/helpers";

describe("Rata-rata skor per soal (cadangan, belum ditampilkan)", () => {
  it("hanya jawaban terkirim dari responden yang tidak dihapus; soal isian dilewati", async () => {
    const q = await prisma.questionnaire.findFirstOrThrow({
      where: { type: "pretest", isActive: true },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    const scored = q.questions.filter((x) => x.type !== "text");
    const first = scored[0]!;
    const opts = first.options as QuestionOption[];

    async function respond(label: string, status: "draft" | "submitted", value: string) {
      const r = await makeRespondent(null, label);
      await prisma.questionnaireResponse.create({
        data: {
          respondentId: r.id,
          questionnaireId: q.id,
          status,
          submittedAt: status === "submitted" ? new Date() : null,
          answers: { create: { questionId: first.id, value } },
        },
      });
      return r;
    }
    await respond("R001", "submitted", opts[0]!.value);
    await respond("R002", "submitted", opts[2]!.value);
    await respond("R003", "draft", opts[opts.length - 1]!.value); // draf: tidak dihitung
    const gone = await respond("R004", "submitted", opts[opts.length - 1]!.value);
    await prisma.respondent.update({ where: { id: gone.id }, data: { deletedAt: new Date() } });

    const rows = await questionAverages("pretest");
    expect(rows.map((r) => r.order)).toEqual(scored.map((x) => x.order));
    expect(rows.some((r) => r.type === "text")).toBe(false);
    expect(rows[0]).toMatchObject({
      n: 2,
      mean: Math.round(((opts[0]!.score + opts[2]!.score) / 2) * 100) / 100,
    });
    for (const r of rows.slice(1)) expect(r).toMatchObject({ n: 0, mean: null });

    // Posttest dihitung terpisah dan belum punya jawaban.
    expect((await questionAverages("posttest")).every((r) => r.n === 0)).toBe(true);
  });
});
