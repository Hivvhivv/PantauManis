# ADR-004: Penyimpanan kode akses (HMAC + terenkripsi agar bisa ditampilkan ulang)

- Status: Diterima
- Tanggal: 2026-10-14
- Rujukan: PRD bagian 4.1, 6 (FR-A-02), 10 (BR-08), 14 (Pertanyaan terbuka no. 1); ADR-003

## Konteks

PRD meminta kode akses disimpan dalam bentuk hash. Di sisi lain, List Responden menampilkan kode yang disamarkan dengan tombol "tampilkan dan salin", serta ada fitur Cetak Kartu Kode dan Unduh daftar kode. Semua itu butuh teks kode bisa dibaca ulang. Pertanyaan terbuka PRD no. 1 sudah diputuskan pemilik produk: **kode tetap bisa dilihat di list**.

Format kode juga diputuskan pemilik produk dan menggantikan teks lama PRD 4.1 ("8 karakter, huruf dan angka"):

- Format kanonis `PM-` + 6 digit acak, contoh `PM-482915`. Di kartu kode ditampilkan sebagai `PM-482-915`.
- Input toleran: prefiks `PM-` boleh ada atau tidak, spasi dan tanda strip diabaikan, huruf kecil diterima. Kolom input memakai `inputmode="numeric"`.
- Kode berpola dihindari.
- Penyimpanan untuk pencarian memakai HMAC-SHA256 dengan secret dari env, bukan hash biasa.

Dengan hanya 10⁶ kemungkinan, hash lambat (bcrypt/argon2) tidak memberi perlindungan berarti jika basis data bocor: semua kombinasi bisa dicoba dalam hitungan menit. Selain itu, hash ber-salt tidak bisa dicari langsung, sehingga login harus mencocokkan ke semua responden. HMAC dengan secret di luar basis data justru lebih kuat: tanpa secret, isi basis data tidak bisa dipakai untuk menebak kode.

## Keputusan

1. **Pembuatan kode:** 6 digit dari `crypto.randomInt`, bukan berurutan. Kandidat ditolak dan diundi ulang jika berpola:
   - semua digit sama (`111111`);
   - urut naik atau turun (`123456`, `654321`, `012345`, termasuk yang berputar seperti `890123`);
   - pengulangan periode 2 atau 3 (`121212`, `123123`);
   - cerminan (`123321`);
   - kode yang sudah dipakai responden lain, termasuk yang sudah dihapus lunak.
2. **Normalisasi input** sebelum diproses: ubah ke huruf kapital, buang semua karakter selain huruf dan angka, buang prefiks `PM` di depan. Hasilnya harus tepat 6 digit; jika tidak, ditolak dengan pesan umum yang sama seperti kode salah.
3. **Dua kolom di `respondents`:**
   - `access_code_hmac`: `HMAC-SHA256(ACCESS_CODE_HMAC_SECRET, "482915")` dalam hex, dengan **unique index**. Kolom ini dipakai untuk login dan cek keunikan.
   - `access_code_encrypted`: AES-256-GCM dengan kunci `ACCESS_CODE_ENC_KEY`, IV acak 12 byte per kode, disimpan sebagai `v1:<iv>:<tag>:<ciphertext>` (base64). Kolom ini hanya didekripsi untuk tampilkan, salin, cetak, dan unduh.
   - Kedua secret hanya ada di environment variable, berbeda satu sama lain, dan tidak pernah disimpan di basis data atau repositori.
4. **Tampilan:**
   - List dan detail menampilkan `PM-48••••`. Teks penuh tidak dikirim ke browser saat halaman dimuat.
   - Tombol "Tampilkan" atau "Salin" memanggil `POST /api/admin/respondents/:id/reveal-code` (hanya staf, dicatat di `audit_logs` sebagai `respondent.code_revealed`). Respons berisi header `Cache-Control: no-store`.
   - Kode lengkap ditampilkan otomatis setelah dibuat atau di-reset.
   - Cetak Kartu dan Unduh daftar kode juga dicatat di audit. Berkas unduhan memuat ID Responden dan kode, karena memang dipakai untuk dibagikan saat rekrutmen.
   - QR di kartu hanya berisi tautan halaman masuk, **tanpa kode**, supaya kode tidak tersimpan di riwayat browser atau log server.
5. **Reset kode** (BR-08): kode baru dibuat, lalu `access_code_hmac` dan `access_code_encrypted` diganti dalam satu transaksi, dan semua `respondent_sessions` milik responden itu dihapus. Kode lama langsung tidak berlaku, sedangkan data penelitian tidak disentuh.
6. **Rotasi kunci:** kolom terenkripsi memakai prefiks versi (`v1:`). Untuk rotasi, semua kode didekripsi dengan kunci lama, lalu HMAC dan ciphertext dihitung ulang dengan kunci baru lewat skrip terdokumentasi. Ini bisa dilakukan karena teks kode masih tersedia lewat enkripsi.

## Alternatif yang dipertimbangkan

- **Hash saja (bcrypt/argon2), tampil sekali:** ditolak pemilik produk karena alur rekrutmen butuh salin dan cetak ulang. Selain itu, perlindungannya semu untuk ruang 10⁶.
- **SHA-256 tanpa secret:** isi basis data yang bocor langsung bisa dibalik dengan mencoba 10⁶ kemungkinan.
- **Format alfanumerik 8 karakter** (teks PRD lama): ruangnya jauh lebih besar, tetapi diganti pemilik produk demi kemudahan bagi responden (cukup angka, keyboard numerik di ponsel).

## Konsekuensi dan risiko

- **Ruang kode kecil (sekitar 10⁶, dikurangi kode berpola).** Keamanan login bergantung pada rate limit per IP (5 gagal / 15 menit) dan rate limit global (≥ 50 gagal / 15 menit → penundaan dan peringatan), lihat ADR-003. Dengan misalnya 200 responden aktif, peluang satu tebakan acak mengenai kode yang valid sekitar 1 : 5.000. Rate limit global membatasi penyerang yang memakai banyak IP menjadi paling banyak sekitar 200 tebakan per jam (≈ 4.800 per hari). Artinya, penyerang yang gigih dan memakai banyak IP **masih bisa menembus sekitar satu akun responden per hari**. Peringatan Superadmin memang sudah muncul pada ledakan pertama, tetapi tidak menghentikan serangan. Risiko ini diterima secara sadar untuk Fase 1, dengan mitigasi: banner peringatan, audit log, dan Reset Kode untuk responden yang terdampak bila terjadi insiden. Jika jumlah responden jauh lebih besar atau serangan terdeteksi, ADR ini harus ditinjau ulang (mis. menurunkan ambang global, menambah digit, atau menambah faktor kedua seperti tanggal lahir).
- Jika basis data **dan** kedua secret bocor bersamaan, semua kode terbuka. Karena itu secret disimpan terpisah dari backup basis data.
- PRD bagian 4.1, kolom List Responden, dan model data di `docs/PRD.md` sudah disesuaikan dengan format dan penyimpanan baru.
- Kode tidak kedaluwarsa (lihat ADR-003), sehingga satu kode tetap berlaku sampai di-reset atau responden dinonaktifkan. Hal ini memperpanjang jangka waktu kode bisa ditebak; ruang kode yang kecil tetap menjadi risiko utama.
