import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as goal from "@/app/api/respondent/goal/route";
import * as posttest from "@/app/api/respondent/posttest/route";
import * as zero from "@/app/api/respondent/days/zero/route";
import { POST as createLog } from "@/app/api/respondent/logs/route";
import { GET as results } from "@/app/api/admin/respondents/[id]/results/route";
import { GET as detail } from "@/app/api/admin/respondents/[id]/route";
import { GET as adminDashboard } from "@/app/api/admin/dashboard/route";
import { setAccessStatus } from "@/server/modules/respondents/service";
import * as settings from "@/app/api/superadmin/settings/route";
import { prisma } from "@/server/db";
import { addDays } from "@/server/modules/study/days";
import { getStudySettings } from "@/server/modules/study/settings";
import {
  at,
  call,
  makeRespondent,
  makeStaff,
  readyRespondent,
  seededBeverage,
  staffCookie,
} from "../support/helpers";

type Ready = Awaited<ReturnType<typeof readyRespondent>>;

async function fullAnswers(type: "pretest" | "posttest") {
  const q = await prisma.questionnaire.findFirstOrThrow({
    where: { type, isActive: true },
    include: { questions: true },
  });
  return Object.fromEntries(
    q.questions.map((x) => [
      x.id,
      x.type === "text" ? "teh" : (x.options as { value: string }[])[1]!.value,
    ]),
  );
}

const logTeh = async (r: Ready, date: string, servings = 1) => {
  const teh = await seededBeverage("Teh manis");
  return call(createLog, {
    cookie: r.cookie,
    body: { beverageTypeId: teh.id, volumeMl: 250, servings, consumedAt: at(date) },
  });
};

describe("target dan umpan balik (FR-R-06)", () => {
  it("menetapkan target, menolak ubah sebelum 7 hari, mengizinkan setelahnya", async () => {
    const r = await readyRespondent(-3);
    const set = await call(goal.POST, {
      cookie: r.cookie,
      body: { metric: "drinks", targetValue: 1 },
    });
    expect(set.status).toBe(200);
    expect(set.json.active).toMatchObject({ metric: "drinks", targetValue: 1 });
    expect(set.json.canChange).toBe(false);

    const again = await call(goal.POST, {
      cookie: r.cookie,
      body: { metric: "sugar", targetValue: 25 },
    });
    expect(again.status).toBe(422);
    expect(again.json.error.code).toBe("GOAL_CHANGE_TOO_SOON");

    // Mundurkan target pertama 8 hari → boleh diubah.
    await prisma.goal.updateMany({
      where: { respondentId: r.id },
      data: { validFrom: new Date(Date.now() - 8 * 86_400_000) },
    });
    const changed = await call(goal.POST, {
      cookie: r.cookie,
      body: { metric: "sugar", targetValue: 25 },
    });
    expect(changed.status).toBe(200);
    expect(changed.json.history).toHaveLength(2);
    expect(changed.json.history[1].validTo).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "goal.set" } })).toBe(2);
  });

  it("menolak nilai di luar batas", async () => {
    const r = await readyRespondent(-1);
    for (const body of [
      { metric: "drinks", targetValue: 1.5 },
      { metric: "drinks", targetValue: 21 },
      { metric: "sugar", targetValue: -1 },
      { metric: "kalori", targetValue: 5 },
    ]) {
      expect((await call(goal.POST, { cookie: r.cookie, body })).status).toBe(422);
    }
  });

  it("progres: Nol dinilai, Belum diisi tidak; pesan positif", async () => {
    const r = await readyRespondent(-3);
    await prisma.goal.create({
      data: {
        respondentId: r.id,
        metric: "drinks",
        targetValue: 1,
        validFrom: new Date(Date.now() - 5 * 86_400_000),
      },
    });
    await logTeh(r, addDays(r.today, -2), 1); // tercapai
    await logTeh(r, addDays(r.today, -1), 3); // tidak tercapai
    await call(zero.POST, { cookie: r.cookie, body: { date: r.today } }); // Nol, tercapai
    const s = await call(goal.GET, { cookie: r.cookie });
    expect(s.json.progress).toMatchObject({ recorded: 3, achieved: 2, empty: 1 });
    expect(s.json.message).toContain("2 dari 3 hari");
  });
});

describe("posttest (FR-R-07, BR-06)", () => {
  it("belum dibuka sebelum hari ke-14", async () => {
    const r = await readyRespondent(-5);
    const g = await call(posttest.GET, { cookie: r.cookie });
    expect(g.json).toMatchObject({ state: "not_yet", questionnaire: null });
    const put = await call(posttest.PUT, {
      method: "PUT",
      cookie: r.cookie,
      body: { answers: {} },
    });
    expect(put.json.error.code).toBe("POSTTEST_NOT_OPEN");
  });

  it("terbuka hari ke-14, terkunci setelah dikirim, hari ke-1 tidak berubah", async () => {
    const r = await readyRespondent(-13);
    const g = await call(posttest.GET, { cookie: r.cookie });
    expect(g.json.state).toBe("open");
    expect(g.json.questionnaire.questions.length).toBeGreaterThan(0);

    const sent = await call(posttest.POST, {
      cookie: r.cookie,
      body: { answers: await fullAnswers("posttest") },
    });
    expect(sent.status).toBe(200);
    expect(sent.json.redirectTo).toBe("/posttest/selesai");
    expect((await call(posttest.GET, { cookie: r.cookie })).json.state).toBe("submitted");

    const again = await call(posttest.POST, {
      cookie: r.cookie,
      body: { answers: await fullAnswers("posttest") },
    });
    expect(again.json.error.code).toBe("ALREADY_SUBMITTED");
    const row = await prisma.respondent.findUniqueOrThrow({ where: { id: r.id } });
    expect(row.dayOneDate!.toISOString().slice(0, 10)).toBe(r.dayOne);
  });

  it("ditutup setelah masa tenggang", async () => {
    const r = await readyRespondent(-20);
    expect((await call(posttest.GET, { cookie: r.cookie })).json.state).toBe("closed");
    const put = await call(posttest.PUT, {
      method: "PUT",
      cookie: r.cookie,
      body: { answers: {} },
    });
    expect(put.json.error.code).toBe("POSTTEST_CLOSED");
  });
});

describe("Lihat Hasil Responden (FR-A-04, AC-04, AC-05)", () => {
  it("AC-04: detail tidak memuat data hasil dan tidak dicatat sebagai pembukaan hasil", async () => {
    const admin = await makeStaff("admin");
    const cookie = await staffCookie(admin.id);
    const r = await readyRespondent(-2);
    await logTeh(r, r.today);
    const d = await call(detail, { cookie, params: { id: r.id } });
    expect(d.status).toBe(200);
    for (const key of ["dashboard", "logs", "goals", "pretest", "posttest"])
      expect(d.json).not.toHaveProperty(key);
    expect(await prisma.auditLog.count({ where: { action: "respondent.results_viewed" } })).toBe(0);
  });

  it("AC-05: setiap pembukaan mengembalikan hasil dan menambah satu baris audit", async () => {
    const admin = await makeStaff("admin");
    const cookie = await staffCookie(admin.id);
    const r = await readyRespondent(-2);
    await logTeh(r, r.today, 2);

    const first = await call(results, { cookie, params: { id: r.id } });
    expect(first.status).toBe(200);
    expect(first.json.started).toBe(true);
    expect(first.json.logs).toHaveLength(1);
    expect(first.json.dashboard.calendar).toHaveLength(14);
    expect(first.json.pretest.answers.length).toBeGreaterThan(0);
    await call(results, { cookie, params: { id: r.id } });

    const logs = await prisma.auditLog.findMany({ where: { action: "respondent.results_viewed" } });
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ actorId: admin.id, targetId: r.id });
  });

  it("responden yang belum mulai: hasil kosong yang jelas", async () => {
    const admin = await makeStaff("admin");
    const r = await makeRespondent();
    const res = await call(results, { cookie: await staffCookie(admin.id), params: { id: r.id } });
    expect(res.json.started).toBe(false);
  });

  it("responden tidak bisa mengakses hasil siapa pun", async () => {
    const r = await readyRespondent(-1);
    expect((await call(results, { cookie: r.cookie, params: { id: r.id } })).status).toBe(401);
  });
});

describe("Dashboard Admin agregat (FR-A-01)", () => {
  it("status, rata-rata per hari ke- (Nol dihitung, Belum diisi tidak), corong, perlu perhatian", async () => {
    const admin = await makeStaff("admin");
    const cookie = await staffCookie(admin.id);
    await makeRespondent(null, "R001"); // belum mulai
    const a = await readyRespondent(-1, "R002"); // aktif: hari ke-1 isi 2 porsi, hari ke-2 Nol
    await logTeh(a, a.dayOne, 2);
    await call(zero.POST, { cookie: a.cookie, body: { date: a.today } });
    const b = await readyRespondent(-1, "R003"); // aktif: hari ke-1 Nol
    await call(zero.POST, { cookie: b.cookie, body: { date: b.dayOne } });
    const c = await readyRespondent(-4, "R004"); // aktif, belum pernah mengisi → perlu perhatian
    void c;
    const d = await readyRespondent(-1, "R005");
    await setAccessStatus(d.id, "inactive", { type: "system", id: null, ip: null });

    const res = await call(adminDashboard, { cookie });
    expect(res.status).toBe(200);
    const counts = Object.fromEntries(
      res.json.counts.map((x: { key: string; value: number }) => [x.key, x.value]),
    );
    expect(counts).toEqual({ not_started: 1, active: 3, done: 0, inactive: 1 });
    expect(res.json.perDay[0]).toEqual({ studyDay: 1, n: 2, avgSugarG: 20, avgDrinks: 1 });
    expect(res.json.perDay[1]).toMatchObject({ studyDay: 2, n: 1, avgDrinks: 0 });
    expect(res.json.funnel.map((f: { value: number }) => f.value)).toEqual([5, 4, 2, 0]);
    expect(res.json.attention.map((x: { label: string }) => x.label)).toEqual(["R004"]);

    const onlyActive = await call(adminDashboard, {
      cookie,
      url: "/api/admin/dashboard?status=active",
    });
    expect(onlyActive.json.total).toBe(3);
  });

  it("responden tidak bisa membuka dashboard admin", async () => {
    const r = await readyRespondent(-1);
    expect((await call(adminDashboard, { cookie: r.cookie })).status).toBe(401);
  });
});

describe("Pengaturan Penelitian (FR-S-04)", () => {
  let original: Awaited<ReturnType<typeof prisma.studySetting.findMany>>;
  beforeEach(async () => {
    original = await prisma.studySetting.findMany();
  });
  afterEach(async () => {
    // study_settings tidak dikosongkan antar test: kembalikan nilai awal.
    for (const s of original) {
      await prisma.studySetting.update({ where: { key: s.key }, data: { value: s.value } });
    }
    // Kunci yang baru dibuat oleh test (mis. contact_text) dihapus lagi.
    await prisma.studySetting.deleteMany({
      where: { key: { notIn: original.map((s) => s.key) } },
    });
  });

  const body = (extra: Record<string, unknown> = {}) => ({
    durationDays: 14,
    posttestGraceDays: 3,
    backfillDays: 2,
    sugarFactorLess: 0.5,
    sugarFactorNone: 0,
    consentText: "Teks persetujuan resmi yang sudah disetujui komite etik penelitian.",
    ...extra,
  });

  it("Superadmin mengubah pengaturan; hanya kunci yang berubah dicatat", async () => {
    const s = await makeStaff("superadmin");
    const cookie = await staffCookie(s.id);
    const res = await call(settings.PUT, {
      method: "PUT",
      cookie,
      body: body({ backfillDays: 3 }),
    });
    expect(res.status).toBe(200);
    expect(res.json.changed.sort()).toEqual(["backfillDays", "consentText"]);
    const now = await getStudySettings();
    expect(now.backfillDays).toBe(3);
    expect(now.consentText).toContain("komite etik");
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "settings.updated" } });
    expect(JSON.stringify(log.metadata)).not.toContain("komite etik");
  });

  it("kontak bantuan: tersimpan, boleh dikosongkan, maksimal 300 karakter", async () => {
    const cookie = await staffCookie((await makeStaff("superadmin")).id);
    const save = (contactText: string) =>
      call(settings.PUT, { method: "PUT", cookie, body: body({ contactText }) });
    expect((await save("  WhatsApp Tim Peneliti 0812-0000-0000  ")).status).toBe(200);
    expect((await getStudySettings()).contactText).toBe("WhatsApp Tim Peneliti 0812-0000-0000");
    expect((await save("")).status).toBe(200);
    expect((await getStudySettings()).contactText).toBe("");
    const tooLong = await save("x".repeat(301));
    expect(tooLong.status).toBe(422);
    expect(tooLong.json.error.fields.contactText).toBeTruthy();
  });

  it("validasi nilai dan hanya Superadmin", async () => {
    const s = await makeStaff("superadmin");
    const bad = await call(settings.PUT, {
      method: "PUT",
      cookie: await staffCookie(s.id),
      body: body({ durationDays: 3, sugarFactorLess: 2 }),
    });
    expect(bad.status).toBe(422);
    expect(bad.json.error.fields).toHaveProperty("durationDays");
    expect(bad.json.error.fields).toHaveProperty("sugarFactorLess");

    const admin = await makeStaff("admin");
    expect((await call(settings.GET, { cookie: await staffCookie(admin.id) })).status).toBe(403);
  });
});
