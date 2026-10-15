import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Rahasia-E2E-123";

async function staffLogin(page: Page, email: string) {
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("PDF (ADR-009): checkbox bagian di Detail dan di List Responden", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await staffLogin(page, "admin@e2e.id");

  await page.goto("/admin/responden/tambah");
  await page.getByLabel(/Nama lengkap/).fill("Citra Dewi");
  await page.getByRole("button", { name: /Simpan/ }).click();
  const label = (await page.locator("td").first().textContent())!.trim();

  // Detail: hanya responden ini; "Log konsumsi" tidak dicentang → bagian itu tidak ada.
  await page.goto("/admin/responden");
  await page.getByRole("link", { name: label, exact: true }).click();
  await expect(page.getByText("Citra Dewi")).toBeVisible();
  await page.getByText("Ekspor PDF").click();
  await expect(page.getByLabel(/Ringkasan keseluruhan/)).toHaveCount(0);
  await page.getByLabel("Log konsumsi").uncheck();
  const [one] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Buat PDF" }).click(),
  ]);
  await expect(
    one.getByRole("heading", { name: `Laporan Hasil Responden ${label}` }),
  ).toBeVisible();
  await expect(one.getByRole("heading", { name: "Citra Dewi" })).toBeVisible();
  await expect(one.getByRole("heading", { name: /Pretest & posttest/ })).toBeVisible();
  await expect(one.getByRole("heading", { name: /Log konsumsi/ })).toHaveCount(0);
  await one.close();

  // List: semua responden + ringkasan keseluruhan.
  await page.goto("/admin/responden");
  await page.getByText("Ekspor PDF").click();
  const [all] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Buat PDF" }).click(),
  ]);
  await expect(all.getByRole("heading", { name: "Laporan Hasil Semua Responden" })).toBeVisible();
  await expect(all.getByRole("heading", { name: "Ringkasan keseluruhan" })).toBeVisible();
  await expect(all.getByRole("cell", { name: "Citra Dewi" })).toBeVisible();
  await expect(all.getByRole("heading", { name: "Citra Dewi" })).toBeVisible();
  await expect(all.locator("canvas").first()).toBeVisible();
});

test("PDF hanya untuk staf: tamu diarahkan ke login staf", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await page.goto("/admin/responden/pdf");
  await expect(page).toHaveURL(/\/staf\/masuk$/);
});
