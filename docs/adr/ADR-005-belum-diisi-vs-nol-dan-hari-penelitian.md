# ADR-005: Representasi "Belum diisi" vs "Nol" dan perhitungan hari penelitian

- Status: Diterima
- Tanggal: 2026-10-14
- Rujukan: PRD FR-R-02, FR-R-03, FR-A-02, BR-01 s.d. BR-05; CLAUDE.md bagian Aturan data

## Konteks

Analisis penelitian membedakan dua keadaan yang sama-sama berarti "0 minuman":

- **Belum diisi:** responden tidak mencatat apa pun, jadi datanya hilang (missing).
- **Nol:** responden menyatakan tidak minum minuman manis hari itu.

Jika keduanya disamakan, kelengkapan pencatatan dan rata-rata konsumsi akan bias. Selain itu, "hari ke-N" harus konsisten di dashboard, list Admin, dan ekspor, dan semuanya mengikuti zona waktu Asia/Jakarta.

Pemilik produk memutuskan bahwa kode akses tidak kedaluwarsa dan responden **boleh tetap mencatat setelah hari ke-14** (2026-10-14).

## Keputusan

1. **Tabel `daily_status`** dengan baris unik per (responden, tanggal):
   - **Tidak ada baris = Belum diisi.** Tidak pernah ditulis sebagai baris berisi nol.
   - `filled` = ada minimal satu catatan minuman (yang tidak dihapus).
   - `zero` = responden menekan "Hari ini saya tidak minum minuman manis".
2. **Status mengikuti catatan**, disinkronkan dalam transaksi yang sama dengan perubahan catatan:
   - Menambah minuman di hari berstatus Nol mengubahnya menjadi `filled` (BR-03).
   - Menghapus minuman terakhir di suatu hari menghapus baris statusnya, sehingga hari itu kembali menjadi **Belum diisi**, bukan Nol. Responden harus memilih "tidak minum" secara eksplisit.
   - "Nol" ditolak (409) jika hari itu sudah ada catatan minuman.
   - Status Nol bisa dibatalkan dalam jendela susulan.
3. **Hari ke-1 = tanggal pretest dikirim**, dalam waktu Asia/Jakarta (BR-01), dan disimpan di `respondents.day_one_date`. Kolom `start_date` milik Admin tetap sebagai catatan rencana saja dan tidak dipakai untuk perhitungan.
4. **Tanggal lokal disimpan per catatan** (`consumption_logs.local_date`, tipe DATE), dihitung dari `consumed_at` (UTC) menurut Asia/Jakarta. Asia/Jakarta tidak memakai DST, jadi konversinya tetap UTC+7. Semua pengelompokan per hari memakai `local_date`, tidak pernah tanggal UTC.
5. **Jendela susulan** (BR-05): catatan dan status Nol hanya bisa dibuat, diubah, atau dihapus untuk hari ini sampai `backfill_limit_days` hari ke belakang (default 2), dan tidak sebelum hari ke-1. Catatan untuk hari sebelum hari ini ditandai `is_backfill`.
6. **Di luar periode:** catatan setelah hari ke-`study_duration_days` tetap diterima dan ditandai `is_out_of_period = true`. Hari ke- tetap dihitung (mis. 21), sehingga ekspor 14 hari bisa menyaringnya tanpa kehilangan data.
7. **Kelengkapan** = jumlah hari berstatus `filled` atau `zero` dalam hari ke-1 s.d. min(hari ini, 14), dibagi jumlah hari yang sudah berjalan dalam periode itu.
8. **Grafik:** di grafik garis dan batang, hari Belum diisi digambar sebagai celah (`null`), dan hari Nol sebagai titik 0. Kalender memakai warna yang berbeda untuk Terisi, Nol, Belum diisi, dan Akan datang. Ringkasan teks selalu menyebut jumlah hari Nol dan Belum diisi secara terpisah.
9. **Estimasi gula** disimpan sebagai `sugar_g_snapshot` saat catatan dibuat atau diubah. Rumusnya: gula per sajian × (volume ÷ volume standar) × porsi × faktor tingkat gula. Faktor tingkat gula disimpan di `study_settings` (default: less 0,5, no sugar 0). Mengubah tabel referensi tidak mengubah catatan lama.

## Alternatif yang dipertimbangkan

- **Baris nol di `consumption_logs`** untuk menandai Nol: mencampur "catatan minuman" dengan "pernyataan tidak minum", dan rawan terhitung sebagai minuman.
- **Status dihitung on-the-fly tanpa tabel:** Nol tetap butuh tempat penyimpanan. Tabel status juga membuat query kelengkapan dan ekspor ringkasan harian menjadi sederhana.
- **Hari ke- dihitung dari `start_date` Admin:** bertentangan dengan BR-01.

## Konsekuensi

- Ekspor ringkasan harian (Fase 4) cukup melakukan left join tanggal 1–14 ke `daily_status`. Baris yang tidak ketemu berarti Belum diisi.
- Setiap perubahan catatan menulis dua tabel dalam satu transaksi. Integration test memeriksa sinkronisasinya (BR-03, hapus catatan terakhir, pindah tanggal).
- Analisis perlu menyaring `is_out_of_period` jika hanya memakai periode 14 hari.
