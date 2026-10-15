# ADR-009: Nama lengkap responden dan laporan PDF

- Status: Diterima
- Tanggal: 2026-10-15
- Rujukan: PRD bagian 2 (batasan etis), 9 (model data), FR-A-04, FR-A-07; ADR-004 (enkripsi kode akses); ADR-006 (lazy loading hasil)

## Konteks

Semula PRD menetapkan bahwa responden hanya diidentifikasi dengan ID (mis. R001) dan sistem tidak menyimpan nama lengkap. Pemilik produk memutuskan (2026-10-15) bahwa peneliti membutuhkan **laporan PDF** yang memuat **nama responden**, grafik, dan data yang diinput responden:

- **PDF per responden:** dibuka dari Detail Responden (panel Lihat Hasil) dan dari dropdown di menu Ekspor.
- **PDF keseluruhan:** dibuka dari dropdown di menu Ekspor. Isinya agregat Dashboard Admin ditambah satu baris ringkas per responden, termasuk nama.
- **Akses:** hanya Admin dan Superadmin.

## Keputusan

1. **Kolom `respondents.full_name_encrypted`**, boleh kosong. Nama disimpan **terenkripsi AES-256-GCM** dengan kunci `ACCESS_CODE_ENC_KEY` (format yang sama dengan ADR-004). Jika isi database bocor, nama tidak langsung terbaca. Akibatnya, nama tidak bisa dicari atau diurutkan di database; List Responden tetap mencari berdasarkan ID dan inisial.
2. **Tempat nama tampil:** Detail Responden, form Edit, dropdown PDF di menu Ekspor, dan isi PDF. Nama **tidak** tampil di List Responden dan **tidak pernah** ikut ekspor CSV/XLSX analisis. FR-A-07 tetap memakai ID Responden. Nama juga tidak ditulis ke log maupun pesan error.
3. **Input:** form Tambah/Edit Responden, Tambah Pengguna (peran Responden), dan kolom opsional `nama` pada impor CSV. Validasi server: maksimal 100 karakter; hanya huruf (Unicode), spasi, titik, koma, apostrof, dan strip.
4. **PDF dibuat lewat fitur cetak browser**, tanpa library PDF di server:
   - `/admin/responden/[id]/pdf` untuk satu responden;
   - `/admin/ekspor/pdf?r=semua|<id>` untuk keseluruhan, atau diteruskan ke halaman per responden.

   Halaman ini merender data dan grafik Chart.js yang sama dengan panel Lihat Hasil dan Dashboard Admin, lalu membuka dialog cetak ("Simpan sebagai PDF"). Halaman dilindungi `staffForPage`.

5. **Audit:** setiap pembukaan halaman PDF dicatat sebagai `export.downloaded` dengan `metadata.format = "pdf"`. Untuk PDF keseluruhan ditambah `dataset = "keseluruhan"`. Membuka PDF tidak tercatat sebagai `respondent.results_viewed`, karena data dimuat untuk diekspor, bukan untuk panel. Sesuai ADR-006, data tetap baru diambil saat tautan diklik.

## Alternatif yang dipertimbangkan

- **Hanya ID + inisial di PDF:** sesuai PRD lama, tetapi tidak memenuhi kebutuhan peneliti.
- **Nama sebagai teks biasa:** bisa dicari, tetapi terbaca langsung bila backup atau database bocor.
- **PDF di server (pdfkit/Puppeteer):** butuh dependensi berat (Chromium) atau menggambar ulang grafik secara manual. Fitur cetak browser memberi hasil yang sama dengan tampilan layar.

## Konsekuensi

- Penyimpanan nama lengkap **wajib disetujui komite etik**, dan lembar persetujuan perlu menyebutkannya (teks bisa diubah di menu Pengaturan).
- PDF berisi data pribadi. File PDF yang tersimpan di perangkat staf berada di luar kendali aplikasi, sehingga hanya log pembukaannya yang tercatat.
- Saat hapus permanen (BR-11), kolom ini ikut terhapus bersama baris responden.
- Kehilangan `ACCESS_CODE_ENC_KEY` berarti nama dan kode akses tidak bisa dibaca lagi (ADR-004).
