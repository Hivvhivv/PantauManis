# ADR-009: Nama lengkap responden dan laporan PDF

- Status: Diterima (diperbarui 2026-10-15: menu Ekspor Data dan Log Audit dihapus, PDF dengan checkbox bagian)
- Tanggal: 2026-10-15
- Rujukan: PRD bagian 2 (batasan etis), 9 (model data), FR-A-04, FR-A-07, FR-S-03; ADR-004 (enkripsi kode akses); ADR-006 (lazy loading hasil); ADR-007 (format ekspor)

## Konteks

Semula PRD menetapkan bahwa responden hanya diidentifikasi dengan ID (mis. R001) dan sistem tidak menyimpan nama lengkap. Pemilik produk memutuskan (2026-10-15):

- peneliti membutuhkan **laporan PDF** yang memuat **nama responden**, grafik, dan data yang diinput responden;
- nama lengkap **hanya diisi dan dilihat staf**, tidak pernah oleh responden;
- tombol **Ekspor PDF** di **List Responden** membuka checkbox bagian data untuk **semua responden dalam satu PDF**;
- tombol yang sama di **Detail Responden** berlaku untuk **responden itu saja**;
- **menu Ekspor Data** dan **menu Log Audit** dihapus;
- XLSX untuk analisis statistik tetap tersedia di dialog ekspor;
- pencatatan audit tetap berjalan.

## Keputusan

1. **Kolom `respondents.full_name_encrypted`**, boleh kosong.
   - Nama disimpan **terenkripsi AES-256-GCM** dengan kunci `ACCESS_CODE_ENC_KEY` (format yang sama dengan ADR-004).
   - Jika isi database bocor, nama tidak langsung terbaca.
   - Konsekuensinya, nama tidak bisa dicari di database; List Responden tetap mencari berdasarkan ID dan inisial.
2. **Tempat nama tampil:** Detail Responden, form Edit, dan isi PDF.
   - Nama **tidak** tampil di List Responden.
   - Nama **tidak pernah** ikut XLSX/CSV analisis, yang tetap memakai ID Responden (ADR-007).
   - Nama tidak ditulis ke log maupun pesan error.
3. **Input** (oleh staf):
   - form Tambah/Edit Responden dan Tambah Pengguna (peran Responden);
   - kolom opsional `nama` pada impor CSV.

   Validasi server: maksimal 100 karakter; hanya huruf (Unicode), spasi, titik, koma, apostrof, dan strip.

4. **Dialog Ekspor PDF** (`<details>` + form GET, tanpa JavaScript) dengan checkbox bagian:

   | Bagian                                                                | List Responden | Detail Responden |
   | --------------------------------------------------------------------- | -------------- | ---------------- |
   | Ringkasan keseluruhan (agregat Dashboard Admin + tabel per responden) | Ya             | Tidak            |
   | Ringkasan & grafik                                                    | Ya             | Ya               |
   | Kalender kelengkapan                                                  | Ya             | Ya               |
   | Log konsumsi                                                          | Ya             | Ya               |
   | Target                                                                | Ya             | Ya               |
   | Pretest & posttest                                                    | Ya             | Ya               |
   | Edukasi                                                               | Ya             | Ya               |
   - Bagian dikirim sebagai `?b=…`. Nilai yang tidak dikenal diabaikan; bila tidak ada yang valid, semua bagian dipakai.
   - Halaman PDF: `/admin/responden/pdf` (semua responden) dan `/admin/responden/[id]/pdf` (satu responden).
   - Dialog yang sama berisi tautan XLSX:
     - semua dataset: `/api/admin/export/semua?format=xlsx`;
     - satu responden: "Ekspor Data Responden Ini (XLSX)".

5. **Tata letak PDF:** dibuat lewat dialog cetak browser ("Simpan sebagai PDF"), tanpa library PDF di server.
   - Ukuran A4, palet terang.
   - Sampul memuat judul, waktu, staf, dan bagian yang dipilih.
   - Setiap responden mulai di halaman baru: nama, ID, status, kartu angka kunci, lalu bagian bernomor. Grafik Chart.js sama dengan tampilan layar, dan tabel bergaris.
   - Footer berisi disclaimer.
   - Lebar laporan di layar ≈ area cetak A4, agar grafik tidak terpotong.
6. **Audit:** setiap PDF dicatat sebagai `export.downloaded` dengan `metadata.format = "pdf"` dan `sections`.
   - PDF semua responden: ditambah `dataset = "semua"` dan `count`.
   - PDF satu responden: memakai `targetId`.
   - Data baru dimuat saat form dikirim (ADR-006).
7. **Menu Log Audit dihapus; tabel `audit_logs` tetap diisi** dan tetap hanya-bisa-ditambah.
   - Riwayat tindakan per responden tetap tampil di Detail Responden.
   - Pemeriksaan log lengkap dilakukan langsung di database (Supabase) bila diperlukan.

## Alternatif yang dipertimbangkan

- **Hanya ID + inisial di PDF:** sesuai PRD lama, tetapi tidak memenuhi kebutuhan peneliti.
- **Nama sebagai teks biasa:** bisa dicari, tetapi terbaca langsung bila backup atau database bocor.
- **PDF di server (pdfkit/Puppeteer):** butuh dependensi berat (Chromium) atau menggambar ulang grafik secara manual.
- **Menghapus XLSX sepenuhnya:** analisis statistik harus menyalin data dari PDF secara manual. Ini bertentangan dengan tujuan produk no. 3, sehingga ditolak.
- **Mematikan pencatatan audit:** ditolak, karena pencatatan audit adalah kontrol keamanan dan etik (CLAUDE.md, PRD bagian 11).

## Konsekuensi

- Penyimpanan nama lengkap **wajib disetujui komite etik**, dan lembar persetujuan perlu menyebutkannya.
- PDF berisi data pribadi. File yang tersimpan di perangkat staf berada di luar kendali aplikasi; hanya pembuatannya yang tercatat.
- PDF semua responden memuat data setiap responden; untuk puluhan responden, pembuatan halaman dan dialog cetak butuh beberapa detik.
- Kehilangan `ACCESS_CODE_ENC_KEY` berarti nama dan kode akses tidak bisa dibaca lagi (ADR-004).
