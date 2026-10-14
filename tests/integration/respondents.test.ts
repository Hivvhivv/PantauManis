import { describe, expect, it } from "vitest";
import * as respondents from "@/app/api/admin/respondents/route";
import * as respondentById from "@/app/api/admin/respondents/[id]/route";
import { POST as bulk } from "@/app/api/admin/respondents/bulk/route";
import { POST as importCsv } from "@/app/api/admin/respondents/import/route";
import { GET as codesCsv } from "@/app/api/admin/respondents/codes.csv/route";
import { POST as reveal } from "@/app/api/admin/respondents/[id]/reveal-code/route";
import { POST as resetCode } from "@/app/api/admin/respondents/[id]/reset-code/route";
import { POST as status } from "@/app/api/admin/respondents/[id]/status/route";
import { POST as login } from "@/app/api/auth/respondent/login/route";
import { prisma } from "@/server/db";
import { resolveRespondentSession } from "@/server/auth/sessions";
import { call, cookieFrom, makeStaff, staffCookie } from "../support/helpers";

async function adminCookie() {
  const a = await makeStaff("admin");
  return { admin: a, cookie: await staffCookie(a.id) };
}

const loginWith = (code: string) =>
  call(login, { body: { code }, headers: { "x-forwarded-for": "10.7.0.1" } });

describe("Tambah Responden + pembuatan kode", () => {
  it("membuat ID otomatis berurutan dan kode PM-6 digit", async () => {
    const { cookie } = await adminCookie();
    const a = await call(respondents.POST, { cookie, body: {} });
    const b = await call(respondents.POST, { cookie, body: { initials: "ab" } });
    expect(a.status).toBe(201);
    expect(a.json.label).toBe("R001");
    expect(b.json.label).toBe("R002");
    expect(a.json.code).toMatch(/^PM-\d{6}$/);
    expect(a.json.codeForCard).toMatch(/^PM-\d{3}-\d{3}$/);
    expect(a.json.code).not.toBe(b.json.code);
  });

  it("kode tidak disimpan sebagai teks biasa", async () => {
    const { cookie } = await adminCookie();
    const res = await call(respondents.POST, { cookie, body: { label: "X01" } });
    const row = await prisma.respondent.findUniqueOrThrow({ where: { id: res.json.id } });
    const digits = res.json.code.slice(3);
    expect(row.accessCodeHmac).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(digits);
  });

  it("menolak ID Responden ganda", async () => {
    const { cookie } = await adminCookie();
    await call(respondents.POST, { cookie, body: { label: "R010" } });
    const dup = await call(respondents.POST, { cookie, body: { label: "r010" } });
    expect(dup.status).toBe(409);
    expect(dup.json.error.fields.label).toContain("R010");
  });

  it("mencatat pembuatan di audit log tanpa menyimpan kode", async () => {
    const { cookie, admin } = await adminCookie();
    const res = await call(respondents.POST, { cookie, body: {} });
    const logs = await prisma.auditLog.findMany({ where: { targetId: res.json.id } });
    expect(logs.map((l) => l.action)).toEqual(["respondent.created"]);
    expect(logs[0]!.actorId).toBe(admin.id);
    expect(JSON.stringify(logs)).not.toContain(res.json.code.slice(3));
  });
});

describe("tampilkan dan reset kode", () => {
  it("tampilkan kode dicatat di audit log", async () => {
    const { cookie } = await adminCookie();
    const created = await call(respondents.POST, { cookie, body: {} });
    const res = await call(reveal, { method: "POST", cookie, params: { id: created.json.id } });
    expect(res.json.code).toBe(created.json.code);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await prisma.auditLog.count({ where: { action: "respondent.code_revealed" } })).toBe(1);
  });

  it("AC-10: reset kode → kode lama ditolak, kode baru berlaku, sesi lama dicabut, data utuh", async () => {
    const { cookie } = await adminCookie();
    const created = await call(respondents.POST, {
      cookie,
      body: { label: "R100", initials: "CD", notes: "catatan" },
    });
    const session = cookieFrom(await loginWith(created.json.code), "pm_resp")!;

    const res = await call(resetCode, { method: "POST", cookie, params: { id: created.json.id } });
    expect(res.status).toBe(200);
    expect(res.json.code).not.toBe(created.json.code);

    expect((await loginWith(created.json.code)).status).toBe(401);
    expect((await loginWith(res.json.code)).status).toBe(200);
    expect(await resolveRespondentSession(session.split("=")[1])).toBeNull();

    const row = await prisma.respondent.findUniqueOrThrow({ where: { id: created.json.id } });
    expect(row).toMatchObject({
      label: "R100",
      initials: "CD",
      notes: "catatan",
      accessStatus: "active",
    });
  });

  it("nonaktifkan memblokir login; aktifkan membukanya kembali", async () => {
    const { cookie } = await adminCookie();
    const created = await call(respondents.POST, { cookie, body: {} });
    const p = { params: { id: created.json.id }, cookie };
    await call(status, { ...p, body: { status: "inactive" } });
    expect((await loginWith(created.json.code)).status).toBe(401);
    await call(status, { ...p, body: { status: "active" } });
    expect((await loginWith(created.json.code)).status).toBe(200);
  });
});

describe("Edit dan hapus", () => {
  it("Edit mengubah ID, inisial, tanggal mulai, dan catatan", async () => {
    const { cookie } = await adminCookie();
    const created = await call(respondents.POST, { cookie, body: {} });
    const res = await call(respondentById.PATCH, {
      method: "PATCH",
      cookie,
      params: { id: created.json.id },
      body: { label: "R900", initials: "EF", startDate: "2026-11-01", notes: "pindah kelas" },
    });
    expect(res.status).toBe(200);
    const detail = await call(respondentById.GET, { cookie, params: { id: created.json.id } });
    expect(detail.json).toMatchObject({ label: "R900", initials: "EF", notes: "pindah kelas" });
    expect(detail.json.startDate).toMatch(/^2026-11-01/);
    expect(detail.json.maskedCode).toMatch(/^PM-\d{2}••••$/);
  });

  it("Superadmin menghapus lunak: hilang dari list, login ditolak, baris tetap ada", async () => {
    const s = await makeStaff("superadmin");
    const cookie = await staffCookie(s.id);
    const created = await call(respondents.POST, { cookie, body: {} });
    const del = await call(respondentById.DELETE, {
      method: "DELETE",
      cookie,
      params: { id: created.json.id },
    });
    expect(del.status).toBe(200);
    expect((await call(respondents.GET, { cookie })).json.total).toBe(0);
    expect((await loginWith(created.json.code)).status).toBe(401);
    expect(
      (await prisma.respondent.findUniqueOrThrow({ where: { id: created.json.id } })).deletedAt,
    ).not.toBeNull();
  });
});

describe("List Responden", () => {
  it("paginasi 20, pencarian, dan filter status", async () => {
    const { cookie } = await adminCookie();
    await call(bulk, { cookie, body: { count: 25 } });
    const p1 = await call(respondents.GET, { cookie, url: "/api/admin/respondents?page=1" });
    const p2 = await call(respondents.GET, { cookie, url: "/api/admin/respondents?page=2" });
    expect(p1.json.items).toHaveLength(20);
    expect(p2.json.items).toHaveLength(5);
    expect(p1.json.total).toBe(25);
    expect(p1.json.items[0].maskedCode).toMatch(/^PM-\d{2}••••$/);
    expect(JSON.stringify(p1.json)).not.toMatch(/PM-\d{6}/);

    const search = await call(respondents.GET, { cookie, url: "/api/admin/respondents?q=r02" });
    expect(search.json.items.map((i: { label: string }) => i.label)).toEqual([
      "R020",
      "R021",
      "R022",
      "R023",
      "R024",
      "R025",
    ]);

    await call(status, {
      cookie,
      params: { id: p1.json.items[0].id },
      body: { status: "inactive" },
    });
    const inactive = await call(respondents.GET, {
      cookie,
      url: "/api/admin/respondents?status=inactive",
    });
    expect(inactive.json.total).toBe(1);
  });
});

describe("Buat Kode Massal, Impor CSV, Unduh daftar kode", () => {
  it("membuat R001–R050 dengan kode unik", async () => {
    const { cookie } = await adminCookie();
    const res = await call(bulk, { cookie, body: { count: 50, prefix: "R" } });
    expect(res.status).toBe(201);
    const items = res.json.items as { label: string; code: string }[];
    expect(items[0]!.label).toBe("R001");
    expect(items[49]!.label).toBe("R050");
    expect(new Set(items.map((i) => i.code)).size).toBe(50);
    expect(await prisma.auditLog.count({ where: { action: "respondents.bulk_created" } })).toBe(1);
  });

  it("massal melanjutkan nomor terakhir dan menolak bentrok tanpa membuat apa pun", async () => {
    const { cookie } = await adminCookie();
    await call(bulk, { cookie, body: { count: 3 } });
    const next = await call(bulk, { cookie, body: { count: 2 } });
    expect(next.json.items.map((i: { label: string }) => i.label)).toEqual(["R004", "R005"]);
    const clash = await call(bulk, { cookie, body: { count: 3, startNumber: 4 } });
    expect(clash.status).toBe(409);
    expect(await prisma.respondent.count()).toBe(5);
  });

  it("impor CSV: semua baris disimpan, atau tidak sama sekali bila ada yang salah", async () => {
    const { cookie } = await adminCookie();
    const form = (text: string) => {
      const f = new FormData();
      f.set("file", new File([text], "data.csv", { type: "text/csv" }));
      return f;
    };
    const bad = await call(importCsv, {
      cookie,
      form: form("id_responden,tanggal_mulai\nA001,2026-11-01\nA002,salah\n"),
    });
    expect(bad.status).toBe(422);
    expect(Object.values(bad.json.error.fields).join(" ")).toContain("Baris 3");
    expect(await prisma.respondent.count()).toBe(0);

    const ok = await call(importCsv, {
      cookie,
      form: form("id_responden,inisial\nA001,AB\nA002,\n"),
    });
    expect(ok.status).toBe(201);
    expect(ok.json.items).toHaveLength(2);
    expect(await prisma.respondent.count()).toBe(2);
  });

  it("unduh daftar kode: CSV berisi ID dan kode, dicatat di audit log", async () => {
    const { cookie } = await adminCookie();
    const created = await call(respondents.POST, { cookie, body: { label: "R001" } });
    const res = await call(codesCsv, { cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.text).toContain("id_responden,inisial,kode_akses,status_akses");
    expect(res.text).toContain(`R001,,${created.json.codeForCard},Aktif`);
    expect(await prisma.auditLog.count({ where: { action: "respondents.codes_downloaded" } })).toBe(
      1,
    );
  });
});

describe("audit log hanya bisa ditambah", () => {
  it("UPDATE dan DELETE ditolak oleh basis data", async () => {
    const { cookie } = await adminCookie();
    await call(respondents.POST, { cookie, body: {} });
    const log = await prisma.auditLog.findFirstOrThrow();
    await expect(
      prisma.auditLog.update({ where: { id: log.id }, data: { action: "diubah" } }),
    ).rejects.toThrow();
    await expect(prisma.auditLog.delete({ where: { id: log.id } })).rejects.toThrow();
    expect(await prisma.auditLog.count()).toBe(1);
  });
});
