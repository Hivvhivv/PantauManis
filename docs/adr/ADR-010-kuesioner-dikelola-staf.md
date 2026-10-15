# ADR-010: Soal pretest/posttest dikelola staf, dan pretest lewat tombol di Beranda

- Status: Diterima
- Tanggal: 2026-10-15
- Rujukan: PRD FR-R-01, FR-R-07, BR-01, BR-06, BR-07; ADR-007 (kode jawaban di ekspor)

## Konteks

Semula butir kuesioner final akan dimasukkan lewat migration oleh pengembang. Pemilik produk memutuskan (2026-10-15):

- **Admin dan Superadmin** dapat membuat soal sendiri dari menu **Kuesioner**. Jenis soal:
  - skala 1–5 (mis. seberapa sering), dengan label per tingkat;
  - pilihan ganda (skor per pilihan);
  - isian singkat.
- **Satu set soal** dipakai untuk **pretest dan posttest**, agar skor sebelum dan sesudah dapat dibandingkan.
- Setelah login dan persetujuan, responden masuk **Beranda**. Beranda menampilkan tombol **Isi Kuesioner Awal**; fitur lain tetap terkunci sampai pretest dikirim.

## Keputusan

1. **Skema database tidak diubah.** Pretest dan posttest tetap dua baris `questionnaires`, karena jawaban terikat pada `questionnaire_id`. Saat staf menyimpan, daftar soal yang **sama** ditulis ke kuesioner pretest dan posttest yang aktif dalam satu transaksi. `is_placeholder` menjadi `false`.
2. **Kunci:** penyimpanan ditolak (`422 QUESTIONNAIRE_LOCKED`) begitu ada satu saja `questionnaire_responses`, baik draf maupun terkirim, pada kedua kuesioner itu.
   - Mengubah soal di tengah penelitian membuat jawaban lama tidak sebanding.
   - Tidak ada fitur versi baru; penggantian setelah terkunci dilakukan pengembang lewat migration.
   - Pemeriksaan kunci diulang di dalam transaksi.
3. **Nilai jawaban tetap kode angka `"1".."n"`**, sehingga ekspor dan Codebook (ADR-007) tidak berubah.
   - Skala 1–5: skor 1..5, atau 5..1 bila **skor terbalik** dicentang (untuk pernyataan bernada negatif).
   - Pilihan ganda: skor diisi staf (−100..100).
   - Isian: tidak diskor.

   Skor total = jumlah skor (fungsi `scoreAnswers` tetap).

4. **Validasi server (zod):**
   - 1–50 soal;
   - teks 1–500 karakter;
   - skala tepat 5 label;
   - pilihan ganda 2–10 pilihan.
5. **Tampilan responden:** skala 1–5 tampil sebagai lima kotak berangka (1–5) dengan labelnya, dan tetap memakai radio button (aksesibel dengan keyboard dan pembaca layar).
6. **Alur pretest (BR-06 tetap):**
   - `respondentHomePath` mengarahkan responden yang sudah setuju ke `/beranda`.
   - Beranda tanpa `day_one_date` menampilkan halaman sambutan: tombol "Isi Kuesioner Awal" (atau "Lanjutkan … (x/n)" bila ada draf) dan daftar fitur yang masih terkunci.
   - Semua halaman/endpoint "ready" tetap menolak atau mengalihkan responden yang belum pretest.
   - Hari ke-1 tetap = tanggal pretest dikirim (BR-01).
7. Setiap penyimpanan soal dicatat di `audit_logs` (`questionnaire.updated`).

## Alternatif yang dipertimbangkan

- **Satu baris kuesioner dipakai bersama pretest/posttest:** butuh perubahan kunci unik `(respondent_id, questionnaire_id)` dan migrasi data jawaban.
- **Versi kuesioner baru saat terkunci:** responden yang sudah pretest dengan versi lama akan mengerjakan posttest versi baru, sehingga perbandingan rusak.
- **Pretest tetap dipaksa langsung setelah persetujuan:** pemilik produk memilih Beranda dengan tombol.

## Konsekuensi

- Soal final **harus** dimasukkan sebelum responden pertama (termasuk pilot) mulai mengisi. Untuk pilot, gunakan database atau project uji.
- Karena pilihan kunci di atas, satu draf jawaban saja sudah mengunci soal.
