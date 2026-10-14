# ADR-002: Pemilihan basis data dan hosting (termasuk lokasi data)

- Status: Diterima untuk basis data dan ORM; **Diusulkan** untuk penyedia hosting dan lokasi data (menunggu ketentuan komite etik)
- Tanggal: 2026-10-14
- Rujukan: PRD bagian 9 (Model Data), 11 (Ketersediaan, Konsistensi waktu), 12, 14 (Pertanyaan terbuka: lokasi server)

## Konteks

PRD bagian 12 tidak konsisten: menyebut MongoDB sebagai basis data, tetapi juga Prisma + migration dan hosting "PostgreSQL terkelola". CLAUDE.md mewajibkan semua perubahan skema lewat migration. Prisma Migrate tidak mendukung MongoDB (hanya `db push`, tanpa riwayat migration).

Model data PRD bagian 9 bersifat relasional: responden → log konsumsi, status harian, target, jawaban kuesioner. Aturan bisnisnya butuh constraint dan transaksi (mis. "minimal satu Superadmin aktif", "kode akses unik"). Ekspor perlu agregasi per responden per hari.

Mesin pengembangan saat ini tidak memiliki Docker maupun PostgreSQL terpasang.

## Keputusan

1. **Basis data:** PostgreSQL (versi 16 atau lebih baru).
2. **ORM & migration:** Prisma dengan Prisma Migrate. Semua perubahan skema dibuat sebagai file migration di `prisma/migrations/` dan di-commit. Constraint yang tidak bisa diungkapkan Prisma (mis. trigger audit append-only) ditulis sebagai SQL di dalam file migration.
3. **Konvensi data:**
   - Semua waktu disimpan sebagai `timestamptz` dalam UTC. Konversi ke Asia/Jakarta hanya dilakukan di lapisan tampilan; ekspor memakai ISO 8601.
   - Nama tabel dan kolom memakai `snake_case` (dipetakan dari model Prisma dengan `@@map`/`@map`).
   - Primary key berupa UUID agar ID internal tidak bisa ditebak secara berurutan.
   - Soft delete memakai kolom `deleted_at`.
4. **Encoding wajib UTF-8** (`ENCODING 'UTF8'`). Di Windows, `initdb` bawaan memakai WIN1252 dan menolak emoji serta huruf non-Latin. Helper `embedded-postgres` membuat cluster dengan `--encoding=UTF8 --locale=C`. Database produksi juga harus dibuat dengan UTF-8.
5. **Pengembangan dan test lokal:** paket `embedded-postgres` (biner PostgreSQL asli yang diunduh lewat npm) dijalankan lewat skrip `npm run db:dev`. Integration test membuat basis data terpisah dan menerapkan migration sebelum test berjalan. Jika nanti Docker atau PostgreSQL lokal tersedia, cukup ganti `DATABASE_URL`.
6. **Hosting (diusulkan):**
   - Aplikasi: Vercel (region `sin1` Singapura) atau VPS.
   - Basis data: PostgreSQL terkelola dengan backup harian yang disimpan minimal 30 hari (PRD bagian 11).
   - **Lokasi data belum diputuskan.** Pilihannya: (a) region Singapura (mis. Neon/Supabase/AWS `ap-southeast-1`), atau (b) region Jakarta (AWS `ap-southeast-3`, GCP `asia-southeast2`, atau penyedia lokal) jika komite etik atau regulasi pelindungan data pribadi mensyaratkan data disimpan di Indonesia. ADR ini diperbarui setelah ketentuan komite etik diterima.

## Alternatif yang dipertimbangkan

- **MongoDB + Prisma:** tidak ada migration berversi, relasi dan constraint lemah, dan tidak sesuai aturan CLAUDE.md.
- **SQLite:** mudah untuk lokal, tetapi berbeda perilaku dari produksi (tipe waktu, konkurensi, trigger). Untuk test integrasi, PostgreSQL asli lebih dapat dipercaya.
- **Docker Compose untuk dev:** tidak tersedia di mesin saat ini; `embedded-postgres` memberi PostgreSQL asli tanpa Docker.

## Konsekuensi

- Constraint penting (keunikan kode, append-only audit) dijaga basis data, bukan hanya oleh kode aplikasi.
- Integration test berjalan di PostgreSQL asli, sehingga lebih lambat dibanding mock, tetapi lebih jujur.
- Pemilihan region produksi tetap terbuka dan harus diputuskan sebelum rekrutmen responden (Fase 4).
