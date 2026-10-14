# ADR-007: Format dan skema ekspor data penelitian

- Status: Diterima
- Tanggal: 2026-10-14
- Rujukan: PRD FR-A-04, FR-A-07, AC-12, BR-02, BR-11; ADR-005; CLAUDE.md bagian Aturan data

## Konteks

Target PRD: 100% file ekspor bisa langsung dianalisis tanpa edit manual. Peneliti memakai R/SPSS/Python maupun Excel. Excel berbahasa Indonesia memakai titik koma sebagai pemisah daftar, sehingga CSV berkoma terbuka di satu kolom. Data harus tetap membedakan "Belum diisi" dari "Nol", dan tidak boleh memuat kode akses.

Keputusan pemilik produk (2026-10-14):

- waktu dalam WIB dengan offset;
- CSV berkoma, ditambah XLSX untuk Excel;
- jawaban kuesioner berupa kode angka beserta Codebook;
- catatan setelah hari ke-14 ikut diekspor dan ditandai.

## Keputusan

1. **Enam dataset** (`/api/admin/export/<dataset>?format=csv|xlsx`), khusus Admin/Superadmin:

   | Dataset            | Satu baris per                          | Kunci                           |
   | ------------------ | --------------------------------------- | ------------------------------- |
   | `responden`        | responden                               | `id_responden`                  |
   | `log_konsumsi`     | catatan minuman                         | `id_catatan`                    |
   | `ringkasan_harian` | responden × hari ke-1…durasi            | `id_responden`, `hari_ke`       |
   | `kuesioner`        | responden (pre & post dalam satu baris) | `id_responden`                  |
   | `target`           | periode target                          | `id_responden`, `berlaku_mulai` |
   | `edukasi`          | responden × materi                      | `id_responden`, `id_materi`     |

   `semua` menghasilkan satu XLSX berisi keenam sheet ditambah **Codebook**. Sheet Codebook memuat arti setiap kolom, serta kode, label, dan skor setiap pilihan jawaban kuesioner.

2. **Konvensi nilai:**
   - Nama kolom memakai `snake_case` Bahasa Indonesia.
   - Waktu memakai ISO 8601 WIB dengan offset (`2026-10-14T19:30:00+07:00`), dan tanggal memakai `YYYY-MM-DD` menurut WIB.
   - Boolean ditulis `1`/`0`.
   - **Tidak ada data = sel kosong**, tidak pernah `0`.
3. **Ringkasan harian (AC-12):** tepat `durasi` baris untuk setiap responden yang sudah pretest. Kolom `status` berisi:
   - `terisi`
   - `nol`
   - `belum_diisi`
   - `belum_berlangsung`: tanggal belum tiba, hanya muncul bila ekspor dilakukan saat periode masih berjalan.

   `jumlah_minuman` dan `perkiraan_gula_g` dikosongkan untuk `belum_diisi`/`belum_berlangsung`, dan berisi `0` untuk `nol` (ADR-005).

4. **Log konsumsi** memuat semua catatan yang tidak dihapus, termasuk catatan setelah periode, dengan kolom `di_luar_periode` = 1 dan `susulan` = 1/0. Analisis 14 hari cukup menyaring `di_luar_periode = 0`.
5. **Kuesioner:** kolom `pre_q<n>`/`post_q<n>` berisi kode angka pilihan (nilai `value` instrumen). Isian teks diekspor apa adanya. `*_skor` hanya diisi untuk kuesioner yang sudah dikirim.
6. **Privasi dan cakupan:**
   - Identitas hanya `id_responden`. Kode akses, inisial, dan data staf tidak diekspor.
   - Responden yang dihapus lunak tidak ikut (BR-11).
   - Setiap ekspor dicatat di audit log (`export.downloaded`, dengan nama dataset, format, dan jumlah baris).
7. **CSV:** pemisah koma, UTF-8 dengan BOM, baris CRLF. Sel yang diawali `= + - @` diberi awalan `'` agar tidak dijalankan sebagai formula saat dibuka di spreadsheet.
8. **Ekspor satu responden** (`/api/admin/respondents/[id]/export`, tombol "Ekspor Data Responden Ini"): XLSX semua dataset yang disaring untuk satu responden. Dicatat di audit log dengan responden itu sebagai target.
9. **Pustaka XLSX:** `exceljs`. Ada advisory `uuid` tingkat sedang lewat `exceljs`, tetapi hanya berlaku untuk uuid v3/v5/v6 dengan parameter `buf`, dan jalur itu tidak dipakai di sini.

## Alternatif yang dipertimbangkan

- **CSV bertitik koma:** langsung rapi di Excel Indonesia, tetapi tidak standar untuk tool analisis. Kebutuhan Excel sudah dipenuhi oleh XLSX.
- **Format lebar untuk ringkasan harian** (kolom hari_1…hari_14): ringkas, tetapi sulit diolah untuk model data panjang. Format panjang lebih umum untuk analisis berulang.
- **Label teks untuk jawaban:** mudah dibaca, tetapi harus dikode ulang sebelum dianalisis.
- **SheetJS (xlsx):** versi npm-nya sudah tidak diperbarui dan memiliki advisory yang belum ditambal.

## Konsekuensi

- Mengubah instrumen kuesioner (butir/kode) mengubah kolom `pre_q*`/`post_q*`. Codebook selalu mengikuti instrumen aktif saat ekspor.
- Ekspor dibuat di memori. Ini memadai untuk skala satu studi (ratusan responden). Untuk skala jauh lebih besar, perlu ekspor streaming.
