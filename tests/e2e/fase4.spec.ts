import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Rahasia-E2E-123";

async function staffLogin(page: Page, email: string) {
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("alur Admin (PRD 13): buat kode → detail → lihat hasil → ekspor", async ({
  page,
  browser,
}, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await staffLogin(page, "admin@e2e.id");

  // Buat kode
  await page.getByRole("link", { name: "List Responden" }).first().click();
  await page.getByRole("link", { name: "Tambah Responden" }).click();
  await page.getByRole("button", { name: /Simpan/ }).click();
  const code = (await page.locator("td.mono").first().textContent())!.trim();
  const label = (await page.locator("td").first().textContent())!.trim();

  // Responden mencatat (konteks terpisah)
  const ctx = await browser.newContext();
  const r = await ctx.newPage();
  await r.request.post("/api/auth/respondent/login", { data: { code } });
  await r.request.post("/api/respondent/consent", { data: { agree: true } });
  const q = await (await r.request.get("/api/respondent/pretest")).json();
  const answers = Object.fromEntries(
    q.questions.map((x: { id: string; type: string; options: { value: string }[] | null }) => [
      x.id,
      x.type === "text" ? "teh" : x.options![0]!.value,
    ]),
  );
  await r.request.post("/api/respondent/pretest", { data: { answers } });
  await r.request.post("/api/respondent/days/zero", {
    data: { date: new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10) },
  });
  await ctx.close();

  // Detail → Lihat hasil → Ekspor responden ini (XLSX, di menu Ekspor PDF)
  await page.getByRole("link", { name: "Kembali ke List Responden" }).click();
  await page.getByRole("link", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Lihat Hasil Responden" }).click();
  await expect(page.getByRole("heading", { name: `Hasil responden ${label}` })).toBeVisible();
  await page.getByText("Ekspor PDF").click();
  const one = page.waitForEvent("download");
  await page.getByRole("link", { name: "Ekspor Data Responden Ini (XLSX)" }).click();
  expect((await one).suggestedFilename()).toMatch(new RegExp(`^pantaumanis-${label}-.*\\.xlsx$`));

  // List Responden → Ekspor PDF → XLSX data analisis
  await page.getByRole("link", { name: "List Responden" }).first().click();
  // Tunggu halaman List termuat; tanpa ini klik bisa mengenai menu Ekspor PDF halaman Detail.
  await expect(page).toHaveURL(/\/admin\/responden$/);
  await page.getByText("Ekspor PDF").click();
  const all = page.waitForEvent("download");
  await page.getByRole("link", { name: "Unduh XLSX (data analisis)" }).click();
  expect((await all).suggestedFilename()).toMatch(/^pantaumanis-semua-.*\.xlsx$/);

  // Isi CSV ringkasan harian diperiksa lewat request dengan sesi yang sama: di mesin pengembang
  // ini Chromium membatalkan semua unduhan ke disk, jadi file unduhan tidak bisa dibaca langsung.
  const res = await page.request.get("/api/admin/export/ringkasan_harian?format=csv");
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const text = await res.text();
  expect(text).toContain("id_responden,hari_ke,tanggal,status,jumlah_minuman,perkiraan_gula_g");
  expect(text).toMatch(new RegExp(`${label},1,\\d{4}-\\d{2}-\\d{2},nol,0,0`));
  expect(text).not.toContain(code.replace(/\D/g, ""));
});

test("menu Ekspor Data dan Log Audit sudah tidak ada", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await staffLogin(page, "super@e2e.id");
  await expect(page.getByRole("link", { name: "Ekspor Data", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Log Audit" })).toHaveCount(0);
  expect((await page.goto("/admin/log-audit"))?.status()).toBe(404);
});
