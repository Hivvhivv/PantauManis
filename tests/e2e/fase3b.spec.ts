import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const PASSWORD = "Rahasia-E2E-123";
// PNG 1×1 piksel yang valid.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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
}

test("Admin membuat materi + kuis; responden membaca dan mengerjakan kuis", async ({
  page,
  browser,
  request,
}, info) => {
  test.skip(info.project.name !== "desktop", "Pembuatan materi diuji di desktop");
  const title = `Materi uji ${Date.now()}`;

  // Admin
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill("admin@e2e.id");
  await page.getByLabel("Kata sandi").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.getByRole("link", { name: "Materi Edukasi" }).click();
  await page.getByRole("link", { name: "Tambah materi" }).click();

  await page.getByLabel("Judul", { exact: true }).fill(title);
  await page.getByLabel(/Ringkasan/).fill("Kenali gula tambahan pada minuman.");
  await page
    .getByLabel(/Isi materi/)
    .fill("## Apa itu gula tambahan?\n\nGula yang **ditambahkan** saat dibuat.");
  await page.getByRole("tab", { name: "Pratinjau" }).click();
  await expect(page.locator(".preview-box strong")).toHaveText("ditambahkan");

  await page
    .getByLabel(/Gambar\/infografis/)
    .setInputFiles({ name: "info.png", mimeType: "image/png", buffer: PNG });
  await expect(page.locator(".media-preview")).toBeVisible();
  await page.getByLabel(/Deskripsi gambar/).fill("Infografis gula tambahan");

  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "+ Soal" }).click();
  await page.getByLabel("Pertanyaan 1").fill("Teh manis mengandung gula tambahan?");
  await page.getByLabel("Soal 1, opsi 1").fill("Ya");
  await page.getByLabel("Soal 1, opsi 2").fill("Tidak");
  await page.getByRole("button", { name: "Simpan materi" }).click();
  await expect(page).toHaveURL(/\/admin\/edukasi$/);
  await expect(page.getByText(title)).toBeVisible();

  // Responden (konteks terpisah)
  const ctx = await browser.newContext();
  const resp = await ctx.newPage();
  await readyRespondent(request, resp);
  await resp.goto("/edukasi");
  // Judul muncul di kartu "Mulai dari sini" dan di grid; keduanya menuju materi yang sama.
  await resp
    .getByRole("link", { name: new RegExp(title) })
    .first()
    .click();
  await expect(resp.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(resp.getByRole("img", { name: "Infografis gula tambahan" })).toBeVisible();
  await expect(resp.getByText(/bukan alat diagnosis diabetes/)).toBeVisible();

  await resp.getByLabel("Tidak").check();
  await resp.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(resp.getByText(/Skor kamu: 0/)).toBeVisible();
  await resp.getByRole("button", { name: "Coba lagi" }).click();
  await resp.getByLabel("Ya").check();
  await resp.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(resp.getByText(/Skor kamu: 100/)).toBeVisible();

  await resp.goto("/edukasi");
  await expect(resp.getByText("✓ Sudah dibaca").first()).toBeVisible();
  await ctx.close();
});

test("halaman Edukasi responden nyaman di ponsel", async ({ page, request }) => {
  await readyRespondent(request, page);
  await page.goto("/edukasi");
  await expect(page.getByRole("heading", { name: "Kenali minuman manis" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
