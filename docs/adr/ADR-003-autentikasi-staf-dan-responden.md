# ADR-003: Autentikasi terpisah untuk staf dan responden (kode akses tanpa kata sandi)

- Status: Diterima
- Tanggal: 2026-10-14
- Rujukan: PRD bagian 3, 4, 7 (FR-S-02), 10 (BR-08, BR-09), 11 (Keamanan); CLAUDE.md bagian Keamanan

## Konteks

Ada dua jenis pengguna dengan risiko yang berbeda:

- **Staf (Admin/Superadmin)** mengakses data seluruh responden, sehingga butuh email + kata sandi dan sesi pendek (2 jam tidak aktif).
- **Responden** adalah peserta penelitian. Mereka login hanya dengan kode akses, sesinya 30 hari di perangkat yang sama, dan datanya tidak boleh tercampur dengan akun staf.

PRD menawarkan "Auth.js dengan dua credentials provider atau sesi buatan sendiri". PRD juga sudah mendefinisikan tabel `respondent_sessions` sendiri.

## Keputusan

1. **Dua jalur, dua tabel, dua cookie.**
   - Staf: tabel `staff_users` + `staff_sessions`, cookie `pm_staf`, halaman `/staf/masuk`.
   - Responden: tabel `respondents` + `respondent_sessions`, cookie `pm_resp`, halaman `/masuk`.
   - Guard `requireStaff()` hanya membaca cookie staf, dan `requireRespondent()` hanya membaca cookie responden. Sesi responden tidak pernah lolos guard staf, begitu pula sebaliknya.
   - Perubahan peran Responden ↔ Admin/Superadmin tidak dimungkinkan (FR-S-02) karena keduanya berada di tabel yang berbeda.
2. **Sesi buatan sendiri, bukan Auth.js.** Credentials provider Auth.js tidak mendukung sesi berbasis basis data secara bawaan. Kita butuh revokasi instan (reset kode, nonaktifkan akun), batas tidak aktif yang berbeda per jalur, dan kontrol penuh atas isi log. Kodenya kecil dan diuji langsung.
3. **Token sesi:** 32 byte acak (`crypto.randomBytes`). Cookie berisi token mentah, sedangkan basis data hanya menyimpan `SHA-256(token)`. Cookie diatur `HttpOnly`, `Secure` (di produksi), `SameSite=Lax`, dan `Path=/`.
4. **Masa berlaku:**
   - Staf: kedaluwarsa setelah 2 jam tidak aktif (sliding; `last_seen_at` diperbarui paling sering sekali per menit), dengan batas absolut 12 jam.
   - Responden: 30 hari sejak login (absolut). Tombol Keluar menghapus sesi di server.
   - Reset kode, nonaktifkan responden, nonaktifkan staf, reset kata sandi, dan ganti kata sandi akan menghapus semua sesi pengguna terkait.
5. **Kata sandi staf:** argon2id (`@node-rs/argon2`), minimal 8 karakter. Akun baru dan akun yang di-reset ditandai `must_change_password = true`. Selama tanda itu aktif, guard hanya mengizinkan halaman dan endpoint ganti kata sandi.
6. **Kode akses responden:** cara penyimpanan dan formatnya diatur di ADR-004. Login mencari responden lewat HMAC kode, lalu memeriksa bahwa responden tidak dihapus dan berstatus aktif. Kode tidak memiliki tanggal kedaluwarsa (keputusan pemilik produk, 2026-10-14): Responden tetap dapat mengakses website setelah periode penelitian berakhir.
7. **Rate limit** (dicatat di tabel `login_attempts`, sehingga aman untuk serverless karena tidak bergantung memori proses):
   - Kode akses, per IP: 5 gagal / 15 menit, lalu ditolak sampai jendela bergeser.
   - Kode akses, global: ≥ 50 gagal dari semua IP / 15 menit → login kode ditunda untuk semua orang, minimal 5 menit dan selama jumlah gagal dalam 15 menit terakhir masih ≥ 50. Percobaan yang ditolak oleh rate limit (`blocked = true`) tidak ikut dihitung, sehingga satu IP yang terus mencoba tidak bisa memicu jeda global sendirian. Sistem membuat satu baris `security_alerts` (bukan satu per percobaan), mencatatnya di `audit_logs`, dan menampilkan banner peringatan di dashboard Superadmin sampai dikonfirmasi. Peringatan lewat email ditambahkan setelah layanan email tersedia.
   - Staf: 5 gagal / 15 menit per IP dan per email (email disimpan sebagai hash di `login_attempts`).
   - Pesan error selalu umum: responden mendapat "Kode tidak valid atau tidak aktif.", staf mendapat "Email atau kata sandi salah." Penyebab rinci (salah, nonaktif, dihapus, diblokir) tidak dibedakan di respons, hanya di audit internal tanpa nilai rahasia.
8. **CSRF:** cookie `SameSite=Lax` ditambah pemeriksaan header `Origin`/`Host` pada semua request non-GET ke `/api/**`.
9. **Pengalihan setelah login** (PRD 4.3): staf → `/admin`; responden → halaman persetujuan/pretest jika belum pretest, atau dashboard jika sudah. Halaman tujuan responden baru dibuat di Fase 2; di Fase 1 berupa halaman sementara.
10. **Lupa kata sandi:**
    - Superadmin me-reset kata sandi Admin (dan Superadmin lain) dari UI. Sistem membuat kata sandi sementara yang ditampilkan sekali.
    - Kata sandi Superadmin sendiri di-reset lewat skrip CLI di server (`npm run superadmin:reset-password`), terdokumentasi di `docs/runbook/`. Alur reset lewat email ditunda sampai penyedia email dipilih.
    - Superadmin pertama dibuat lewat CLI `npm run superadmin:create`.
11. **Log:** login dan logout staf dicatat di `audit_logs`. Kode akses, kata sandi, token, dan isi cookie tidak pernah dicatat atau dikirim dalam pesan error.

## Alternatif yang dipertimbangkan

- **Auth.js dengan dua credentials provider:** sesinya JWT secara default, sehingga revokasi instan sulit dan butuh adaptasi untuk dua tabel pengguna.
- **Satu tabel `users` dengan kolom role:** ditolak oleh PRD bagian 9 dan FR-S-02, karena kredensial dan data penelitian akan tercampur.
- **Rate limit di memori proses:** tidak andal di serverless atau saat ada beberapa instance.

## Konsekuensi

- Kode autentikasi menjadi tanggung jawab tim, sehingga wajib diuji: kedaluwarsa sesi, revokasi, penolakan lintas jalur, rate limit, dan pesan error umum.
- Setiap request yang butuh login melakukan satu query sesi ke basis data. Ini dapat diterima untuk skala satu studi.
- Penundaan global bisa dipakai penyerang untuk mengganggu login responden sah selama 5 menit. Risiko ini diterima dan dipantau lewat banner peringatan.
