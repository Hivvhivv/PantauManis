import { expect, test } from "@playwright/test";

const PASSWORD = "Rahasia-E2E-123";

test("Admin membuka menu Kuesioner (ADR-010)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill("admin@e2e.id");
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.getByRole("link", { name: "Kuesioner" }).click();
  await expect(page.getByRole("heading", { name: "Kuesioner", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pretest" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Soal 1").first()).toBeVisible();
  await page.getByRole("link", { name: "Posttest" }).click();
  await expect(page).toHaveURL(/jenis=posttest$/);
  await expect(page.getByText(/Terbuka pada hari ke-14/)).toBeVisible();
  // Test lain sudah mengisi pretest di database e2e, jadi soal di sini terkunci (hanya-baca)
  // atau, pada database baru, masih bisa ditambah.
  await expect(page.getByText(/Soal terkunci|\+ Skala 1–5/).first()).toBeVisible();
});

test("PWA dibuka ulang: sesi staf → Admin, tanpa sesi → Masuk", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await page.goto("/");
  await expect(page).toHaveURL(/\/masuk$/);
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill("admin@e2e.id");
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin$/);
});

test("PWA: manifest dan ikon tersedia", async ({ request }) => {
  const m = await request.get("/manifest.webmanifest");
  expect(m.ok()).toBe(true);
  const json = await m.json();
  expect(json).toMatchObject({ name: "PantauManis", display: "standalone", start_url: "/" });
  const icon = await request.get("/icon/192");
  expect(icon.headers()["content-type"]).toContain("image/png");
  expect((await request.get("/apple-icon")).ok()).toBe(true);
});
