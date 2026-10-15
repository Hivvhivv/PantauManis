# Runbook: persiapan pilot, pelaksanaan, dan penutupan penelitian

Fase 4 PRD: uji coba (pilot) dengan 3–5 responden sebelum rekrutmen penuh.

## 1. Sebelum pilot (daftar periksa)

**Konten. Semua yang berlabel CONTOH wajib diganti:**

- [ ] Teks lembar informasi & persetujuan resmi komite etik: menu **Pengaturan** (Superadmin).
- [ ] Instrumen pretest/posttest final: dimasukkan lewat migration baru (minta bantuan pengembang). Instrumen CONTOH dinonaktifkan (`is_active = false`), bukan dihapus.
- [ ] Nilai gula di **Referensi Minuman**: isi sumber, lalu hilangkan centang "perlu diverifikasi". Peringatan kuning di halaman itu harus hilang.
- [ ] Materi **Edukasi** diterbitkan, dengan jadwal hari ke-N bila perlu.
- [ ] Penyimpanan **nama lengkap** responden disetujui komite etik dan disebutkan di teks persetujuan (ADR-009). Jika tidak disetujui, kosongkan kolom Nama lengkap.

**Pengaturan (menu Pengaturan):** durasi 14 hari, masa tenggang posttest 3 hari, batas susulan 2 hari, faktor tingkat gula.

**Teknis:**

- [ ] `npm run db:status:prod` melaporkan semua migration sudah diterapkan (lihat `deploy-supabase.md`).
- [ ] Env production terisi: `DATABASE_URL`, `APP_URL`, `ACCESS_CODE_HMAC_SECRET`, `ACCESS_CODE_ENC_KEY` (nilai baru, bukan dari lokal), `STORAGE_DRIVER=supabase` beserta kredensial Storage.
- [ ] Cadangan kedua secret kode akses disimpan di password manager, terpisah dari backup database.
- [ ] HTTPS aktif; "Enforce SSL" di Supabase aktif.
- [ ] Backup harian Supabase aktif dan disimpan ≥ 30 hari (PRD bagian 11). Uji pulihkan sekali ke project uji.
- [ ] Akun: minimal 2 Superadmin aktif (cadangan), Admin per enumerator. Semua sudah mengganti kata sandi awal.
- [ ] Lokasi data (region Supabase) sudah sesuai ketentuan komite etik (ADR-002).

## 2. Pelaksanaan pilot (3–5 responden, ± 3–5 hari)

1. **Admin:** List Responden → Buat Kode Massal (mis. 5, awalan `P`) → Cetak Kartu.
2. Responden mencoba di ponsel masing-masing: masuk dengan kode → persetujuan → pretest → mencatat beberapa hari (termasuk hari "tidak minum") → target → membaca edukasi.
3. Untuk mencoba posttest tanpa menunggu 14 hari, pakai project/database uji dan ubah durasi di Pengaturan. **Jangan** mengubah durasi di database penelitian yang sedang berjalan.
4. **Admin:** Dashboard, Perlu perhatian, Detail → Lihat Hasil Responden → Ekspor PDF (centang bagian) → Buat PDF.
5. **List Responden → Ekspor PDF → Unduh XLSX (data analisis)**, lalu buka di tool analisis peneliti. Periksa:
   - `ringkasan_harian` berisi 14 baris per responden, dengan status terisi/nol/belum_diisi yang benar;
   - waktu sesuai WIB;
   - kode jawaban kuesioner cocok dengan Codebook.
6. Periksa **riwayat tindakan** di Detail Responden: Lihat Hasil dan ekspor PDF tercatat. Log lengkap (tabel `audit_logs`) diperiksa pengembang di Supabase bila perlu.
7. Catat masukan responden (kejelasan teks, waktu mencatat < 1 menit, tampilan ponsel).

**Setelah pilot:** responden pilot dinonaktifkan atau dihapus (lunak) agar tidak ikut analisis. Setiap perbaikan dikerjakan sebagai perubahan biasa (rencana → test → deploy).

## 3. Selama penelitian

- Pantau **Dashboard → Perlu perhatian** setiap hari.
- Kode bocor atau lupa: **Reset Kode**. Data responden tetap utuh.
- Banner peringatan keamanan muncul: minta pengembang memeriksa tabel `audit_logs`, lalu reset kode responden yang terdampak bila perlu (ADR-003, ADR-004).
- Ekspor berkala sebagai cadangan analisis. Setiap ekspor tercatat di log audit.

## 4. Penutupan dan hapus permanen (BR-11)

Hapus permanen **hanya** setelah penelitian selesai dan sesuai ketentuan komite etik tentang masa simpan data.

1. Ekspor final: **Unduh semua (XLSX)**, lalu simpan di penyimpanan peneliti yang disetujui etik.
2. Catat tanggal, siapa yang menghapus, dan dasar ketentuannya.
3. Penghapusan dilakukan pengembang lewat migration atau skrip terdokumentasi, bukan dengan mengubah database secara manual (CLAUDE.md). Langkahnya:
   - tutup akses semua responden;
   - hapus data responden beserta catatan, status harian, jawaban, target, dan progres edukasi (`ON DELETE CASCADE` dari `respondents`);
   - pertahankan `audit_logs` sesuai ketentuan masa simpan, karena hanya bisa ditambah;
   - hapus gambar di bucket Storage jika tidak lagi diperlukan.
4. Nonaktifkan atau hapus project Supabase bila tidak dipakai lagi, setelah backup final disimpan sesuai ketentuan.
