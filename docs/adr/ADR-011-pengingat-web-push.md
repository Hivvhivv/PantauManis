# ADR-011: Pengingat harian lewat Web Push

- Status: Diterima
- Tanggal: 2026-10-17
- Rujukan: PRD bagian 2 (semula "di luar lingkup v1"), metrik "hari terisi ≥ 80%", FR-R-07, BR-02, BR-09, BR-10; ADR-002 (Vercel + Supabase)

## Konteks

Kelengkapan pencatatan harian adalah metrik utama penelitian. Pemilik produk memutuskan (2026-10-17) menambahkan pengingat yang muncul di HP responden:

- dikirim **pukul 19.00 WIB**;
- hanya ke responden yang **hari itu belum mencatat**;
- ditambah **pengingat posttest** selama jendela posttest terbuka.

Tanpa layanan berbayar (email/WhatsApp), dan tanpa aplikasi native.

## Keputusan

1. **Web Push standar** (VAPID) dengan library `web-push`. Service worker `public/sw.js` hanya menangani `push` dan `notificationclick`. Service worker itu **tidak** punya handler `fetch`, sehingga halaman, unduhan, dan sesi tidak pernah dicegat atau di-cache.
2. **Langganan dinyalakan sendiri oleh responden** di Beranda (kartu "Pengingat harian", tombol Nyalakan / Nanti saja).
   - Kartu hanya tampil bila pengingat belum aktif di perangkat itu. "Nanti saja" menyembunyikannya sampai login berikutnya (2026-10-19).
   - Untuk berhenti, responden mencabut izin notifikasi di pengaturan browser; langganan yang ditolak layanan push (404/410) dihapus otomatis. Endpoint `DELETE /api/respondent/push` tetap tersedia.
   - Disimpan di tabel `push_subscriptions` (migration `push_subscriptions`): `endpoint` unik, `p256dh`, `auth`, `user_agent`, `last_sent_at`.
   - Data ikut terhapus saat baris responden dihapus.
   - Tidak ada data pribadi di tabel ini.
   - Endpoint `POST/DELETE /api/respondent/push`: responden yang sudah pretest; `respondent_id` dari sesi (BR-09); endpoint wajib HTTPS (zod).
3. **Jadwal:** Vercel Cron `0 12 * * *` UTC (19.00 WIB) memanggil `GET /api/cron/reminders`.
   - Endpoint ini hanya menerima `Authorization: Bearer <CRON_SECRET>`, dibandingkan dengan `timingSafeEqual`. Tanpa `CRON_SECRET` di server, endpoint selalu ditolak.
   - Tanpa kunci VAPID, endpoint menjawab 503.
4. **Penerima** (`reminders/rules.ts`, satu notifikasi per responden per hari):
   - **posttest**: jendela posttest terbuka (hari ke-14 s.d. ke-17) dan belum dikirim. Prioritas.
   - **harian**: hari ke-1 s.d. ke-14 dan hari ini **Belum diisi**. Hari Nol dan Terisi tidak diingatkan (BR-02).
   - Hanya responden aktif, tidak dihapus, dan sudah pretest.
5. **Isi notifikasi netral** (BR-10): tanpa nama, angka gula, atau label kesehatan. Saat diketuk, notifikasi membuka `/catat` atau `/posttest`, hanya alamat di situs sendiri.
6. **Pemeliharaan otomatis:** langganan yang dijawab 404/410 oleh layanan push dihapus. Ringkasan tiap pengiriman (jumlah responden, terkirim, gagal, dihapus) dicatat di `audit_logs` sebagai `reminders.sent`, tanpa isi langganan.

## Alternatif yang dipertimbangkan

- **Email/WhatsApp:** butuh penyedia berbayar dan data kontak responden, yang bertentangan dengan identifikasi lewat kode saja.
- **Notifikasi lokal tanpa server** (Notification Triggers): tidak didukung luas.
- **Service worker dengan cache/offline:** tidak dibutuhkan dan berisiko mengganggu sesi serta unduhan.

## Konsekuensi

- **iPhone:** pengingat hanya bisa dinyalakan bila PantauManis sudah dipasang di layar utama (iOS 16.4+). Kartu menampilkan petunjuknya.
- **Android/Chrome** mendukung, baik aplikasi dipasang maupun tidak.
- **Vercel Hobby** menjalankan cron 1× sehari dan waktunya bisa meleset hingga sekitar 1 jam.
- Produksi butuh env `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mis. `mailto:peneliti@kampus.ac.id`), dan `CRON_SECRET`. Mengganti pasangan kunci VAPID membuat semua langganan lama tidak berlaku, sehingga responden perlu menyalakan ulang.
- Lembar persetujuan sebaiknya menyebut bahwa pengingat bersifat opsional dan bisa dimatikan kapan saja.
- E2E tidak bisa menguji tombol Nyalakan, karena Chromium headless selalu memblokir notifikasi. Logika langganan dan pengiriman diuji di integration test dengan pengirim tiruan.
