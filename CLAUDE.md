PantauManis

Website intervensi self-monitoring konsumsi minuman manis untuk dewasa muda, dipakai dalam penelitian 14 hari. Bukan alat diagnosis diabetes.

Dokumen rujukan
Spesifikasi lengkap: @docs/PRD.md — baca bagian yang relevan sebelum mengerjakan fitur.
Keputusan arsitektur: docs/adr/ (buat ADR baru untuk setiap keputusan teknis penting).
Stack
Framework: Next.js 15 (App Router) + TypeScript strict, Node 22+ (ADR-001)
Database: PostgreSQL; dev/test lokal memakai embedded-postgres, tanpa Docker (ADR-002)
ORM & migration: Prisma 7 + Prisma Migrate (client di src/generated/prisma)
Validasi: zod di setiap endpoint
Grafik: Chart.js
Testing: Vitest (unit + integration dengan Postgres asli) + Playwright (e2e)
Perintah
Jalankan Postgres dev: npm run db:dev (biarkan terminal tetap terbuka)
Jalankan dev server: npm run dev
Jalankan semua test: npm test (unit + integration), npm run test:e2e (Playwright)
Lint & format: npm run lint (ESLint + tsc), npm run format
Migration: npm run db:migrate -- --name <nama> (dev), npm run db:deploy (produksi)
Superadmin pertama / reset kata sandi Superadmin: lihat docs/runbook/superadmin-cli.md
Production (Supabase): npm run db:status:prod / db:deploy:prod / superadmin:create:prod, membaca .env.supabase (docs/runbook/deploy-supabase.md). Jangan menjalankan perintah :prod tanpa diminta.
Struktur kode
src/app/** halaman dan Route Handlers (tipis); src/server/modules/** logika bisnis; src/server/auth/** sesi, guard, rate limit.
Setiap Route Handler dibungkus route() dan memanggil requireStaff/requireSuperadmin/requireRespondent.
Peran dan akses
Tiga peran: superadmin, admin, responden. Matriks hak akses ada di PRD bagian 3.
Akun staf (staff_users) dan responden (respondents) disimpan di tabel terpisah.
Responden login HANYA dengan kode akses. Admin/Superadmin login dengan email + kata sandi.
Setiap route/endpoint wajib memeriksa peran di server. Menyembunyikan menu di UI bukan kontrol akses.
Data responden selalu disaring dengan respondent_id dari sesi, BUKAN dari parameter URL.
Superadmin tidak boleh menurunkan peran/menghapus dirinya sendiri; minimal satu Superadmin aktif.
Detail Responden (admin) tidak memuat data hasil. Data hasil diambil hanya saat tombol "Lihat Hasil Responden" diklik, dan setiap pembukaan dicatat di audit_logs.
Aturan data
"Belum diisi" (tidak ada catatan) BERBEDA dengan "Nol" (responden menekan "tidak minum hari ini"). Jangan pernah disamakan di dashboard, perhitungan, maupun ekspor.
Hari ke-1 = tanggal pretest dikirim. Periode default 14 hari.
Simpan waktu dalam UTC, tampilkan dalam Asia/Jakarta. Ekspor memakai ISO 8601.
Setiap catatan konsumsi menyimpan snapshot nilai gula saat dibuat (sugar_g_snapshot).
Semua perubahan skema WAJIB lewat migration. Jangan ubah database secara manual.
Hapus responden = soft delete.
Keamanan
Kata sandi dan kode akses disimpan dalam bentuk hash. Kode akses dibuat acak (bukan berurutan).
Rahasia hanya di environment variable (.env), jangan pernah di kode sumber atau di-commit.
Jangan log atau tampilkan di pesan error: kode akses, kata sandi, token, jawaban kuesioner.
Rate limit login: 5 percobaan gagal per 15 menit. Pesan error login dibuat umum.
Validasi semua input di server; validasi browser hanya pelengkap.
Konten dan UI
Seluruh teks antarmuka dalam Bahasa Indonesia.
Jangan pernah menampilkan label risiko atau diagnosis (mis. "berisiko", "prediabetes"). Umpan balik hanya membandingkan dengan target milik responden, bernada positif.
Estimasi gula selalu ditulis sebagai "perkiraan".
Mobile-first untuk halaman responden; harus nyaman di lebar 360 px.
Aksesibilitas: label di setiap input, kontras cukup, grafik disertai ringkasan teks.
Cara kerja
Kerjakan per fase sesuai PRD bagian 14. Jangan mengerjakan fitur di luar fase yang diminta.
Untuk fitur baru: buat rencana dulu (file yang diubah, migration, endpoint, test), tunggu persetujuan.
Jika PRD ambigu atau bertentangan, tanyakan dulu, jangan menebak.
Fitur dianggap selesai jika memenuhi Definition of Done (PRD bagian 13): test relevan ditulis dan lulus, validasi + kontrol akses ada, dokumentasi diperbarui.
Setelah perubahan, jalankan test dan lint sebelum menyatakan selesai.