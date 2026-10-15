import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUT as saveRoute } from "@/app/api/admin/questionnaire/route";
import * as pretest from "@/app/api/respondent/pretest/route";
import { prisma } from "@/server/db";
import { getInstrument, toOptions } from "@/server/modules/questionnaires/admin";
import {
  call,
  makeStaff,
  readyRespondent,
  respondentCookie,
  makeRespondent,
  staffCookie,
} from "../support/helpers";

// Soal contoh dari migration tidak ikut di-TRUNCATE antar test: simpan lalu pulihkan.
type Snapshot = Awaited<ReturnType<typeof snapshot>>;
let saved: Snapshot;
async function snapshot() {
  return prisma.questionnaire.findMany({ where: { isActive: true }, include: { questions: true } });
}
beforeEach(async () => {
  saved = await snapshot();
});
afterEach(async () => {
  const ids = saved.map((q) => q.id);
  await prisma.questionnaireResponse.deleteMany({ where: { questionnaireId: { in: ids } } });
  await prisma.question.deleteMany({ where: { questionnaireId: { in: ids } } });
  for (const q of saved) {
    await prisma.question.createMany({
      data: q.questions.map(({ options, ...rest }) => ({ ...rest, options: options ?? undefined })),
    });
    await prisma.questionnaire.update({
      where: { id: q.id },
      data: { isPlaceholder: q.isPlaceholder },
    });
  }
});

const INSTRUMENT = {
  questions: [
    {
      type: "likert",
      text: "Seberapa sering kamu minum minuman manis?",
      required: true,
      labels: ["Tidak pernah", "Jarang", "Kadang-kadang", "Sering", "Selalu"],
      reverse: false,
    },
    {
      type: "likert",
      text: "Saya sulit menolak minuman manis.",
      required: true,
      labels: ["1", "2", "3", "4", "5"],
      reverse: true,
    },
    {
      type: "choice",
      text: "Ukuran gelas favorit?",
      required: false,
      choices: [
        { label: "Kecil", score: 0 },
        { label: "Besar", score: 2 },
      ],
    },
    { type: "text", text: "Minuman favoritmu?", required: false },
  ],
};

async function staff() {
  const a = await makeStaff("admin");
  return staffCookie(a.id);
}

describe("Kuesioner oleh staf (ADR-010)", () => {
  it("menyimpan satu set soal untuk pretest DAN posttest, dengan skor terbalik", async () => {
    const cookie = await staff();
    const res = await call(saveRoute, { cookie, method: "PUT", body: INSTRUMENT });
    expect(res.status).toBe(200);

    for (const type of ["pretest", "posttest"] as const) {
      const q = await prisma.questionnaire.findFirstOrThrow({
        where: { type, isActive: true },
        include: { questions: { orderBy: { order: "asc" } } },
      });
      expect(q.isPlaceholder).toBe(false);
      expect(q.questions.map((x) => [x.order, x.type, x.text])).toEqual([
        [1, "likert", "Seberapa sering kamu minum minuman manis?"],
        [2, "likert", "Saya sulit menolak minuman manis."],
        [3, "choice", "Ukuran gelas favorit?"],
        [4, "text", "Minuman favoritmu?"],
      ]);
      expect(q.questions[3]!.options).toBeNull();
    }
    const inst = await getInstrument();
    expect(inst.questions[1]).toMatchObject({ type: "likert", reverse: true });
    expect(await prisma.auditLog.count({ where: { action: "questionnaire.updated" } })).toBe(1);
  });

  it("skor terbalik: tingkat 1 bernilai 5; nilai jawaban tetap kode 1..5", () => {
    const opts = toOptions({
      type: "likert",
      text: "x",
      required: true,
      labels: ["a", "b", "c", "d", "e"],
      reverse: true,
    })!;
    expect(opts.map((o) => [o.value, o.score])).toEqual([
      ["1", 5],
      ["2", 4],
      ["3", 3],
      ["4", 2],
      ["5", 1],
    ]);
  });

  it("validasi server: teks kosong dan skala bukan 5 tingkat ditolak", async () => {
    const cookie = await staff();
    const res = await call(saveRoute, {
      cookie,
      method: "PUT",
      body: {
        questions: [
          { type: "likert", text: " ", required: true, labels: ["a", "b"], reverse: false },
        ],
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.error.fields["questions.0.text"]).toBeTruthy();
    expect(res.json.error.fields["questions.0.labels"]).toBeTruthy();
  });

  it("terkunci begitu ada responden yang mulai mengisi", async () => {
    const cookie = await staff();
    const r = await makeRespondent();
    await prisma.respondent.update({ where: { id: r.id }, data: { consentAt: new Date() } });
    const q = await prisma.question.findFirstOrThrow({
      where: { questionnaire: { type: "pretest", isActive: true }, type: "likert" },
    });
    const draft = await call(pretest.PUT, {
      cookie: await respondentCookie(r.id),
      method: "PUT",
      body: { answers: { [q.id]: "1" } },
    });
    expect(draft.status).toBe(200);

    expect((await getInstrument()).locked).toBe(true);
    const res = await call(saveRoute, { cookie, method: "PUT", body: INSTRUMENT });
    expect(res.status).toBe(422);
    expect(res.json.error.code).toBe("QUESTIONNAIRE_LOCKED");
  });

  it("hanya staf: responden ditolak", async () => {
    const r = await readyRespondent();
    const res = await call(saveRoute, { cookie: r.cookie, method: "PUT", body: INSTRUMENT });
    expect(res.status).toBe(401);
  });
});
