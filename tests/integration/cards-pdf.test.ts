import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { GET as cardsPdfRoute } from "@/app/api/admin/respondents/cards.pdf/route";
import { prisma } from "@/server/db";
import { call, makeRespondent, makeStaff, readyRespondent, staffCookie } from "../support/helpers";

/** Ambil body sebagai biner (helper `call` membaca teks). */
async function download(cookie: string, query = "") {
  const res = await cardsPdfRoute(
    new NextRequest(`http://localhost:3000/api/admin/respondents/cards.pdf${query}`, {
      headers: { cookie },
    }),
    { params: Promise.resolve({}) as Promise<never> },
  );
  return { res, bytes: new Uint8Array(await res.arrayBuffer()) };
}

describe("Download PDF kartu kode", () => {
  it("staf mengunduh PDF: satu halaman per responden aktif, tidak di-cache, tercatat di audit", async () => {
    const cookie = await staffCookie((await makeStaff("admin")).id);
    const a = await makeRespondent(null, "R001");
    await makeRespondent(null, "R002");
    const off = await makeRespondent(null, "R003");
    await prisma.respondent.update({ where: { id: off.id }, data: { accessStatus: "inactive" } });

    const all = await download(cookie);
    expect(all.res.status).toBe(200);
    expect(all.res.headers.get("content-type")).toBe("application/pdf");
    expect(all.res.headers.get("cache-control")).toBe("no-store");
    expect(all.res.headers.get("content-disposition")).toBe(
      'attachment; filename="Kartu-Kode-2-responden.pdf"',
    );
    expect(new TextDecoder().decode(all.bytes.slice(0, 5))).toBe("%PDF-");
    expect((await PDFDocument.load(all.bytes)).getPageCount()).toBe(2); // R003 nonaktif

    const one = await download(cookie, `?id=${a.id}`);
    expect(one.res.headers.get("content-disposition")).toContain("Kartu-Kode-R001.pdf");
    expect((await PDFDocument.load(one.bytes)).getPageCount()).toBe(1);

    expect(await prisma.auditLog.count({ where: { action: "respondents.cards_printed" } })).toBe(2);
  });

  it("tanpa responden aktif → 404; responden dan tamu ditolak", async () => {
    const cookie = await staffCookie((await makeStaff("admin")).id);
    expect((await call(cardsPdfRoute, { cookie })).status).toBe(404);
    const r = await readyRespondent();
    expect((await call(cardsPdfRoute, { cookie: r.cookie })).status).toBe(401);
    expect((await call(cardsPdfRoute)).status).toBe(401);
  });
});
