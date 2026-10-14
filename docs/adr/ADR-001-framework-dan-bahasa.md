# ADR-001: Pemilihan framework dan bahasa

- Status: Diterima
- Tanggal: 2026-10-14
- Rujukan: PRD bagian 11 (Pemeliharaan), 12 (Rekomendasi Teknologi)

## Konteks

PantauManis adalah website dengan tiga peran (Superadmin, Admin, Responden). Halaman Responden harus mobile-first, sedangkan halaman staf berisi tabel, form, dan grafik. Timnya kecil, dan PRD bagian 12 merekomendasikan opsi JavaScript/TypeScript. Aplikasi perlu bisa diuji di tiga lapisan (unit, integration, e2e), dan kontrol akses wajib dilakukan di server.

## Keputusan

1. **Bahasa:** TypeScript (mode `strict`) di seluruh kode, berjalan di Node.js 24 LTS.
2. **Framework:** Next.js dengan App Router dalam satu repositori monolit. Halaman dan API berada dalam satu aplikasi.
3. **Lapisan kode:**
   - `src/app/**`: halaman (Server Components) dan Route Handlers `/api/**`. Lapisan ini tipis: hanya membaca input, memanggil guard, memanggil service, dan memformat respons.
   - `src/server/modules/**`: logika bisnis per modul (responden, pengguna staf, audit, pengaturan). Lapisan ini tidak bergantung pada objek HTTP, sehingga bisa diuji langsung dengan basis data uji.
   - `src/server/auth/**`: sesi, guard peran, rate limit, dan hashing.
4. **Mutasi** lewat Route Handlers (`POST/PATCH/DELETE /api/...`), bukan Server Actions. Alasannya: endpoint mudah diuji integrasi, kontrak error seragam (PRD bagian 10), dan setiap endpoint punya pemeriksaan peran yang eksplisit.
5. **Otorisasi:** middleware Next.js hanya untuk pengalihan kasar (belum login → halaman masuk). Pemeriksaan yang menentukan dilakukan di setiap Route Handler dan halaman server melalui `requireStaff(roles)` atau `requireRespondent()`, yang membaca sesi dari basis data.
6. **Validasi input:** skema `zod` di server untuk setiap endpoint. Validasi di browser hanya pelengkap.
7. **Pengujian:** Vitest untuk unit dan integration test, Playwright untuk e2e.
8. **Kualitas kode:** ESLint dan Prettier, dijalankan lewat skrip `npm run lint` dan `npm run format`.
9. **Grafik:** Chart.js (sesuai CLAUDE.md). Baru dipakai mulai Fase 2.

## Versi yang dipakai (Fase 1)

Next.js 15.5, React 19.2, Prisma 7.10 (dengan `@prisma/adapter-pg`), TypeScript 5.9, zod 4, Vitest 3.2, Playwright 1.64, ESLint 9. Versi major yang lebih baru di registri (Next 16, Prisma 8 RC, TypeScript 7, Vitest 5) sengaja belum dipakai. Peningkatannya dilakukan sebagai pekerjaan terpisah setelah dievaluasi.

## Alternatif yang dipertimbangkan

- **Server Actions untuk semua mutasi:** kodenya lebih ringkas, tetapi lebih sulit diuji sebagai endpoint, dan kontrak error API menjadi tersebar.
- **Backend terpisah (mis. Express/NestJS) + SPA:** pemisahannya lebih tegas, tetapi ada dua deployment dan dua basis kode untuk tim kecil. Ini tidak sepadan untuk satu studi 14 hari.
- **Opsi non-JS dari PRD:** tidak dipilih. Tim memakai TypeScript, dan Chart.js serta Playwright sudah satu ekosistem.

## Konsekuensi

- Satu deployment, satu bahasa, dan tipe data yang sama di server dan UI.
- Middleware tidak boleh dianggap sebagai kontrol akses. Setiap handler baru wajib memanggil guard, dan integration test memeriksa penolakan lintas peran untuk setiap endpoint.
- Logika bisnis di `src/server/modules` harus tetap bebas dari objek `Request`/`Response` agar bisa diuji tanpa server HTTP.
