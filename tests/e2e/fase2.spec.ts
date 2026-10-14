import { expect, test } from "@playwright/test";

/** Membuat responden baru lewat API admin; mengembalikan kode akses. */
async function newRespondentCode(request: import("@playwright/test").APIRequestContext) {
  await request.post("/api/auth/staff/login", {
    data: { email: "admin@e2e.id", password: "Rahasia-E2E-123" },
  });
  const res = await request.post("/api/admin/respondents", { data: {} });
  return (await res.json()).code as string;
}

test("alur Responden: kode → persetujuan → pretest → catat → beranda → riwayat → Nol", async ({
  page,
  request,
}) => {
  const code = await newRespondentCode(request);

  await page.goto("/masuk");
  await page.getByLabel(/Kode Akses/).fill(code);
  await page.getByRole("button", { name: "Masuk" }).click();

  // Persetujuan
  await expect(page).toHaveURL(/\/persetujuan$/);
  const agreeBtn = page.getByRole("button", { name: "Setuju dan lanjutkan" });
  await expect(agreeBtn).toBeDisabled();
  await page.getByLabel(/bersedia ikut serta/).check();
  await agreeBtn.click();

  // Pretest: jawab semua butir pilihan, lalu kirim.
  await expect(page).toHaveURL(/\/pretest$/);
  for (const group of await page.locator(".question fieldset").all()) {
    await group.getByRole("radio").first().check();
  }
  await expect(page.getByText(/tersimpan otomatis/)).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Kirim jawaban" }).click();

  // Beranda: hari ke-1, belum diisi.
  await expect(page).toHaveURL(/\/beranda$/);
  await expect(page.getByText("Hari ke-1 dari 14")).toBeVisible();
  await expect(page.getByText("Belum diisi").first()).toBeVisible();

  // Catat minuman
  await page.getByRole("link", { name: /Catat minuman/ }).click();
  await expect(page).toHaveURL(/\/catat$/);
  await page.getByRole("radio", { name: "Teh manis" }).check();
  await page.getByRole("button", { name: /Gelas besar/ }).click();
  await page.getByRole("button", { name: "Tambah porsi" }).click();
  await expect(page.locator("#estimate-total")).toHaveText("±80 g");
  await page.getByRole("button", { name: "Simpan" }).click();

  await expect(page).toHaveURL(/\/beranda\?tersimpan=1$/);
  await expect(page.getByText(/Catatanmu tersimpan/)).toBeVisible();
  await expect(page.getByText("✓ Sudah diisi").first()).toBeVisible();
  await expect(page.getByText(/2 porsi minuman manis/)).toBeVisible();

  // Riwayat
  await page
    .getByRole("link", { name: /Riwayat/ })
    .first()
    .click();
  await expect(page.getByText(/2 porsi · 500 ml/)).toBeVisible();

  // Hapus catatan → hari kembali Belum diisi → tandai Nol.
  await page.getByRole("link", { name: /Ubah catatan Teh manis/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Hapus catatan" }).click();
  await expect(page).toHaveURL(/\/riwayat$/);
  await page.getByRole("button", { name: /Tidak minum minuman manis di hari ini/ }).click();
  await expect(page.getByText("0 Nol (tidak minum)").first()).toBeVisible();

  // Tidak ada scroll horizontal di halaman responden.
  for (const path of ["/beranda", "/catat", "/riwayat"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("responden yang belum pretest tidak bisa membuka halaman pencatatan", async ({
  page,
  request,
}) => {
  const code = await newRespondentCode(request);
  await page.goto("/masuk");
  await page.getByLabel(/Kode Akses/).fill(code);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/persetujuan$/);
  await page.goto("/catat");
  await expect(page).toHaveURL(/\/persetujuan$/);
});

test("Admin: menu Referensi Minuman menampilkan peringatan nilai contoh", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Alur staf diuji di desktop");
  await page.goto("/staf/masuk");
  await page.getByLabel("Email").fill("admin@e2e.id");
  await page.getByLabel("Kata sandi").fill("Rahasia-E2E-123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.getByRole("link", { name: "Referensi Minuman" }).click();
  await expect(page.getByText(/masih memakai nilai contoh/)).toBeVisible();
  await expect(page.getByRole("cell", { name: /Teh manis/ })).toBeVisible();
});
