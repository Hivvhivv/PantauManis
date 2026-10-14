import { describe, expect, it } from "vitest";
import { POST as createLog } from "@/app/api/respondent/logs/route";
import * as logById from "@/app/api/respondent/logs/[id]/route";
import * as zero from "@/app/api/respondent/days/zero/route";
import { GET as dashboard } from "@/app/api/respondent/dashboard/route";
import { GET as history } from "@/app/api/respondent/history/route";
import { GET as beverages } from "@/app/api/respondent/beverages/route";
import * as adminBev from "@/app/api/admin/beverage-types/route";
import * as adminBevById from "@/app/api/admin/beverage-types/[id]/route";
import { GET as adminList } from "@/app/api/admin/respondents/route";
import { prisma } from "@/server/db";
import { addDays, toDbDate } from "@/server/modules/study/days";
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

const log = (r: Ready, body: Record<string, unknown>) =>
  call(createLog, { cookie: r.cookie, body });
const status = async (r: Ready, date: string) =>
  (
    await prisma.dailyStatus.findUnique({
      where: { respondentId_date: { respondentId: r.id, date: toDbDate(date) } },
    })
  )?.status ?? "empty";

describe("pencatatan minuman (FR-R-02)", () => {
  it("menyimpan catatan, menghitung perkiraan gula, dan menandai hari Terisi", async () => {
    const r = await readyRespondent(-5);
    const teh = await seededBeverage("Teh manis"); // 20 g / 250 ml
    const res = await log(r, {
      beverageTypeId: teh.id,
      volumeMl: 500,
      servings: 1,
      sugarLevel: "normal",
      consumedAt: at(r.today),
    });
    expect(res.status).toBe(201);
    expect(res.json.sugarG).toBe(40);
    expect(res.json.studyDay).toBe(6);
    expect(await status(r, r.today)).toBe("filled");
    const row = await prisma.consumptionLog.findFirstOrThrow();
    expect(row).toMatchObject({ isBackfill: false, isOutOfPeriod: false, sugarLevel: "normal" });
  });

  it("tingkat gula diabaikan untuk minuman yang tidak relevan", async () => {
    const r = await readyRespondent(-1);
    const soda = await seededBeverage("Minuman bersoda");
    const res = await log(r, {
      beverageTypeId: soda.id,
      volumeMl: 330,
      servings: 1,
      sugarLevel: "none",
      consumedAt: at(r.today),
    });
    expect(res.json.sugarG).toBe(35);
    expect((await prisma.consumptionLog.findFirstOrThrow()).sugarLevel).toBeNull();
  });

  it("BR-04: menolak volume, porsi, dan waktu di luar batas", async () => {
    const r = await readyRespondent(-5);
    const teh = await seededBeverage("Teh manis");
    const base = { beverageTypeId: teh.id, volumeMl: 250, servings: 1, consumedAt: at(r.today) };
    expect((await log(r, { ...base, volumeMl: 0 })).json.error.fields).toHaveProperty("volumeMl");
    expect((await log(r, { ...base, volumeMl: 3001 })).json.error.fields).toHaveProperty(
      "volumeMl",
    );
    expect((await log(r, { ...base, servings: 11 })).json.error.fields).toHaveProperty("servings");
    expect(
      (await log(r, { ...base, consumedAt: at(addDays(r.today, 1)) })).json.error.fields,
    ).toHaveProperty("consumedAt");
    expect(await prisma.consumptionLog.count()).toBe(0);
  });

  it("BR-05: susulan maksimal 2 hari ke belakang dan tidak sebelum hari ke-1", async () => {
    const r = await readyRespondent(-5);
    const teh = await seededBeverage("Teh manis");
    const base = { beverageTypeId: teh.id, volumeMl: 250, servings: 1 };
    const ok = await log(r, { ...base, consumedAt: at(addDays(r.today, -2), "20:00") });
    expect(ok.status).toBe(201);
    expect((await prisma.consumptionLog.findFirstOrThrow()).isBackfill).toBe(true);
    expect((await log(r, { ...base, consumedAt: at(addDays(r.today, -3), "20:00") })).status).toBe(
      422,
    );

    const fresh = await readyRespondent(0);
    expect(
      (await log(fresh, { ...base, consumedAt: at(addDays(fresh.today, -1), "20:00") })).status,
    ).toBe(422);
  });

  it("jenis minuman nonaktif ditolak dan tidak muncul di daftar", async () => {
    const r = await readyRespondent(-1);
    const b = await prisma.beverageType.create({
      data: { name: "UJI nonaktif", defaultVolumeMl: 200, sugarGPerServing: 10, isActive: false },
    });
    expect(
      (await log(r, { beverageTypeId: b.id, volumeMl: 200, servings: 1, consumedAt: at(r.today) }))
        .status,
    ).toBe(422);
    const list = await call(beverages, { cookie: r.cookie });
    expect(list.json.types.map((t: { name: string }) => t.name)).not.toContain("UJI nonaktif");
  });

  it("catatan setelah hari ke-14 diizinkan dan ditandai di luar periode", async () => {
    const r = await readyRespondent(-20);
    const teh = await seededBeverage("Teh manis");
    const res = await log(r, {
      beverageTypeId: teh.id,
      volumeMl: 250,
      servings: 1,
      consumedAt: at(r.today),
    });
    expect(res.status).toBe(201);
    expect(res.json.studyDay).toBe(21);
    expect((await prisma.consumptionLog.findFirstOrThrow()).isOutOfPeriod).toBe(true);
  });
});

describe("Belum diisi vs Nol (BR-02, BR-03, AC-11)", () => {
  it("Nol berbeda dari Belum diisi di dashboard", async () => {
    const r = await readyRespondent(-3);
    expect((await call(zero.POST, { cookie: r.cookie, body: { date: r.today } })).status).toBe(200);
    const d = await call(dashboard, {
      cookie: r.cookie,
      url: "/api/respondent/dashboard?range=2w",
    });
    const byDate = new Map(
      d.json.days.map((x: { date: string; state: string }) => [x.date, x.state]),
    );
    expect(byDate.get(r.today)).toBe("zero");
    expect(byDate.get(addDays(r.today, -1))).toBe("empty");
    expect(d.json.summary).toMatchObject({ zeroDays: 1, emptyDays: 3 });
  });

  it("Nol ditolak bila hari itu sudah ada minuman", async () => {
    const r = await readyRespondent(-1);
    const teh = await seededBeverage("Teh manis");
    await log(r, { beverageTypeId: teh.id, volumeMl: 250, servings: 1, consumedAt: at(r.today) });
    const res = await call(zero.POST, { cookie: r.cookie, body: { date: r.today } });
    expect(res.status).toBe(409);
    expect(await status(r, r.today)).toBe("filled");
  });

  it("BR-03: menambah minuman di hari Nol mengubahnya menjadi Terisi", async () => {
    const r = await readyRespondent(-2);
    const yesterday = addDays(r.today, -1);
    await call(zero.POST, { cookie: r.cookie, body: { date: yesterday } });
    expect(await status(r, yesterday)).toBe("zero");
    const teh = await seededBeverage("Teh manis");
    await log(r, {
      beverageTypeId: teh.id,
      volumeMl: 250,
      servings: 1,
      consumedAt: at(yesterday, "15:00"),
    });
    expect(await status(r, yesterday)).toBe("filled");
  });

  it("menghapus minuman terakhir mengembalikan hari ke Belum diisi", async () => {
    const r = await readyRespondent(-1);
    const teh = await seededBeverage("Teh manis");
    const created = await log(r, {
      beverageTypeId: teh.id,
      volumeMl: 250,
      servings: 1,
      consumedAt: at(r.today),
    });
    const del = await call(logById.DELETE, {
      method: "DELETE",
      cookie: r.cookie,
      params: { id: created.json.id },
    });
    expect(del.status).toBe(200);
    expect(await status(r, r.today)).toBe("empty");
    expect((await prisma.consumptionLog.findFirstOrThrow()).deletedAt).not.toBeNull();
  });

  it("memindahkan catatan ke tanggal lain menyesuaikan status kedua hari", async () => {
    const r = await readyRespondent(-3);
    const teh = await seededBeverage("Teh manis");
    const created = await log(r, {
      beverageTypeId: teh.id,
      volumeMl: 250,
      servings: 1,
      consumedAt: at(r.today),
    });
    const yesterday = addDays(r.today, -1);
    const res = await call(logById.PATCH, {
      method: "PATCH",
      cookie: r.cookie,
      params: { id: created.json.id },
      body: {
        beverageTypeId: teh.id,
        volumeMl: 250,
        servings: 2,
        consumedAt: at(yesterday, "19:00"),
      },
    });
    expect(res.status).toBe(200);
    expect(await status(r, r.today)).toBe("empty");
    expect(await status(r, yesterday)).toBe("filled");
    expect((await prisma.consumptionLog.findFirstOrThrow()).sugarGSnapshot).toBe(40);
  });
});

describe("AC-07: data responden lain tidak pernah terkirim", () => {
  it("responden B tidak bisa membaca, mengubah, atau menghapus catatan A", async () => {
    const a = await readyRespondent(-2, "A001");
    const b = await readyRespondent(-2, "B001");
    const teh = await seededBeverage("Teh manis");
    const created = await log(a, {
      beverageTypeId: teh.id,
      volumeMl: 250,
      servings: 1,
      note: "rahasia A",
      consumedAt: at(a.today),
    });
    const p = { cookie: b.cookie, params: { id: created.json.id } };

    const get = await call(logById.GET, p);
    expect(get.status).toBe(404);
    expect(get.text).not.toContain("rahasia A");
    expect(
      (
        await call(logById.PATCH, {
          ...p,
          method: "PATCH",
          body: { beverageTypeId: teh.id, volumeMl: 999, servings: 1, consumedAt: at(b.today) },
        })
      ).status,
    ).toBe(404);
    expect((await call(logById.DELETE, { ...p, method: "DELETE" })).status).toBe(404);
    expect((await prisma.consumptionLog.findFirstOrThrow()).volumeMl).toBe(250);

    const dash = await call(dashboard, { cookie: b.cookie });
    expect(dash.json.summary.totalDrinks).toBe(0);
    const hist = await call(history, { cookie: b.cookie });
    expect(hist.text).not.toContain("rahasia A");
  });

  it("endpoint responden menolak sesi staf dan tanpa sesi", async () => {
    const admin = await makeStaff("admin");
    const cookie = await staffCookie(admin.id);
    for (const h of [dashboard, history, beverages]) {
      expect((await call(h, { cookie })).status).toBe(401);
      expect((await call(h, {})).status).toBe(401);
    }
  });
});

describe("Referensi Minuman (FR-A-06)", () => {
  const body = (extra: Record<string, unknown> = {}) => ({
    name: "UJI Es kopi",
    icon: "☕",
    defaultVolumeMl: 300,
    sugarGPerServing: 30,
    sugarLevelApplicable: true,
    source: "Tabel uji",
    needsVerification: false,
    isActive: true,
    sortOrder: 9,
    ...extra,
  });

  it("perubahan nilai tidak mengubah catatan lama (snapshot)", async () => {
    const admin = await makeStaff("admin");
    const cookie = await staffCookie(admin.id);
    const created = await call(adminBev.POST, { cookie, body: body() });
    expect(created.status).toBe(201);

    const r = await readyRespondent(-1);
    await log(r, {
      beverageTypeId: created.json.id,
      volumeMl: 300,
      servings: 1,
      consumedAt: at(r.today),
    });

    const upd = await call(adminBevById.PATCH, {
      method: "PATCH",
      cookie,
      params: { id: created.json.id },
      body: body({ sugarGPerServing: 60 }),
    });
    expect(upd.status).toBe(200);
    const second = await log(r, {
      beverageTypeId: created.json.id,
      volumeMl: 300,
      servings: 1,
      consumedAt: at(r.today),
    });
    expect(second.json.sugarG).toBe(60);
    const snapshots = (await prisma.consumptionLog.findMany({ orderBy: { createdAt: "asc" } })).map(
      (l) => l.sugarGSnapshot,
    );
    expect(snapshots).toEqual([30, 60]);
    expect(await prisma.auditLog.count({ where: { action: "beverage_type.updated" } })).toBe(1);
  });

  it("nama ganda ditolak; responden tidak bisa mengakses menu ini", async () => {
    const admin = await makeStaff("admin");
    const cookie = await staffCookie(admin.id);
    await call(adminBev.POST, { cookie, body: body() });
    expect(
      (await call(adminBev.POST, { cookie, body: body({ name: "uji es KOPI" }) })).status,
    ).toBe(409);

    const r = await readyRespondent(-1);
    expect((await call(adminBev.GET, { cookie: r.cookie })).status).toBe(401);
    expect(
      (await call(adminBev.POST, { cookie: r.cookie, body: body({ name: "UJI lain" }) })).status,
    ).toBe(401);
  });
});

describe("List Responden: hari ke-, kelengkapan, pretest (FR-A-02)", () => {
  it("menampilkan progres dan memfilter belum pretest / kelengkapan < 50%", async () => {
    const admin = await makeStaff("admin");
    const cookie = await staffCookie(admin.id);
    await makeRespondent(null, "R001"); // belum pretest
    const good = await readyRespondent(-3, "R002"); // 4 hari berjalan
    const low = await readyRespondent(-3, "R003");
    for (let i = 0; i < 3; i++)
      await call(zero.POST, { cookie: good.cookie, body: { date: addDays(good.today, -i) } });
    await call(zero.POST, { cookie: low.cookie, body: { date: low.today } });

    const all = await call(adminList, { cookie });
    const by = new Map(
      all.json.items.map((i: { label: string; progress: unknown }) => [i.label, i.progress]),
    );
    expect(by.get("R001")).toMatchObject({
      pretestDone: false,
      studyDay: null,
      completeness: null,
    });
    expect(by.get("R002")).toMatchObject({
      pretestDone: true,
      studyDay: 4,
      completeness: { filled: 3, elapsed: 4 },
    });
    expect(by.get("R003")).toMatchObject({ completeness: { filled: 1, elapsed: 4 } });

    const noPre = await call(adminList, {
      cookie,
      url: "/api/admin/respondents?progress=no_pretest",
    });
    expect(noPre.json.items.map((i: { label: string }) => i.label)).toEqual(["R001"]);
    const lowC = await call(adminList, {
      cookie,
      url: "/api/admin/respondents?progress=low_completeness",
    });
    expect(lowC.json.items.map((i: { label: string }) => i.label)).toEqual(["R003"]);
  });
});

describe("Riwayat: rentang cepat dan urutan (FR-R-04)", () => {
  it("default sejak hari ke-1, terbaru dulu; 7 hari dan urutan terlama", async () => {
    const r = await readyRespondent(-9); // 10 hari berjalan
    const all = await call(history, { cookie: r.cookie });
    expect(all.json.from).toBe(r.dayOne);
    expect(all.json.days).toHaveLength(10);
    expect(all.json.days[0].date).toBe(r.today);

    const week = await call(history, {
      cookie: r.cookie,
      url: "/api/respondent/history?range=7d&sort=asc",
    });
    expect(week.json.days).toHaveLength(7);
    expect(week.json.days[0].date).toBe(addDays(r.today, -6));
    expect(week.json.days.at(-1).date).toBe(r.today);
  });
});
