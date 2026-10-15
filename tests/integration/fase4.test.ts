import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { GET as exportDataset } from "@/app/api/admin/export/[dataset]/route";
import { GET as exportOne } from "@/app/api/admin/respondents/[id]/export/route";
import { POST as createLog } from "@/app/api/respondent/logs/route";
import * as pretest from "@/app/api/respondent/pretest/route";
import { prisma } from "@/server/db";
import { addDays } from "@/server/modules/study/days";
import { softDeleteRespondent } from "@/server/modules/respondents/service";
import {
  at,
  call,
  makeRespondent,
  makeStaff,
  readyRespondent,
  seededBeverage,
  staffCookie,
} from "../support/helpers";

const parse = (csv: string) =>
  Papa.parse<Record<string, string>>(csv.replace(/^﻿/, ""), { header: true, skipEmptyLines: true })
    .data;

async function adminCookie() {
  const a = await makeStaff("admin");
  return { cookie: await staffCookie(a.id), admin: a };
}

const csv = (cookie: string, dataset: string) =>
  call(exportDataset, {
    cookie,
    params: { dataset },
    url: `/api/admin/export/${dataset}?format=csv`,
  });

describe("Ekspor data (FR-A-07)", () => {
  it("AC-12: ringkasan harian 14 baris per responden dengan Terisi/Nol/Belum diisi", async () => {
    const { cookie } = await adminCookie();
    const r = await readyRespondent(-20, "R001"); // periode sudah lewat
    // Isi hari ke-1 dan ke-2 langsung di DB (di luar jendela susulan).
    const teh = await seededBeverage("Teh manis");
    await prisma.consumptionLog.create({
      data: {
        respondentId: r.id,
        beverageTypeId: teh.id,
        volumeMl: 250,
        servings: 2,
        sugarGSnapshot: 40,
        consumedAt: new Date(`${r.dayOne}T03:00:00Z`),
        localDate: new Date(`${r.dayOne}T00:00:00Z`),
        studyDay: 1,
      },
    });
    await prisma.dailyStatus.createMany({
      data: [
        {
          respondentId: r.id,
          date: new Date(`${r.dayOne}T00:00:00Z`),
          studyDay: 1,
          status: "filled",
        },
        {
          respondentId: r.id,
          date: new Date(`${addDays(r.dayOne, 1)}T00:00:00Z`),
          studyDay: 2,
          status: "zero",
        },
      ],
    });
    await makeRespondent(null, "R002"); // belum pretest → tidak masuk ringkasan harian

    const res = await csv(cookie, "ringkasan_harian");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const rows = parse(res.text);
    expect(rows).toHaveLength(14);
    expect(rows[0]).toMatchObject({
      id_responden: "R001",
      hari_ke: "1",
      status: "terisi",
      jumlah_minuman: "2",
      perkiraan_gula_g: "40",
    });
    expect(rows[1]).toMatchObject({ status: "nol", jumlah_minuman: "0" });
    expect(rows[2]).toMatchObject({
      status: "belum_diisi",
      jumlah_minuman: "",
      perkiraan_gula_g: "",
    });
    expect(new Set(rows.map((x) => x.status))).toEqual(new Set(["terisi", "nol", "belum_diisi"]));
  });

  it("log konsumsi: semua catatan, penanda di luar periode, waktu WIB; tanpa kode akses", async () => {
    const { cookie } = await adminCookie();
    const r = await readyRespondent(-20, "R010");
    const teh = await seededBeverage("Teh manis");
    await call(createLog, {
      cookie: r.cookie,
      body: {
        beverageTypeId: teh.id,
        volumeMl: 250,
        servings: 1,
        consumedAt: at(r.today, "00:00"),
      },
    });
    const res = await csv(cookie, "log_konsumsi");
    const rows = parse(res.text);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id_responden: "R010",
      hari_ke: "21",
      di_luar_periode: "1",
      susulan: "0",
    });
    expect(rows[0]!.waktu_minum).toBe(`${r.today}T00:00:00+07:00`);
    expect(res.text).not.toContain(r.code.slice(3));
    expect(res.text).not.toMatch(/PM-\d{3}/);
  });

  it("kuesioner: satu baris per responden, jawaban berupa kode angka + skor", async () => {
    const { cookie } = await adminCookie();
    const r = await makeRespondent(null, "R020");
    const cookieR = (await import("../support/helpers")).respondentCookie;
    const rc = await cookieR(r.id);
    await prisma.respondent.update({ where: { id: r.id }, data: { consentAt: new Date() } });
    const q = await prisma.questionnaire.findFirstOrThrow({
      where: { type: "pretest" },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    const answers = Object.fromEntries(
      q.questions.map((x) => [
        x.id,
        x.type === "text" ? "teh manis" : (x.options as { value: string }[]).at(-1)!.value,
      ]),
    );
    await call(pretest.POST, { cookie: rc, body: { answers } });

    const rows = parse((await csv(cookie, "kuesioner")).text);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id_responden: "R020",
      pre_status: "submitted",
      pre_q1: "4",
      pre_q2: "5",
      pre_q3: "teh manis",
      pre_skor: "9",
    });
    expect(rows[0]!.post_status).toBe("");
  });

  it("responden yang dihapus tidak ikut; setiap ekspor dicatat di audit", async () => {
    const { cookie, admin } = await adminCookie();
    await makeRespondent(null, "R030");
    const gone = await makeRespondent(null, "R031");
    await softDeleteRespondent(gone.id, { type: "system", id: null, ip: null });
    const rows = parse((await csv(cookie, "responden")).text);
    expect(rows.map((x) => x.id_responden)).toEqual(["R030"]);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "export.downloaded" } });
    expect(log.actorId).toBe(admin.id);
    expect(log.metadata).toMatchObject({ dataset: "responden", format: "csv", rows: 1 });
  });

  it("XLSX semua dataset berisi 6 sheet + Codebook", async () => {
    const { cookie } = await adminCookie();
    await readyRespondent(-2, "R040");
    const res = await call(exportDataset, {
      cookie,
      params: { dataset: "semua" },
      url: "/api/admin/export/semua?format=xlsx",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/\.xlsx"$/);
    // `call` membaca body sebagai teks; ambil ulang sebagai biner untuk dibaca exceljs.
    const raw = await exportDataset(
      new (await import("next/server")).NextRequest(
        "http://localhost:3000/api/admin/export/semua?format=xlsx",
        {
          headers: { cookie },
        },
      ),
      { params: Promise.resolve({ dataset: "semua" }) },
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await raw.arrayBuffer());
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "responden",
      "log_konsumsi",
      "ringkasan_harian",
      "kuesioner",
      "target",
      "edukasi",
      "Codebook",
    ]);
    expect(wb.getWorksheet("ringkasan_harian")!.rowCount).toBe(1 + 14);

    const bad = await call(exportDataset, {
      cookie,
      params: { dataset: "semua" },
      url: "/api/admin/export/semua?format=csv",
    });
    expect(bad.status).toBe(422);
    expect((await call(exportDataset, { cookie, params: { dataset: "rahasia" } })).status).toBe(
      404,
    );
  });

  it("ekspor satu responden: hanya datanya, dicatat dengan target responden", async () => {
    const { cookie } = await adminCookie();
    const a = await readyRespondent(-2, "R050");
    await readyRespondent(-2, "R051");
    const res = await call(exportOne, { cookie, params: { id: a.id } });
    expect(res.status).toBe(200);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "export.downloaded" } });
    expect(log.targetId).toBe(a.id);
    expect(log.metadata).toMatchObject({ dataset: "responden_tunggal" });
  });

  it("responden tidak bisa mengekspor apa pun", async () => {
    const r = await readyRespondent(-1);
    expect((await csv(r.cookie, "responden")).status).toBe(401);
    expect((await call(exportOne, { cookie: r.cookie, params: { id: r.id } })).status).toBe(401);
  });
});

describe("Log audit tetap dicatat (menu Log Audit dihapus 2026-10-15)", () => {
  it("ekspor dicatat dengan pelaku staf", async () => {
    const { cookie: adminC, admin } = await adminCookie();
    await csv(adminC, "responden");
    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: "export.downloaded" },
    });
    expect(log).toMatchObject({ actorType: "staff", actorId: admin.id });
  });
});
