import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Rahasia-E2E-123";

async function staffLogin(page: Page, email: string) {
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("alur Admin (PRD 13): buat kode → detail → lihat hasil → ekspor → log audit", async ({
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

  // Detail → Lihat hasil → Ekspor responden ini
  await page.getByRole("link", { name: "Kembali ke List Responden" }).click();
  await page.getByRole("link", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Lihat Hasil Responden" }).click();
  await expect(page.getByRole("heading", { name: `Hasil responden ${label}` })).toBeVisible();
  const one = page.waitForEvent("download");
  await page.getByRole("link", { name: "Ekspor Data Responden Ini" }).click();
  expect((await one).suggestedFilename()).toMatch(new RegExp(`^pantaumanis-${label}-.*\\.xlsx$`));

  // Ekspor ringkasan harian (CSV)
  await page.getByRole("link", { name: "Ekspor Data", exact: true }).click();
  // Klik tautan memicu unduhan dengan nama file yang benar. Isi file diperiksa lewat request
  // dengan sesi yang sama: di mesin pengembang ini Chromium membatalkan semua unduhan ke disk
  // (termasuk data: URL), jadi file unduhan tidak bisa dibaca langsung.
  const dl = page.waitForEvent("download");
  const csvLink = page
    .locator("li", { hasText: "Ringkasan harian" })
    .getByRole("link", { name: "CSV" });
  await csvLink.click();
  expect((await dl).suggestedFilename()).toMatch(/^pantaumanis-ringkasan_harian-.*\.csv$/);
  const res = await page.request.get((await csvLink.getAttribute("href"))!);
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const text = await res.text();
  expect(text).toContain("id_responden,hari_ke,tanggal,status,jumlah_minuman,perkiraan_gula_g");
  expect(text).toMatch(new RegExp(`${label},1,\\d{4}-\\d{2}-\\d{2},nol,0,0`));
  expect(text).not.toContain(code.replace(/\D/g, ""));

  // Superadmin melihat jejaknya di Log Audit
  await page.context().clearCookies();
  await staffLogin(page, "super@e2e.id");
  await page.getByRole("link", { name: "Log Audit" }).click();
  await page.getByLabel("Aksi").selectOption("export.downloaded");
  await page.getByRole("button", { name: "Terapkan" }).click();
  await expect(page.getByRole("cell", { name: /Data responden diekspor/ }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Admin E2E" }).first()).toBeVisible();
});

test("Admin tidak bisa membuka Log Audit", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await staffLogin(page, "admin@e2e.id");
  await expect(page.getByRole("link", { name: "Log Audit" })).toHaveCount(0);
  expect((await page.goto("/admin/log-audit"))?.status()).toBe(403);
});
