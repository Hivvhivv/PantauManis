import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const PASSWORD = "Rahasia-E2E-123";

async function staffLogin(page: Page, email: string) {
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Responden yang sudah setuju + pretest (lewat API). Mengembalikan id dan kode. */
async function readyRespondent(request: APIRequestContext, page: Page) {
  await request.post("/api/auth/staff/login", {
    data: { email: "admin@e2e.id", password: PASSWORD },
  });
  const created = await (await request.post("/api/admin/respondents", { data: {} })).json();
  const api = page.request;
  await api.post("/api/auth/respondent/login", { data: { code: created.code } });
  await api.post("/api/respondent/consent", { data: { agree: true } });
  const q = await (await api.get("/api/respondent/pretest")).json();
  const answers = Object.fromEntries(
    q.questions.map((x: { id: string; type: string; options: { value: string }[] | null }) => [
      x.id,
      x.type === "text" ? "teh" : x.options![0]!.value,
    ]),
  );
  await api.post("/api/respondent/pretest", { data: { answers } });
  return created as { id: string; label: string; code: string };
}

test("responden menetapkan target dan melihatnya di Beranda", async ({ page, request }) => {
  await readyRespondent(request, page);
  await page.goto("/target");
  await page.getByLabel("Jumlah minuman manis per hari").check();
  await page.getByRole("button", { name: "1 minuman" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Simpan target" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maksimal 1 minuman manis per hari",
  );
  await expect(page.getByText(/Target bisa diubah lagi mulai/)).toBeVisible();

  await page.goto("/beranda");
  await expect(
    page.getByRole("heading", { name: "Maksimal 1 minuman manis per hari" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("AC-04/AC-05: hasil responden hanya diambil saat tombol diklik", async ({
  page,
  request,
}, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  const r = await readyRespondent(request, page);
  await page.context().clearCookies();

  await staffLogin(page, "admin@e2e.id");
  const resultCalls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes(`/api/admin/respondents/${r.id}/results`)) resultCalls.push(req.url());
  });

  await page.goto(`/admin/responden/${r.id}`);
  await expect(page.getByRole("button", { name: "Lihat Hasil Responden" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(resultCalls).toHaveLength(0); // AC-04

  await page.getByRole("button", { name: "Lihat Hasil Responden" }).click();
  await expect(page.getByRole("heading", { name: `Hasil responden ${r.label}` })).toBeVisible();
  await expect(page.getByText("Pretest vs posttest")).toBeVisible();
  expect(resultCalls).toHaveLength(1); // AC-05

  await page.getByRole("button", { name: "Sembunyikan Hasil" }).click();
  await expect(page.getByRole("button", { name: "Lihat Hasil Responden" })).toBeVisible();
});

test("Dashboard Admin agregat dan Pengaturan khusus Superadmin", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await staffLogin(page, "admin@e2e.id");
  await expect(page.getByRole("heading", { name: "Rata-rata per hari penelitian" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Corong penyelesaian" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pengaturan" })).toHaveCount(0);
  expect((await page.goto("/admin/pengaturan"))?.status()).toBe(403);

  await page.context().clearCookies();
  await staffLogin(page, "super@e2e.id");
  await page.getByRole("link", { name: "Pengaturan" }).click();
  await expect(page.getByLabel(/Teks yang dibaca responden/)).toBeVisible();
});
