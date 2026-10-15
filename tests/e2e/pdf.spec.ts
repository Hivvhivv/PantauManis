import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Rahasia-E2E-123";

async function staffLogin(page: Page, email: string) {
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("PDF (ADR-009): nama di Detail, PDF per responden, PDF keseluruhan dari menu Ekspor", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await staffLogin(page, "admin@e2e.id");

  await page.goto("/admin/responden/tambah");
  await page.getByLabel(/Nama lengkap/).fill("Citra Dewi");
  await page.getByRole("button", { name: /Simpan/ }).click();
  const label = (await page.locator("td").first().textContent())!.trim();

  await page.goto("/admin/responden");
  await page.getByRole("link", { name: label, exact: true }).click();
  await expect(page.getByText("Citra Dewi")).toBeVisible();

  // PDF responden ini: tab baru, data dimuat hanya saat tautan diklik.
  const [one] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "Unduh PDF" }).click(),
  ]);
  await expect(one.getByRole("heading", { name: `Hasil Responden ${label}` })).toBeVisible();
  await expect(one.getByText("Citra Dewi")).toBeVisible();
  await one.close();

  // Menu Ekspor → dropdown "Keseluruhan".
  await page.getByRole("link", { name: "Ekspor Data", exact: true }).click();
  await expect(page.getByLabel("Isi laporan")).toHaveValue("semua");
  await expect(page.getByLabel("Isi laporan").locator("option")).toContainText([
    `${label} – Citra Dewi`,
  ]);
  const [all] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Unduh PDF" }).click(),
  ]);
  await expect(all.getByRole("heading", { name: "Hasil Keseluruhan PantauManis" })).toBeVisible();
  await expect(all.getByRole("cell", { name: "Citra Dewi" })).toBeVisible();
  await expect(all.locator("canvas").first()).toBeVisible();
});

test("PDF hanya untuk staf: responden/tamu diarahkan ke login staf", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await page.goto("/admin/ekspor/pdf");
  await expect(page).toHaveURL(/\/staf\/masuk$/);
});
