# ADR-010: Soal pretest dan posttest dikelola staf secara terpisah

- Status: Diterima (diperbarui 2026-10-16: soal pretest dan posttest terpisah; pretest kembali langsung tampil setelah persetujuan)
- Tanggal: 2026-10-15
- Rujukan: PRD FR-R-01, FR-R-07, BR-01, BR-06, BR-07; ADR-007 (kode jawaban di ekspor)

## Konteks

Semula butir kuesioner final akan dimasukkan lewat migration oleh pengembang. Pemilik produk memutuskan:

- (2026-10-15) **Admin dan Superadmin** membuat soal sendiri dari menu **Kuesioner**. Jenis soal:
  - skala 1–5 (mis. seberapa sering), dengan label per tingkat;
  - pilihan ganda (skor per pilihan);
  - isian singkat.
- (2026-10-16) **Pretest dan posttest memiliki soal yang berbeda**, sehingga keduanya dikelola terpisah.
- (2026-10-16) **Pretest langsung ditampilkan setelah login dan persetujuan.** Beranda dengan tombol "Isi Kuesioner Awal" tetap ada bila responden keluar dari pretest sebelum selesai.

## Keputusan

1. **Skema database tidak diubah.** Pretest dan posttest tetap dua baris `questionnaires` yang aktif, masing-masing dengan soalnya sendiri.
   - Halaman **Kuesioner** punya tab **Pretest** dan **Posttest** (`?jenis=`).
   - Endpoint `PUT /api/admin/questionnaire` menerima `{ type, questions }` dan hanya mengganti soal jenis itu, dalam satu transaksi. `is_placeholder` menjadi `false`.
2. **Kunci per jenis:** penyimpanan ditolak (`422 QUESTIONNAIRE_LOCKED`) begitu ada satu saja `questionnaire_responses` (draf atau terkirim) pada kuesioner jenis itu.
   - Soal pretest terkunci sejak responden pertama mulai mengisi pretest.
   - Soal posttest masih bisa diubah sampai ada yang mengisi posttest (sekitar hari ke-14).
   - Pemeriksaan kunci diulang di dalam transaksi. Tidak ada fitur versi baru; penggantian setelah terkunci dilakukan pengembang lewat migration.
3. **Nilai jawaban tetap kode angka `"1".."n"`**, sehingga ekspor dan Codebook (ADR-007) tidak berubah. Codebook sudah mencantumkan soal pretest (`pre_q…`) dan posttest (`post_q…`) secara terpisah.
   - Skala 1–5: skor 1..5, atau 5..1 bila **skor terbalik** dicentang.
   - Pilihan ganda: skor diisi staf (−100..100).
   - Isian: tidak diskor.

   Skor total = jumlah skor (`scoreAnswers`).

4. **Validasi server (zod):**
   - `type` wajib `pretest`/`posttest`;
   - 1–50 soal;
   - teks 1–500 karakter;
   - skala tepat 5 label;
   - pilihan ganda 2–10 pilihan.
5. **Tampilan responden:** skala 1–5 tampil sebagai lima kotak berangka dengan labelnya, tetap memakai radio button.
6. **Tampilan hasil (Lihat Hasil dan PDF):** karena soalnya berbeda, pretest dan posttest **tidak** dibandingkan per nomor. Yang tampil adalah skor total keduanya, lalu satu tabel jawaban per kuesioner.
7. **Alur pretest (BR-06 tetap):**
   - `respondentHomePath`: belum setuju diarahkan ke `/persetujuan`, belum pretest ke `/pretest`, selain itu ke `/beranda`.
   - Halaman pretest punya tautan "Kembali ke Beranda". Beranda tanpa `day_one_date` menampilkan tombol "Isi Kuesioner Awal" (atau "Lanjutkan … (x/n)") dan daftar fitur yang masih terkunci.
   - Halaman dan endpoint lain tetap menolak atau mengalihkan responden yang belum pretest. Hari ke-1 = tanggal pretest dikirim (BR-01).
8. Setiap penyimpanan soal dicatat di `audit_logs` (`questionnaire.updated`, metadata `type`).

## Alternatif yang dipertimbangkan

- **Satu set soal untuk keduanya** (keputusan 2026-10-15): diganti karena instrumen pretest dan posttest berbeda.
- **Versi kuesioner baru saat terkunci:** responden yang sudah mengisi versi lama akan bercampur dengan versi baru, sehingga analisis rusak.

## Konsekuensi

- Soal pretest final **harus** diisi sebelum responden pertama (termasuk pilot) mulai mengisi. Soal posttest harus final sebelum responden pertama mencapai hari ke-14.
- Skor pretest dan posttest hanya sebanding bila instrumennya dirancang untuk itu (mis. skala yang sama). Ini menjadi tanggung jawab desain instrumen penelitian.
