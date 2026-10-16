import { describe, expect, it } from "vitest";
import * as adminEdu from "@/app/api/admin/education/route";
import * as adminEduById from "@/app/api/admin/education/[id]/route";
import { POST as reorder } from "@/app/api/admin/education/reorder/route";
import { POST as upload } from "@/app/api/admin/education/media/route";
import { GET as media } from "@/app/api/media/[...key]/route";
import { GET as respList } from "@/app/api/respondent/education/route";
import { GET as respRead } from "@/app/api/respondent/education/[id]/route";
import { POST as quiz } from "@/app/api/respondent/education/[id]/quiz/route";
import { GET as results } from "@/app/api/admin/respondents/[id]/results/route";
import { prisma } from "@/server/db";
import { call, makeStaff, readyRespondent, staffCookie } from "../support/helpers";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

const material = (extra: Record<string, unknown> = {}) => ({
  title: "Apa itu minuman berpemanis?",
  summary: "Kenali minuman yang mengandung gula tambahan.",
  body: "## Pengantar\n\nMinuman berpemanis adalah **minuman dengan gula tambahan**.",
  icon: "🥤",
  imageKey: "",
  imageAlt: "",
  videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  source: "Contoh sumber",
  unlockDay: "",
  status: "published",
  questions: [
    { text: "Teh manis termasuk minuman berpemanis?", options: ["Ya", "Tidak"], correctIndex: 0 },
    { text: "Air putih mengandung gula tambahan?", options: ["Ya", "Tidak"], correctIndex: 1 },
  ],
  ...extra,
});

async function adminCookie() {
  const a = await makeStaff("admin");
  return staffCookie(a.id);
}

describe("Materi Edukasi: Admin (FR-A-05)", () => {
  it("membuat, mengubah, dan menghapus materi beserta kuis; tercatat di audit", async () => {
    const cookie = await adminCookie();
    const created = await call(adminEdu.POST, { cookie, body: material() });
    expect(created.status).toBe(201);
    const id = created.json.id;

    const got = await call(adminEduById.GET, { cookie, params: { id } });
    expect(got.json.questions).toHaveLength(2);
    expect(got.json.questions[1].correctIndex).toBe(1);

    const upd = await call(adminEduById.PUT, {
      method: "PUT",
      cookie,
      params: { id },
      body: material({ title: "Judul baru", questions: [] }),
    });
    expect(upd.status).toBe(200);
    expect(await prisma.educationQuizQuestion.count({ where: { materialId: id } })).toBe(0);

    await call(adminEduById.DELETE, { method: "DELETE", cookie, params: { id } });
    expect((await call(adminEdu.GET, { cookie })).json.items).toHaveLength(0);
    const actions = (await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } })).map(
      (l) => l.action,
    );
    expect(actions).toEqual(["education.created", "education.updated", "education.deleted"]);
  });

  it("validasi: video harus YouTube, gambar wajib deskripsi, kuis maks 3, jawaban benar dalam rentang", async () => {
    const cookie = await adminCookie();
    const bad = await call(adminEdu.POST, {
      cookie,
      body: material({
        videoUrl: "https://evil.example/video",
        imageKey: "edukasi/0b3c2c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.png",
        imageAlt: "",
        questions: [{ text: "?", options: ["a", "b"], correctIndex: 5 }],
      }),
    });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.json.error.fields)).toEqual(
      expect.arrayContaining(["videoUrl", "imageAlt", "questions.0.correctIndex"]),
    );
  });

  it("mengubah urutan (drag-and-drop) dan menolak daftar tidak lengkap", async () => {
    const cookie = await adminCookie();
    const a = (await call(adminEdu.POST, { cookie, body: material({ title: "Materi A" }) })).json
      .id;
    const b = (await call(adminEdu.POST, { cookie, body: material({ title: "Materi B" }) })).json
      .id;
    expect((await call(reorder, { cookie, body: { ids: [b, a] } })).status).toBe(200);
    const titles = (await call(adminEdu.GET, { cookie })).json.items.map(
      (i: { title: string }) => i.title,
    );
    expect(titles).toEqual(["Materi B", "Materi A"]);
    expect((await call(reorder, { cookie, body: { ids: [a] } })).status).toBe(422);
  });

  it("unggah gambar: penyimpanan belum diatur → 503 dengan penyebab yang jelas untuk staf", async () => {
    const cookie = await adminCookie();
    const send = () => {
      const f = new FormData();
      f.set("file", new File([PNG], "gambar.png", { type: "image/png" }));
      return call(upload, { cookie, form: f });
    };
    const saved = { ...process.env };
    try {
      process.env.VERCEL = "1"; // driver lokal di Vercel: sistem file hanya-baca
      const onVercel = await send();
      expect(onVercel.status).toBe(503);
      expect(onVercel.json.error.code).toBe("STORAGE_NOT_CONFIGURED");
      expect(onVercel.json.error.message).toMatch(/STORAGE_DRIVER=supabase/);

      process.env.STORAGE_DRIVER = "supabase"; // tanpa SUPABASE_URL / service key
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const noKeys = await send();
      expect(noKeys.status).toBe(503);
      expect(noKeys.json.error.message).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    } finally {
      process.env = saved;
    }
  });

  it("unggah gambar: PNG diterima lalu bisa disajikan; file bukan gambar dan > 4 MB ditolak", async () => {
    const cookie = await adminCookie();
    const form = (bytes: Uint8Array<ArrayBuffer>, name: string, type: string) => {
      const f = new FormData();
      f.set("file", new File([bytes], name, { type }));
      return f;
    };
    const ok = await call(upload, { cookie, form: form(PNG, "gambar.png", "image/png") });
    expect(ok.status).toBe(201);
    expect(ok.json.key).toMatch(/^edukasi\/[0-9a-f-]{36}\.png$/);
    const served = await call(media, { params: { key: ok.json.key.split("/") } });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");

    const svg = await call(upload, {
      cookie,
      form: form(new TextEncoder().encode("<svg onload=alert(1)>"), "x.png", "image/png"),
    });
    expect(svg.status).toBe(422);
    const big = await call(upload, {
      cookie,
      form: form(new Uint8Array(4 * 1024 * 1024 + 1), "b.png", "image/png"),
    });
    expect(big.status).toBe(422);

    const traversal = await call(media, { params: { key: ["edukasi", "..", "..", ".env"] } });
    expect(traversal.status).toBe(404);
  });

  it("responden tidak bisa memakai endpoint Admin", async () => {
    const r = await readyRespondent(-1);
    expect((await call(adminEdu.GET, { cookie: r.cookie })).status).toBe(401);
    expect((await call(adminEdu.POST, { cookie: r.cookie, body: material() })).status).toBe(401);
  });
});

describe("Edukasi: Responden (FR-R-05)", () => {
  it("hanya materi terbit; materi terjadwal terkunci dan tidak bisa dibuka lewat URL", async () => {
    const cookie = await adminCookie();
    const open = (await call(adminEdu.POST, { cookie, body: material({ title: "Terbuka" }) })).json
      .id;
    const locked = (
      await call(adminEdu.POST, { cookie, body: material({ title: "Hari 5", unlockDay: 5 }) })
    ).json.id;
    const draft = (
      await call(adminEdu.POST, { cookie, body: material({ title: "Draf", status: "draft" }) })
    ).json.id;

    const r = await readyRespondent(-1); // hari ke-2
    const list = await call(respList, { cookie: r.cookie });
    expect(
      list.json.items.map((i: { title: string; unlocked: boolean }) => [i.title, i.unlocked]),
    ).toEqual([
      ["Terbuka", true],
      ["Hari 5", false],
    ]);

    expect(
      (await call(respRead, { cookie: r.cookie, params: { id: locked } })).json.error.code,
    ).toBe("MATERIAL_LOCKED");
    expect((await call(respRead, { cookie: r.cookie, params: { id: draft } })).status).toBe(404);

    const read = await call(respRead, { cookie: r.cookie, params: { id: open } });
    expect(read.status).toBe(200);
    expect(read.json.videoEmbedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    // Jawaban benar tidak dikirim sebelum kuis dikerjakan.
    expect(JSON.stringify(read.json.questions)).not.toContain("correctIndex");
    expect(await prisma.educationProgress.count({ where: { respondentId: r.id } })).toBe(1);
  });

  it("kuis boleh diulang: skor pertama tetap, skor terakhir dan jumlah percobaan diperbarui", async () => {
    const cookie = await adminCookie();
    const id = (await call(adminEdu.POST, { cookie, body: material() })).json.id;
    const r = await readyRespondent(-1);

    const first = await call(quiz, { cookie: r.cookie, params: { id }, body: { answers: [1, 1] } });
    expect(first.json).toMatchObject({ score: 50 });
    expect(first.json.results.map((x: { correct: boolean }) => x.correct)).toEqual([false, true]);
    const second = await call(quiz, {
      cookie: r.cookie,
      params: { id },
      body: { answers: [0, 1] },
    });
    expect(second.json.score).toBe(100);

    const p = await prisma.educationProgress.findFirstOrThrow({ where: { respondentId: r.id } });
    expect(p).toMatchObject({ firstQuizScore: 50, lastQuizScore: 100, quizAttempts: 2 });

    expect(
      (await call(quiz, { cookie: r.cookie, params: { id }, body: { answers: [0] } })).status,
    ).toBe(422);

    // Tampil di "Lihat Hasil Responden".
    const res = await call(results, { cookie, params: { id: r.id } });
    expect(res.json.education).toEqual([
      expect.objectContaining({
        title: material().title,
        firstQuizScore: 50,
        lastQuizScore: 100,
        quizAttempts: 2,
      }),
    ]);
  });
});
