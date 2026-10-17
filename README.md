# PantauManis

Website intervensi self-monitoring konsumsi minuman manis untuk dewasa muda, dipakai dalam penelitian 14 hari. Bukan alat diagnosis diabetes.

- Spesifikasi: [docs/PRD.md](docs/PRD.md)
- Keputusan arsitektur: [docs/adr/](docs/adr/)
- Panduan untuk asisten kode: [CLAUDE.md](CLAUDE.md)

## Status

**Fase 1 (Fondasi)** selesai: skema basis data dan migration, autentikasi dua jalur (staf dengan email + kata sandi, responden dengan kode akses), Manajemen Pengguna Superadmin dengan dropdown peran, serta List Responden dengan pembuatan kode (tambah, massal, impor CSV, unduh daftar, cetak kartu, reset, nonaktifkan, hapus lunak).

**Fase 2 (Inti Responden)** selesai: persetujuan, pretest (draf otomatis, terkunci setelah dikirim), pencatatan minuman termasuk "Nol", Dashboard Responden (grafik 1 minggu / 2 minggu / 1 bulan / 1 tahun, kalender 14 hari), riwayat, menu Admin Referensi Minuman, serta kolom progres di List Responden.

Sebelum pilot, peneliti wajib mengganti tiga hal yang masih berupa **CONTOH**: butir kuesioner, nilai gula di Referensi Minuman, dan teks lembar persetujuan (sekarang bisa diubah Superadmin di menu Pengaturan).

**Fase 3a** selesai: target pribadi + umpan balik mingguan, posttest (hari ke-14–17), Dashboard Admin agregat, "Lihat Hasil Responden" (dimuat saat diklik, tercatat di audit), dan menu Superadmin **Pengaturan Penelitian** (durasi, masa tenggang, susulan, faktor gula, teks persetujuan).

**Fase 3b** selesai: Materi Edukasi (Admin: Markdown + pratinjau, unggah gambar, video YouTube, kuis, jadwal hari ke-N, urutan drag-and-drop; Responden: daftar, baca, kuis yang bisa diulang). Gambar disimpan di folder lokal saat dev, di Supabase Storage saat production (ADR-008).

**Fase 4** selesai: Ekspor Data (6 dataset CSV/XLSX + Codebook, ekspor per responden; ADR-007), Log Audit untuk Superadmin, uji e2e alur Admin lengkap, dan runbook [pilot & penutupan penelitian](docs/runbook/pilot-dan-penutupan.md).

**Tambahan 2026-10-15:**

- Nama lengkap responden (opsional, terenkripsi, hanya diisi dan dilihat staf).
- Tombol **Ekspor PDF** dengan checkbox bagian: di List Responden (semua responden dalam satu PDF, plus XLSX data analisis) dan di Detail Responden (responden itu saja).
- Menu Ekspor Data dan Log Audit dihapus; pencatatan audit tetap berjalan.

Lihat ADR-009.

**Tambahan 2026-10-15 (2):**

- Menu **Kuesioner**: staf membuat soal pretest dan posttest secara terpisah (skala 1–5, pilihan ganda, isian). Masing-masing terkunci setelah ada jawaban. Lihat ADR-010.
- Pretest langsung tampil setelah persetujuan. Bila ditinggalkan, Beranda menampilkan tombol untuk melanjutkan.
- Halaman Edukasi didesain ulang.
- PantauManis bisa dipasang di layar HP (PWA).

**Tambahan 2026-10-17:** pengingat harian lewat Web Push pukul 19.00 WIB, hanya untuk responden yang hari itu belum mencatat, ditambah pengingat posttest. Pengingat dinyalakan sendiri oleh responden di Beranda. Lihat ADR-011 dan bagian Web Push di runbook deploy.

Langkah selanjutnya: jalankan pilot 3–5 responden mengikuti runbook di atas.

## Menjalankan secara lokal

Butuh Node.js 22 atau lebih baru. Docker tidak diperlukan.

```bash
npm install
cp .env.example .env          # lalu isi kedua secret (lihat komentar di file)
npm run db:dev                # terminal 1: PostgreSQL lokal di port 54329
npm run db:deploy             # terminal 2: terapkan migration
npm run superadmin:create -- --name "Nama" --email anda@contoh.id
npm run dev                   # http://localhost:3000
```

- Responden: `http://localhost:3000/masuk`
- Staf: `http://localhost:3000/staf/masuk`

Data Postgres lokal disimpan di `%LOCALAPPDATA%\pantaumanis` (Windows) atau `~/.local/share/pantaumanis`, bisa diubah lewat `PM_PG_DATA_DIR`. Lokasinya sengaja di luar folder proyek karena Windows Controlled Folder Access dapat memblokir Postgres menulis di bawah Documents.

## Database production (Supabase)

Lihat [docs/runbook/deploy-supabase.md](docs/runbook/deploy-supabase.md): kredensial disimpan di `.env.supabase`, lalu `npm run db:deploy:prod` dan `npm run superadmin:create:prod`. `.env` lokal tidak tersentuh.

## Test

```bash
npm test               # unit + integration (menyalakan Postgres test sendiri di port 54330)
npm run test:e2e       # Playwright (Postgres di 54331, build produksi di port 3100)
npm run lint           # ESLint + typecheck
```

Sebelum `test:e2e` pertama kali, jalankan `npx playwright install chromium`.

## Environment variable

| Nama                      | Keterangan                                                                      |
| ------------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`            | URL PostgreSQL                                                                  |
| `APP_URL`                 | URL publik aplikasi (dipakai di kartu kode)                                     |
| `ACCESS_CODE_HMAC_SECRET` | ≥ 32 byte base64, untuk HMAC kode akses (ADR-004)                               |
| `ACCESS_CODE_ENC_KEY`     | Tepat 32 byte base64, untuk enkripsi kode akses; harus berbeda dari secret HMAC |

Jangan pernah commit `.env`. Jika salah satu secret kode akses hilang, semua kode yang ada tidak dapat dipakai lagi. Simpan cadangannya terpisah dari backup basis data.
