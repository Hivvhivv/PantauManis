import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Rahasia-E2E-123";

async function staffLogin(page: Page, email: string) {
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function codeLogin(page: Page, code: string) {
  await page.goto("/masuk");
  await page.getByLabel(/Kode Akses/).fill(code);
  await page.getByRole("button", { name: "Masuk" }).click();
}

test.describe("Fase 1", () => {
  test("alur Admin: buat responden → salin kode → reset → kode lama ditolak, kode baru masuk", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
    await staffLogin(page, "admin@e2e.id");

    await page.getByRole("link", { name: "List Responden" }).first().click();
    await page.getByRole("link", { name: "Tambah Responden" }).click();
    await page.getByLabel(/Label\/inisial/).fill("ZZ");
    await page.getByRole("button", { name: /Simpan/ }).click();

    const firstCode = (await page.locator("td.mono").first().textContent())!.trim();
    expect(firstCode).toMatch(/^PM-\d{3}-\d{3}$/);

    // Reset kode dari List Responden.
    await page.getByRole("link", { name: "Kembali ke List Responden" }).click();
    const row = page.locator("tr", { hasText: "ZZ" });
    await expect(row.getByText(/^PM-\d{2}••••$/)).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Reset Kode" }).click();
    const notice = row.getByRole("status");
    await expect(notice).toContainText("Kode baru");
    const newCode = /PM-\d{3}-\d{3}/.exec((await notice.textContent()) ?? "")![0];
    expect(newCode).not.toBe(firstCode);

    // Responden di perangkat lain.
    const ctx = await browser.newContext();
    const resp = await ctx.newPage();
    await codeLogin(resp, firstCode);
    // (#code-error, bukan getByRole("alert"): Next.js punya elemen alert sendiri untuk pengumuman rute.)
    await expect(resp.locator("#code-error")).toHaveText("Kode tidak valid atau tidak aktif.");
    await codeLogin(resp, newCode.toLowerCase());
    await expect(resp).toHaveURL(/\/mulai$/);
    await expect(resp.getByRole("heading", { level: 1 })).toContainText("Selamat datang");
    await ctx.close();
  });

  test("AC-08: Superadmin memilih peran Responden → kolom Responden tampil dan kode dibuat otomatis", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
    await staffLogin(page, "super@e2e.id");
    await page.getByRole("link", { name: "Manajemen Pengguna" }).click();
    await page.getByRole("link", { name: "Tambah Pengguna" }).click();

    await page.getByLabel("Peran").selectOption("admin");
    await expect(page.getByLabel("Email")).toBeVisible();

    await page.getByLabel("Peran").selectOption("respondent");
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.getByLabel(/ID Responden/)).toBeVisible();
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.locator("td.mono").first()).toHaveText(/^PM-\d{3}-\d{3}$/);
  });

  test("AC-06: Admin membuka URL Manajemen Pengguna → 403", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
    await staffLogin(page, "admin@e2e.id");
    await expect(page.getByRole("link", { name: "Manajemen Pengguna" })).toHaveCount(0);
    const res = await page.goto("/admin/pengguna");
    expect(res?.status()).toBe(403);
    await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
  });

  test("halaman masuk Responden: disclaimer, keyboard numerik, tanpa scroll horizontal", async ({
    page,
  }) => {
    await page.goto("/masuk");
    await expect(page.getByText(/bukan alat diagnosis diabetes/)).toBeVisible();
    await expect(page.getByLabel(/Kode Akses/)).toHaveAttribute("inputmode", "numeric");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("tanpa sesi, /admin dialihkan ke halaman masuk staf", async ({ page }) => {
    await page.goto("/admin/responden");
    await expect(page).toHaveURL(/\/staf\/masuk$/);
  });
});
