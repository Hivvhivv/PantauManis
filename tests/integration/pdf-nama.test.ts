import { describe, expect, it } from "vitest";
import * as respondents from "@/app/api/admin/respondents/route";
import * as respondentById from "@/app/api/admin/respondents/[id]/route";
import { POST as importCsv } from "@/app/api/admin/respondents/import/route";
import { GET as exportDataset } from "@/app/api/admin/export/[dataset]/route";
import { prisma } from "@/server/db";
import { AuditAction, type Actor } from "@/server/modules/audit";
import { DATASETS } from "@/server/modules/export/service";
import { getOverallReport } from "@/server/modules/export/report";
import { getRespondentReport } from "@/server/modules/respondents/results";
import { getRespondentDetail, reportOptions } from "@/server/modules/respondents/service";
import { addDays } from "@/server/modules/study/days";
import { call, makeStaff, readyRespondent, seededBeverage, staffCookie } from "../support/helpers";

const NAME = "Ani Budiman";

async function admin() {
  const a = await makeStaff("admin");
  const actor: Actor = { type: "staff", id: a.id, ip: "10.0.0.1" };
  return { cookie: await staffCookie(a.id), actor };
}

describe("Nama lengkap responden (ADR-009)", () => {
  it("disimpan terenkripsi, tampil di Detail, bisa diubah dan dikosongkan", async () => {
    const { cookie } = await admin();
    const created = await call(respondents.POST, {
      cookie,
      body: { label: "R001", fullName: `  ${NAME} ` },
    });
    expect(created.status).toBe(201);
    const id = created.json.id as string;

    const row = await prisma.respondent.findUniqueOrThrow({ where: { id } });
    expect(row.fullNameEncrypted).toBeTruthy();
    expect(row.fullNameEncrypted).not.toContain("Ani");
    expect((await getRespondentDetail(id)).fullName).toBe(NAME);

    const cleared = await call(respondentById.PATCH, {
      cookie,
      params: { id },
      method: "PATCH",
      body: { label: "R001", fullName: "" },
    });
    expect(cleared.status).toBe(200);
    expect((await getRespondentDetail(id)).fullName).toBeNull();
  });

  it("menolak nama dengan karakter selain huruf dan tanda baca nama", async () => {
    const { cookie } = await admin();
    const res = await call(respondents.POST, { cookie, body: { fullName: "<script>" } });
    expect(res.status).toBe(422);
    expect(res.json.error.fields.fullName).toBeTruthy();
  });

  it("impor CSV membaca kolom nama", async () => {
    const { cookie } = await admin();
    const f = new FormData();
    f.set("file", new File([`id_responden,nama\nR001,${NAME}\nR002,\n`], "d.csv"));
    expect((await call(importCsv, { cookie, form: f })).status).toBe(201);
    const opts = await reportOptions();
    expect(opts.map((o) => [o.label, o.fullName])).toEqual([
      ["R001", NAME],
      ["R002", null],
    ]);
  });

  it("nama tidak pernah ikut ekspor CSV analisis (FR-A-07)", async () => {
    const { cookie } = await admin();
    const r = await readyRespondent(-3, "R001");
    await call(respondentById.PATCH, {
      cookie,
      params: { id: r.id },
      method: "PATCH",
      body: { label: "R001", fullName: NAME },
    });
    for (const dataset of DATASETS) {
      const res = await call(exportDataset, {
        cookie,
        params: { dataset },
        url: `/api/admin/export/${dataset}?format=csv`,
      });
      expect(res.status).toBe(200);
      expect(res.text).not.toContain("Budiman");
    }
  });
});

describe("PDF hasil (ADR-009)", () => {
  it("PDF satu responden memuat nama dan dicatat sebagai ekspor, bukan 'hasil dibuka'", async () => {
    const { cookie, actor } = await admin();
    const r = await readyRespondent(-3, "R001");
    await call(respondentById.PATCH, {
      cookie,
      params: { id: r.id },
      method: "PATCH",
      body: { label: "R001", fullName: NAME },
    });
    const before = await prisma.auditLog.count();

    const report = await getRespondentReport(r.id, actor);
    expect(report.fullName).toBe(NAME);
    expect(report.started).toBe(true);

    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" }, skip: before });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: AuditAction.ExportDownloaded,
      targetId: r.id,
      metadata: { format: "pdf" },
    });
  });

  it("PDF keseluruhan: satu baris per responden; rata-rata gula hanya dari hari tercatat", async () => {
    const { actor } = await admin();
    const r = await readyRespondent(-3, "R001"); // hari ke-1..4 berjalan
    const teh = await seededBeverage("Teh manis");
    await prisma.consumptionLog.create({
      data: {
        respondentId: r.id,
        beverageTypeId: teh.id,
        volumeMl: 250,
        servings: 1,
        sugarGSnapshot: 30,
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
    await readyRespondent(-1, "R002");

    const { rows, dashboard } = await getOverallReport(actor);
    expect(dashboard.total).toBe(2);
    const r1 = rows.find((x) => x.label === "R001")!;
    // 30 g dibagi 2 hari tercatat (Terisi + Nol); 2 hari Belum diisi tidak ikut.
    expect(r1).toMatchObject({ recorded: 2, elapsed: 4, zeroDays: 1, avgSugarG: 15 });
    expect(rows.find((x) => x.label === "R002")!.avgSugarG).toBeNull();

    const last = await prisma.auditLog.findFirstOrThrow({ orderBy: { createdAt: "desc" } });
    expect(last).toMatchObject({
      action: AuditAction.ExportDownloaded,
      metadata: { format: "pdf", dataset: "keseluruhan" },
    });
  });
});
