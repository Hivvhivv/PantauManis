import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/respondent/login/route";
import { POST as consent } from "@/app/api/respondent/consent/route";
import * as pretest from "@/app/api/respondent/pretest/route";
import { POST as createLog } from "@/app/api/respondent/logs/route";
import { prisma } from "@/server/db";
import { localDateOf } from "@/server/modules/study/days";
import { at, call, cookieFrom, makeRespondent, seededBeverage } from "../support/helpers";

async function freshLogin() {
  const r = await makeRespondent();
  const res = await call(login, { body: { code: r.code } });
  return { r, res, cookie: cookieFrom(res, "pm_resp")! };
}

async function questions() {
  const q = await prisma.questionnaire.findFirstOrThrow({
    where: { type: "pretest", isActive: true },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  return q.questions;
}

describe("persetujuan dan pretest (FR-R-01, BR-06, BR-07)", () => {
  it("alur login pertama: persetujuan → beranda (tombol pretest) → pretest", async () => {
    const { r, res, cookie } = await freshLogin();
    expect(res.json.redirectTo).toBe("/persetujuan");

    // Setelah setuju, responden masuk Beranda yang menampilkan tombol Isi Kuesioner Awal.
    const c = await call(consent, { cookie, body: { agree: true } });
    expect(c.json.redirectTo).toBe("/beranda");

    const qs = await questions();
    const answers = Object.fromEntries(
      qs.map((q) => [
        q.id,
        q.type === "text" ? "teh manis" : (q.options as { value: string }[])[0]!.value,
      ]),
    );
    const sent = await call(pretest.POST, { cookie, body: { answers } });
    expect(sent.status).toBe(200);
    expect(sent.json.redirectTo).toBe("/beranda");

    const row = await prisma.respondent.findUniqueOrThrow({ where: { id: r.id } });
    expect(row.dayOneDate!.toISOString().slice(0, 10)).toBe(localDateOf(new Date()));

    // Login berikutnya langsung ke beranda.
    expect((await call(login, { body: { code: r.code } })).json.redirectTo).toBe("/beranda");
  });

  it("pretest ditolak sebelum persetujuan", async () => {
    const { cookie } = await freshLogin();
    const res = await call(pretest.PUT, { method: "PUT", cookie, body: { answers: {} } });
    expect(res.status).toBe(422);
    expect(res.json.error.code).toBe("CONSENT_REQUIRED");
  });

  it("BR-06: pencatatan ditolak sebelum pretest", async () => {
    const { cookie } = await freshLogin();
    await call(consent, { cookie, body: { agree: true } });
    const bev = await seededBeverage("Teh manis");
    const res = await call(createLog, {
      cookie,
      body: {
        beverageTypeId: bev.id,
        volumeMl: 250,
        servings: 1,
        consumedAt: at(localDateOf(new Date())),
      },
    });
    expect(res.status).toBe(403);
    expect(res.json.error.code).toBe("PRETEST_REQUIRED");
  });

  it("draf boleh sebagian; kirim wajib lengkap; setelah dikirim terkunci", async () => {
    const { cookie } = await freshLogin();
    await call(consent, { cookie, body: { agree: true } });
    const qs = await questions();
    const first = qs[0]!;
    const firstValue = (first.options as { value: string }[])[0]!.value;

    expect(
      (
        await call(pretest.PUT, {
          method: "PUT",
          cookie,
          body: { answers: { [first.id]: firstValue } },
        })
      ).status,
    ).toBe(200);
    const draft = await call(pretest.GET, { cookie });
    expect(draft.json.status).toBe("draft");
    expect(draft.json.answers[first.id]).toBe(firstValue);
    // Skor pilihan tidak dikirim ke browser.
    expect(JSON.stringify(draft.json)).not.toContain('"score"');

    const incomplete = await call(pretest.POST, { cookie, body: { answers: {} } });
    expect(incomplete.status).toBe(422);
    expect(Object.keys(incomplete.json.error.fields)).toContain(qs[1]!.id);

    const all = Object.fromEntries(
      qs
        .filter((q) => q.type !== "text")
        .map((q) => [q.id, (q.options as { value: string }[]).at(-1)!.value]),
    );
    expect((await call(pretest.POST, { cookie, body: { answers: all } })).status).toBe(200);

    const again = await call(pretest.PUT, { method: "PUT", cookie, body: { answers: all } });
    expect(again.json.error.code).toBe("ALREADY_SUBMITTED");
    const resp = await prisma.questionnaireResponse.findFirstOrThrow();
    expect(resp.status).toBe("submitted");
    expect(resp.score).toBeGreaterThan(0);
  });

  it("menolak pilihan jawaban yang tidak ada", async () => {
    const { cookie } = await freshLogin();
    await call(consent, { cookie, body: { agree: true } });
    const qs = await questions();
    const res = await call(pretest.PUT, {
      method: "PUT",
      cookie,
      body: { answers: { [qs[0]!.id]: "99" } },
    });
    expect(res.status).toBe(422);
  });

  it("persetujuan wajib dicentang", async () => {
    const { cookie } = await freshLogin();
    expect((await call(consent, { cookie, body: { agree: false } })).status).toBe(422);
  });
});
