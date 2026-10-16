# ADR-008: Penyimpanan media materi edukasi

- Status: Diterima
- Tanggal: 2026-10-14
- Rujukan: PRD FR-A-05, FR-R-05; ADR-002 (Supabase sebagai PostgreSQL); CLAUDE.md bagian Keamanan

## Konteks

Materi edukasi berisi teks, gambar/infografis, dan video. Supabase sudah dipakai sebagai PostgreSQL production, **tanpa supabase-js dan tanpa Supabase Auth**. Pemilik produk memutuskan (2026-10-14):

- gambar diunggah ke **Supabase Storage**, dengan **bucket publik**;
- video **tidak** diunggah, tetapi ditempel sebagai tautan YouTube;
- isi materi ditulis dalam **Markdown**.

Pengembangan lokal dan test harus tetap bisa berjalan tanpa kredensial Supabase.

## Keputusan

1. **Antarmuka penyimpanan** (`src/server/storage`) dengan dua driver, dipilih lewat `STORAGE_DRIVER`:
   - `local` (default): file disimpan di `PM_UPLOAD_DIR` atau `%LOCALAPPDATA%/pantaumanis/uploads`, lalu disajikan oleh `GET /api/media/[...key]`. Rute ini hanya aktif untuk driver lokal.
   - `supabase`: REST API Storage (`/storage/v1/object/...`) memakai `SUPABASE_SERVICE_ROLE_KEY` **hanya di server**. File disajikan langsung lewat URL publik bucket (`/storage/v1/object/public/<bucket>/<key>`).
2. **Unggahan lewat server, bukan langsung dari browser:** `POST /api/admin/education/media` (khusus staf). Server memeriksa:
   - ukuran maksimal 4 MB (2026-10-16: diturunkan dari 5 MB karena Vercel menolak body request di atas 4,5 MB sebelum sampai ke aplikasi);
   - tipe file dari **isi file (magic bytes)**: hanya JPG, PNG, WebP. SVG ditolak karena bisa memuat skrip;
   - nama file acak: `edukasi/<uuid>.<ext>`. Pola kunci divalidasi agar tidak ada path traversal.
3. **Basis data hanya menyimpan kunci file** (`image_key`), bukan URL. URL dibentuk saat ditampilkan, sehingga driver atau bucket bisa diganti tanpa migrasi data. Gambar lama dihapus dari storage saat diganti; kegagalan hapus tidak menggagalkan penyimpanan materi.
4. **Video:** hanya tautan YouTube yang diterima (`youtube.com`, `youtu.be`, `shorts`, `embed`). Video disematkan lewat `youtube-nocookie.com` dengan `loading="lazy"`.
5. **Markdown** dirender dengan `react-markdown` + `skipHtml`. HTML mentah tidak dirender, tautan `javascript:` dibuang, tautan dibuka di tab baru dengan `rel="noopener noreferrer"`, dan gambar inline di Markdown diabaikan (gambar hanya lewat unggahan).

## Alternatif yang dipertimbangkan

- **supabase-js di browser (upload langsung):** butuh kebijakan RLS Storage dan kunci publik di browser. Ini bertentangan dengan keputusan "Supabase hanya sebagai database".
- **Bucket privat + signed URL:** lebih tertutup, tetapi materi edukasi bukan data pribadi. Pemilik produk memilih bucket publik.
- **Video diunggah:** boros kuota (batas paket gratis 50 MB per file) dan berat diputar di koneksi lambat.
- **Editor WYSIWYG / HTML:** risiko XSS lebih besar. Markdown sudah cukup untuk judul, tebal, daftar, dan tautan.

## Konsekuensi

- Production butuh tiga env tambahan: `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (opsional `SUPABASE_STORAGE_BUCKET`, default `edukasi`), serta bucket publik bernama sama. Lihat `docs/runbook/deploy-supabase.md`.
- Bila penyimpanan belum diatur (driver lokal di Vercel, kunci Supabase kosong atau ditolak, atau bucket belum ada), unggahan dijawab `503 STORAGE_NOT_CONFIGURED` dengan penyebab yang bisa ditindaklanjuti staf, tanpa menampilkan rahasia.
- Service role key memberi akses penuh ke project Supabase. Kunci ini wajib hanya ada di env server, tidak pernah di kode, browser, atau log.
- Gambar yang diunggah tetapi materinya tidak jadi disimpan akan tertinggal di storage (yatim). Untuk skala satu studi, risiko ini diterima.
- Gambar dalam bucket publik bisa diakses siapa pun yang mengetahui URL acaknya, termasuk gambar materi berstatus Draf.
