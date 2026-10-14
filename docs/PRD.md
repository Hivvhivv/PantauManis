PRD — PantauManis
14 Oct 2026 · @Inof Raditia
1. Ringkasan Produk
PantauManis adalah website intervensi self-monitoring selama 14 hari yang membantu dewasa muda memantau konsumsi minuman manis, dengan tiga peran: Superadmin, Admin, dan Responden. Responden masuk hanya dengan kode akses; Admin memantau data seluruh responden maupun per responden; Superadmin mengelola semua akun.
Tujuan produk
1. Responden dapat mencatat konsumsi minuman manis harian dengan cepat (target < 1 menit per catatan) dan melihat perkembangannya sendiri.
2. Peneliti (Admin) dapat memantau kelengkapan data dan hasil tiap responden tanpa membuka basis data langsung.
3. Data penelitian dapat diekspor dalam format siap analisis (CSV/XLSX) tanpa pembersihan manual.
Metrik keberhasilan (usulan, sesuaikan dengan protokol)
Metrik
Target
Responden aktif yang menyelesaikan pretest
100%
Hari terisi per responden selama 14 hari
≥ 80% (≥ 12 dari 14 hari)
Responden yang menyelesaikan posttest
≥ 90%
Ekspor data yang langsung bisa dianalisis
100% tanpa edit manual
2. Ruang Lingkup dan Batasan
Versi 1 mencakup akses berbasis peran, pencatatan konsumsi, dashboard, edukasi, target, kuesioner, manajemen pengguna, dan ekspor data untuk satu periode penelitian 14 hari.
Termasuk dalam lingkup
• Login Responden dengan kode akses; login Admin dan Superadmin dengan email dan kata sandi.
• Pencatatan minuman manis, riwayat, grafik, edukasi, target, umpan balik, pretest, dan posttest.
• Dashboard agregat dan dashboard per responden untuk Admin.
• Manajemen semua pengguna (CRUD) dengan pilihan peran untuk Superadmin.
• Ekspor data penelitian dan log audit aktivitas admin.
Di luar lingkup v1
• Aplikasi mobile native (cukup web responsif).
• Notifikasi push/WhatsApp (bisa dipertimbangkan di fase berikutnya).
• Integrasi dengan perangkat atau aplikasi kesehatan lain.
• Multi-studi atau multi-gelombang penelitian secara bersamaan.
Batasan etis (wajib tampil di website)
• Website bukan alat diagnosis diabetes dan tidak menggantikan konsultasi tenaga kesehatan. Disclaimer ini tampil di halaman login, dashboard Responden, dan halaman edukasi.
• Sistem tidak menampilkan label risiko atau diagnosis dari log konsumsi. Umpan balik hanya membandingkan konsumsi dengan target yang dibuat Responden sendiri dan anjuran umum yang bersumber jelas.
• Data Responden diidentifikasi dengan kode, bukan nama lengkap, untuk menjaga kerahasiaan.
3. Peran Pengguna dan Hak Akses
Sistem memiliki tiga peran dengan hak akses bertingkat: Superadmin ⊃ Admin ⊃ Responden (khusus data miliknya sendiri).
Peran
Siapa
Cara login
Fokus
Superadmin
Ketua peneliti / pengelola sistem
Email + kata sandi
Mengelola semua akun dan konfigurasi
Admin
Peneliti / enumerator
Email + kata sandi
Memantau responden, mengelola kode akses dan edukasi, ekspor data
Responden
Peserta penelitian (dewasa muda)
Kode akses saja
Mengisi kuesioner, mencatat konsumsi, melihat progres sendiri
Matriks hak akses
Fitur
Superadmin
Admin
Responden
Dashboard pribadi (data sendiri)
—
—
Ya
Mengisi pretest, posttest, pencatatan, target
—
—
Ya
Membaca materi edukasi
Ya
Ya
Ya
Dashboard agregat semua responden
Ya
Ya
—
List responden + detail + lihat hasil
Ya
Ya
—
Membuat / mengedit responden dan kode akses
Ya
Ya
—
Menonaktifkan / reset kode akses responden
Ya
Ya
—
Menghapus responden permanen
Ya
—
—
Mengelola materi edukasi
Ya
Ya
—
Ekspor data penelitian
Ya
Ya
—
Mengelola akun Admin dan Superadmin
Ya
—
—
Mengubah peran pengguna (dropdown role)
Ya
—
—
Melihat log audit
Ya
—
—
Pengaturan periode penelitian
Ya
—
—
Aturan tambahan: Superadmin tidak dapat menghapus atau menurunkan perannya sendiri, dan sistem harus selalu memiliki minimal satu Superadmin aktif.
4. Autentikasi dan Keamanan Akses
Responden login hanya dengan kode akses, sedangkan Admin dan Superadmin wajib memakai email dan kata sandi karena mereka mengakses data seluruh responden.
4.1 Login Responden (kode akses)
• Satu halaman login dengan satu kolom: Kode Akses. Tidak ada email atau kata sandi.
• Format kode: PM- + 6 angka acak, misalnya PM-482915. Di kartu kode ditampilkan sebagai PM-482-915.
• Input toleran: PM- boleh diketik atau tidak, spasi dan strip diabaikan, huruf kecil diterima. Kolom input memakai inputmode="numeric".
• Kode dibuat acak oleh sistem (bukan berurutan seperti R001, R002) agar tidak bisa ditebak, dan kode berpola dihindari (mis. 123456, 111111, 121212). Admin boleh menambahkan ID Responden berurutan terpisah (misalnya R001) sebagai label penelitian.
• Kode disimpan sebagai HMAC-SHA256 dengan secret dari environment variable (untuk login), ditambah salinan terenkripsi AES-256-GCM agar kode tetap bisa ditampilkan, disalin, dan dicetak dari List Responden. Setiap kali kode ditampilkan, hal itu dicatat di log audit. Lihat ADR-004.
• Status kode: Aktif atau Nonaktif. Kode tidak kedaluwarsa: Responden tetap dapat mengakses website setelah periode penelitian berakhir. Kode nonaktif ditolak dengan pesan yang ramah.
• Batas percobaan: 5 kali gagal per 15 menit per IP/perangkat, lalu jeda sementara. Batas global: jika total ≥ 50 kali gagal dari semua IP dalam 15 menit, login kode ditunda 5 menit dan Superadmin mendapat banner peringatan di dashboard. Pesan error dibuat umum ("Kode tidak valid atau tidak aktif").
• Sesi Responden berlaku 30 hari di perangkat yang sama agar tidak perlu memasukkan kode setiap hari; tersedia tombol Keluar.
4.2 Login Admin dan Superadmin
• Email + kata sandi (minimal 8 karakter), disimpan dengan hash bcrypt/argon2.
• Sesi berakhir setelah 2 jam tidak aktif.
• Lupa kata sandi: Superadmin dapat me-reset kata sandi Admin; kata sandi Superadmin di-reset lewat skrip CLI di server (lihat docs/runbook). Alur reset lewat email ditunda sampai penyedia email dipilih.
• Opsional (fase 2): verifikasi dua langkah untuk Superadmin.
4.3 Pengalihan setelah login
Peran
Tujuan setelah login
Responden (belum pretest)
Halaman Persetujuan & Pretest
Responden (sudah pretest)
Dashboard Responden
Admin
Dashboard Admin (agregat)
Superadmin
Dashboard Admin + menu Manajemen Pengguna
Setiap endpoint diperiksa perannya di sisi server; menyembunyikan menu di tampilan saja tidak dianggap sebagai kontrol akses.
5. Kebutuhan Fungsional — Responden
Responden memiliki delapan halaman utama: Persetujuan, Pretest, Dashboard, Catat Minuman, Riwayat, Edukasi, Target, dan Posttest.
FR-R-01 Persetujuan dan pretest
• Saat login pertama, Responden membaca lembar informasi penelitian dan mencentang persetujuan (informed consent).
• Pretest wajib diisi sebelum fitur lain terbuka. Jawaban dapat disimpan sebagai draf dan dilanjutkan.
• Setelah dikirim, pretest terkunci dan tidak bisa diubah Responden. Hari ke-1 periode dimulai pada tanggal pretest selesai.
FR-R-02 Pencatatan konsumsi minuman
• Form berisi: jenis minuman (dropdown: teh manis, kopi susu, boba/milk tea, minuman bersoda, jus kemasan, minuman energi, susu berperisa, lainnya), ukuran (pilihan gelas/botol atau ml), jumlah sajian, tingkat gula (normal/less/no sugar bila relevan), waktu minum, dan catatan opsional.
• Estimasi gula (gram) dihitung otomatis dari tabel referensi yang dikelola Admin dan ditampilkan sebagai perkiraan. Rumus: gula per sajian × (volume ÷ volume standar) × porsi × faktor tingkat gula (normal 1, less 0,5, no sugar 0; dapat diubah di study_settings). Lihat ADR-005.
• Preset ukuran: gelas kecil 200 ml, gelas sedang 300 ml, gelas besar 500 ml, botol/kaleng 330 ml, botol besar 600 ml, atau isi ml sendiri.
• Menghapus minuman terakhir di suatu hari mengembalikan hari itu ke Belum diisi (bukan Nol). Status Nol ditolak bila hari itu sudah ada catatan minuman.
• Tombol "Hari ini saya tidak minum minuman manis" menyimpan catatan konsumsi nol secara eksplisit. Hari tanpa catatan apa pun tampil sebagai Belum diisi, berbeda dari Nol.
• Responden dapat mengedit/menghapus catatan pada hari yang sama dan mengisi susulan maksimal 2 hari ke belakang. Setiap perubahan tercatat (waktu dibuat, waktu diubah, susulan atau tidak).
FR-R-03 Dashboard Responden
Dashboard hanya menampilkan data milik Responden yang login dan berisi:
• Kartu ringkasan: hari ke-X dari 14, jumlah minuman dan estimasi gula hari ini, status hari ini (Sudah diisi / Nol / Belum diisi).
• Grafik garis estimasi gula harian, dengan garis target pribadi.
• Pilihan rentang waktu grafik: 1 minggu, 2 minggu (default, sesuai periode penelitian), 1 bulan, dan 1 tahun. Pilihan ini berlaku untuk semua grafik di dashboard dan juga di "Lihat Hasil Responden".
• Grafik batang jumlah minuman per hari dan komposisi jenis minuman.
• Kalender kelengkapan 14 hari (warna berbeda untuk Terisi, Nol, Belum diisi).
• Progres target dan pengingat tugas (contoh: "Posttest tersedia").
• Disclaimer bahwa angka adalah perkiraan dan bukan diagnosis.
FR-R-04 Riwayat
• Daftar catatan per hari, dapat difilter berdasarkan tanggal dan jenis minuman.
FR-R-05 Edukasi interaktif
• Materi berupa artikel singkat, infografis, atau video, dibuka bertahap per hari (opsional) sesuai pengaturan Admin.
• Kuis singkat 2–3 soal di akhir materi; sistem mencatat materi yang sudah dibaca.
FR-R-06 Target dan umpan balik
• Responden menetapkan target, misalnya "maksimal 1 minuman manis per hari" atau "maksimal 25 g gula tambahan dari minuman per hari".
• Umpan balik otomatis berbasis aturan (contoh: "Kamu mencapai target 4 dari 7 hari minggu ini"), bernada positif, tanpa label risiko kesehatan.
• Target dapat diubah maksimal sekali per minggu; riwayat perubahan target disimpan.
• Keputusan 2026-10-14: satu target aktif, pilih jenisnya (jumlah minuman/hari ATAU gram gula/hari). Progres dinilai dari 7 hari terakhir sejak target berlaku; hari Nol dinilai (0), hari Belum diisi tidak dinilai dan disebut terpisah. Garis target tampil di grafik yang sesuai.
FR-R-07 Posttest
• Posttest terbuka otomatis pada hari ke-14 (atau sesuai protokol) dan ditutup setelah masa tenggang, misalnya 3 hari.
• Setelah posttest terkirim, Responden melihat halaman terima kasih dan ringkasan progres; akses pencatatan dapat dikunci.
• Keputusan: posttest terbuka hari ke-[durasi] sampai hari ke-[durasi + masa tenggang] (default 14–17). Pencatatan tidak dikunci setelah posttest. Beranda menampilkan pengingat saat posttest terbuka.
6. Kebutuhan Fungsional — Admin
Admin memiliki lima menu: Dashboard, List Responden, Materi Edukasi, Referensi Minuman, dan Ekspor Data.
FR-A-01 Dashboard agregat
Menampilkan data gabungan seluruh responden (tanpa identitas per orang) dengan filter rentang tanggal dan status:
• Kartu ringkasan: total responden, jumlah per status (Belum mulai, Aktif, Selesai, Nonaktif), rata-rata kelengkapan pencatatan, persentase pretest dan posttest selesai.
• Grafik rata-rata estimasi gula dan jumlah minuman per hari ke-1 sampai ke-14.
• Komposisi jenis minuman seluruh responden.
• Corong penyelesaian: kode dibuat → pretest → aktif mencatat → posttest.
• Daftar "Perlu perhatian": responden yang belum mengisi 2 hari berturut-turut atau belum posttest saat periode berakhir.
• Definisi status: Belum mulai = belum pretest; Aktif = sudah pretest, belum posttest; Selesai = posttest terkirim; Nonaktif = akses dinonaktifkan. Filter rentang tanggal memakai tanggal pretest (hari ke-1). Rata-rata per hari ke- hanya dari responden yang mencatat (Terisi/Nol) di hari itu, disertai n.
FR-A-02 List Responden
Tabel responden dengan pencarian (ID/label), filter (status, belum pretest, kelengkapan < 50%), urutan, dan paginasi 20 baris per halaman.
Kolom
Isi
ID Responden
Label penelitian, misalnya R001
Kode Akses
Disamarkan (PM-48••••) dengan tombol tampilkan dan salin
Status Akses
Aktif / Nonaktif
Hari ke-
Contoh: 6/14
Kelengkapan
Hari terisi (termasuk Nol) / hari berjalan, misalnya 5/6
Pretest / Posttest
Selesai / Belum
Terakhir aktif
Tanggal dan jam terakhir login atau mencatat
Aksi
Menu tindakan (di bawah)
Tindakan yang direkomendasikan pada kolom Aksi:
Tindakan
Fungsi
Peran
Lihat Detail
Membuka halaman detail responden
Admin, Superadmin
Edit
Mengubah ID Responden, label/inisial, catatan admin, tanggal mulai
Admin, Superadmin
Salin Kode
Menyalin kode akses untuk dibagikan
Admin, Superadmin
Reset Kode
Membuat kode baru dan membatalkan kode lama (misalnya kode bocor/lupa); data tetap utuh
Admin, Superadmin
Nonaktifkan / Aktifkan
Memblokir atau membuka kembali akses tanpa menghapus data
Admin, Superadmin
Cetak Kartu Kode
Kartu berisi kode, link website, dan instruksi singkat (bisa juga QR code)
Admin, Superadmin
Hapus
Hapus lunak (soft delete) dengan konfirmasi; data dikeluarkan dari analisis
Superadmin
Tindakan massal di atas tabel: Tambah Responden, Buat Kode Massal (misalnya 50 kode sekaligus dengan ID R001–R050), Impor CSV, dan Unduh daftar kode untuk dibagikan saat rekrutmen.
FR-A-03 Detail Responden
Halaman detail terbuka dengan informasi ringkas saja, tanpa grafik:
• Identitas penelitian: ID Responden, kode (disamarkan), dibuat oleh, tanggal dibuat.
• Status: status akses, tanggal pretest, hari ke-, status posttest, terakhir aktif.
• Catatan admin (dapat diedit) dan riwayat tindakan (reset kode, nonaktif, dll.).
• Tombol "Lihat Hasil Responden".
FR-A-04 Tombol "Lihat Hasil Responden"
• Data hasil tidak dimuat saat halaman detail dibuka. Data baru diambil dari server ketika tombol diklik, lalu ditampilkan di bawah informasi (atau dalam tab/panel), dengan indikator loading.
• Isi hasil: grafik yang sama dengan Dashboard Responden (gula harian, jumlah minuman, komposisi jenis, kalender kelengkapan), progres target dan riwayat perubahannya, tabel log konsumsi lengkap, jawaban dan skor pretest vs posttest, serta materi edukasi yang sudah dibaca dan hasil kuisnya.
• Tersedia tombol "Sembunyikan Hasil" dan "Ekspor Data Responden Ini".
• Setiap kali hasil dibuka, sistem mencatat di log audit: siapa, kapan, dan responden mana.
• Implementasi: lihat ADR-006. Tombol "Ekspor Data Responden Ini" dikerjakan di Fase 4 bersama ekspor lain.
FR-A-05 Materi Edukasi
• CRUD materi (judul, ringkasan, isi teks/gambar/video, sumber referensi, kuis), status Draf/Terbit, dan jadwal tampil (hari ke-N atau langsung).
• Mengubah urutan materi dengan drag-and-drop.
• Keputusan 2026-10-14 (ADR-008): isi Markdown sederhana dengan pratinjau; gambar diunggah ke Supabase Storage (bucket publik, JPG/PNG/WebP maks. 5 MB); video lewat tautan YouTube; kuis 0–3 soal pilihan ganda, boleh diulang (skor pertama dan terakhir disimpan); urutan juga bisa diubah dengan tombol ↑/↓ untuk pengguna keyboard.
FR-A-06 Referensi Minuman
• Tabel jenis minuman beserta ukuran standar (ml) dan perkiraan gula (gram per sajian) beserta sumbernya. Nilai ini dipakai untuk estimasi di pencatatan.
• Perubahan nilai tidak mengubah catatan lama secara diam-diam; setiap catatan menyimpan nilai gula pada saat dibuat.
FR-A-07 Ekspor Data
• Ekspor CSV atau XLSX untuk: daftar responden, log konsumsi (format panjang: satu baris per catatan), ringkasan harian (satu baris per responden per hari, termasuk status Belum diisi/Nol), jawaban pretest/posttest (satu baris per responden), target, dan aktivitas edukasi.
• File ekspor memakai ID Responden, bukan kode akses. Setiap ekspor tercatat di log audit.
7. Kebutuhan Fungsional — Superadmin
Superadmin memiliki semua menu Admin, ditambah Manajemen Pengguna, Log Audit, dan Pengaturan Penelitian.
FR-S-01 Manajemen Pengguna (semua peran)
• Satu tabel untuk semua pengguna dengan filter peran (Semua / Superadmin / Admin / Responden), pencarian, dan status.
• Form Tambah/Edit Pengguna dengan dropdown Peran: Superadmin, Admin, Responden. Kolom form menyesuaikan pilihan:
Peran dipilih
Kolom yang muncul
Kredensial
Superadmin / Admin
Nama, email, status aktif
Kata sandi awal dibuat sistem atau diisi, wajib diganti saat login pertama
Responden
ID Responden, label/inisial (opsional), tanggal mulai, catatan
Kode akses dibuat otomatis
• Aksi per pengguna: Edit, Nonaktifkan/Aktifkan, Reset kata sandi (Admin/Superadmin), Reset kode (Responden), Hapus (soft delete).
FR-S-02 Aturan perubahan peran
• Mengubah Admin ↔ Superadmin diperbolehkan, dengan konfirmasi.
• Mengubah Responden menjadi Admin/Superadmin (atau sebaliknya) tidak diizinkan lewat edit, karena kredensial dan datanya berbeda. Buat akun baru sebagai gantinya. Ini mencegah data penelitian tercampur dengan akun staf.
• Superadmin tidak dapat menurunkan peran, menonaktifkan, atau menghapus akunnya sendiri, dan sistem menolak aksi yang membuat jumlah Superadmin aktif menjadi nol.
FR-S-03 Log Audit
• Mencatat: login/logout staf, pembuatan/edit/hapus pengguna, perubahan peran, reset kode/kata sandi, pembukaan "Lihat Hasil Responden", dan ekspor data.
• Kolom: waktu, pelaku, aksi, target, alamat IP. Log hanya bisa dibaca, tidak bisa diubah atau dihapus dari aplikasi.
FR-S-04 Pengaturan Penelitian
• Durasi periode (default 14 hari), masa tenggang posttest (default 3 hari), batas pengisian susulan (default 2 hari), zona waktu (Asia/Jakarta), dan teks disclaimer/persetujuan.
8. Alur Pengguna dan Peta Halaman
Responden dan staf masuk lewat jalur login yang berbeda, lalu masing-masing hanya melihat menu sesuai perannya.
Grafik per responden di halaman Detail baru diambil dari server setelah Admin menekan tombol. Superadmin mewarisi semua menu Admin dan menambah tiga menu khusus.
9. Model Data
Akun staf dan responden disimpan di tabel terpisah agar kredensial dan data penelitian tidak bercampur; semua waktu disimpan dalam UTC dan ditampilkan dalam Asia/Jakarta.
Entitas
Kolom utama
Catatan
staff_users
id, name, email, password_hash, role (superadmin/admin), is_active, must_change_password, last_login_at, deleted_at
Akun Admin dan Superadmin
respondents
id, respondent_code_label (R001), initials, access_code_hmac (unik), access_code_encrypted, access_status (active/inactive), consent_at, start_date, created_by, notes, last_active_at, deleted_at
Akun Responden; tidak menyimpan nama lengkap
respondent_sessions
id, respondent_id, token_hash, expires_at, user_agent
Sesi login kode akses
staff_sessions
id, staff_user_id, token_hash, last_seen_at, expires_at, user_agent
Sesi login staf (2 jam tidak aktif)
login_attempts
id, kind (staff/code), ip, email_hash, success, created_at
Dasar rate limit per IP, per email, dan global
security_alerts
id, type, details, created_at, acknowledged_by, acknowledged_at
Peringatan untuk banner Superadmin
beverage_types
id, name, default_volume_ml, sugar_g_per_serving, source, is_active
Referensi minuman
consumption_logs
id, respondent_id, beverage_type_id, volume_ml, servings, sugar_level, sugar_g_snapshot, consumed_at, study_day, is_backfill, created_at, updated_at
Satu baris per minuman
daily_status
id, respondent_id, date, study_day, status (filled/zero)
Tidak ada baris = Belum diisi
questionnaires
id, type (pretest/posttest), version, title
Instrumen kuesioner
questions
id, questionnaire_id, order, text, type (likert/pilihan/isian), options, scoring
Butir soal
questionnaire_responses
id, respondent_id, questionnaire_id, status (draft/submitted), submitted_at
Satu per responden per jenis
answers
id, response_id, question_id, value
Jawaban per butir
goals
id, respondent_id, metric (jumlah/gula), target_value, valid_from, valid_to
Riwayat target
education_materials
id, title, body, media_url, source, unlock_day, order, status
Materi edukasi
education_progress
id, respondent_id, material_id, read_at, quiz_score
Aktivitas edukasi
audit_logs
id, actor_type, actor_id, action, target_type, target_id, ip, created_at
Hanya bisa ditambah
study_settings
key, value
Durasi, masa tenggang, zona waktu
Relasi inti: satu responden memiliki banyak consumption_logs, daily_status, goals, education_progress, dan maksimal dua questionnaire_responses (pretest dan posttest).
10. Aturan Bisnis dan Validasi
Semua aturan berikut divalidasi di server; validasi di browser hanya untuk kenyamanan pengguna.
Kode
Aturan
BR-01
Hari penelitian dihitung dari tanggal pretest dikirim (hari ke-1) sampai hari ke-14, berdasarkan zona waktu Asia/Jakarta.
BR-02
Hari tanpa catatan = Belum diisi; hari dengan tombol "tidak minum" = Nol. Keduanya tidak pernah disamakan di dashboard maupun ekspor.
BR-03
Jika Responden menambah minuman pada hari berstatus Nol, status otomatis berubah menjadi Terisi.
BR-04
Volume 1–3.000 ml per catatan, jumlah sajian 1–10, waktu minum tidak boleh di masa depan atau sebelum hari ke-1. Catatan setelah hari terakhir periode tetap diterima dan ditandai is_out_of_period (keputusan 2026-10-14, ADR-005).
BR-05
Pengisian susulan maksimal 2 hari ke belakang (dapat diatur Superadmin); ditandai is_backfill.
BR-06
Pretest wajib sebelum fitur pencatatan; posttest hanya terbuka pada jendela waktu yang ditentukan.
BR-07
Kuesioner yang sudah dikirim tidak dapat diubah oleh Responden; koreksi oleh Admin tercatat di log audit.
BR-08
Kode akses unik, dibuat acak, dan kode lama langsung tidak berlaku setelah di-reset.
BR-09
Responden hanya dapat membaca dan mengubah data miliknya; setiap query disaring berdasarkan respondent_id dari sesi, bukan dari parameter URL.
BR-10
Umpan balik tidak memuat kata seperti "berisiko", "prediabetes", atau diagnosis lain.
BR-11
Penghapusan responden bersifat soft delete; hapus permanen hanya lewat prosedur terdokumentasi setelah penelitian selesai.
Penanganan error
• Format respons error seragam: kode, pesan untuk pengguna dalam Bahasa Indonesia, dan daftar kolom yang salah.
• Pesan error dan log server tidak memuat kode akses, kata sandi, token, atau jawaban kuesioner.
11. Kebutuhan Non-Fungsional
Kebutuhan non-fungsional diturunkan dari dokumen arsitektur dan dibuat terukur agar bisa diuji.
Area
Kebutuhan terukur
Responsif
Tampilan berfungsi baik dari lebar 360 px (ponsel) hingga 1440 px (desktop); desain mobile-first untuk Responden.
Performa
Halaman utama tampil < 3 detik di koneksi 4G; data "Lihat Hasil Responden" tampil < 2 detik untuk 14 hari data.
Aksesibilitas
Memenuhi WCAG 2.1 level AA: kontras warna, ukuran teks minimal 16 px, label pada setiap input, grafik disertai ringkasan teks.
Keamanan
HTTPS wajib; kata sandi dan kode akses di-hash; cookie sesi HttpOnly, Secure, SameSite; proteksi CSRF; rate limiting login; rahasia di environment variable.
Kerahasiaan
Data diidentifikasi dengan ID Responden; akses data sesuai matriks peran; pembukaan data per responden dan ekspor tercatat di log audit.
Ketersediaan
Target uptime 99% selama periode penelitian; backup basis data harian, disimpan minimal 30 hari.
Konsistensi waktu
Simpan UTC, tampilkan Asia/Jakarta, format tanggal DD MMM YYYY di UI dan ISO 8601 di ekspor.
Pemeliharaan
Struktur kode per modul, perubahan skema hanya lewat migration, linting dan formatting otomatis.
Bahasa
Seluruh antarmuka dalam Bahasa Indonesia.
12. Rekomendasi Teknologi dan ADR
Keputusan akhir ditetapkan sebelum implementasi; dua opsi berikut sama-sama memenuhi kebutuhan, dipilih berdasarkan bahasa yang paling dikuasai tim.
Komponen
(JavaScript/TypeScript)
Framework
Next.js (App Router)
Basis data
PostgreSQL (lihat ADR-002)
ORM & migration
Prisma
Autentikasi
Auth.js dengan dua credentials provider atau sesi buatan sendiri
Otorisasi
Middleware + pengecekan peran di setiap route handler
Grafik
Chart.js atau Recharts
Ekspor
SheetJS / exceljs
Pengujian
Vitest + Playwright
Hosting
Vercel/VPS + PostgreSQL terkelola

Daftar ADR yang perlu dibuat
1. ADR-001 Pemilihan framework dan bahasa.
2. ADR-002 Pemilihan basis data dan hosting (termasuk lokasi data).
3. ADR-003 Autentikasi terpisah untuk staf dan responden (kode akses tanpa kata sandi).
4. ADR-004 Penyimpanan kode akses: hash saja vs terenkripsi agar bisa ditampilkan ulang.
5. ADR-005 Representasi "Belum diisi" vs "Nol" dan perhitungan hari penelitian.
6. ADR-006 Strategi lazy loading untuk "Lihat Hasil Responden".
7. ADR-007 Format dan skema ekspor data penelitian.
13. Pengujian dan Definition of Done
Setiap fitur diuji di tiga tingkat dan wajib lulus skenario kontrol akses sebelum dinyatakan selesai.
Lapisan pengujian
• Unit test: perhitungan hari penelitian, estimasi gula, status Belum diisi/Nol, skor kuesioner, pembuatan kode akses.
• Integration test: endpoint API dengan basis data uji, termasuk penolakan akses lintas peran.
• End-to-end test: alur lengkap Responden (login kode → pretest → catat 14 hari → posttest) dan alur Admin (buat kode → lihat detail → lihat hasil → ekspor).
Contoh kriteria penerimaan (format Given–When–Then)
ID
Skenario
Hasil yang diharapkan
AC-01
Responden memasukkan kode aktif yang valid
Masuk ke Pretest (login pertama) atau Dashboard
AC-02
Responden memasukkan kode nonaktif atau salah
Pesan umum "Kode tidak valid atau tidak aktif", tanpa detail penyebab
AC-03
5 kali gagal login dalam 15 menit
Login diblokir sementara
AC-04
Admin membuka Detail Responden
Hanya informasi ringkas tampil; tidak ada request data hasil ke server
AC-05
Admin mengklik "Lihat Hasil Responden"
Grafik dan tabel responden tersebut tampil; log audit bertambah satu baris
AC-06
Admin mengakses URL manajemen pengguna Superadmin
Ditolak (403)
AC-07
Responden A mengubah ID di URL menjadi milik Responden B
Ditolak; data B tidak pernah dikirim
AC-08
Superadmin memilih peran Responden di dropdown
Form menampilkan kolom Responden dan kode dibuat otomatis
AC-09
Superadmin mencoba menurunkan peran dirinya sendiri
Ditolak dengan pesan penjelasan
AC-10
Admin me-reset kode responden
Kode lama tidak bisa dipakai, data responden tetap utuh
AC-11
Responden menekan "tidak minum hari ini"
Hari tercatat Nol, tampil berbeda dari Belum diisi, dan tercermin di ekspor
AC-12
Admin mengekspor ringkasan harian
Setiap responden memiliki 14 baris dengan status Terisi/Nol/Belum diisi
Definition of Done
[ ] Kriteria penerimaan fitur terpenuhi.
[ ] Validasi server dan kontrol akses per peran tersedia serta diuji.
[ ] Unit, integration, dan e2e test yang relevan lulus di CI.
[ ] Perubahan skema melalui migration.
[ ] Dokumentasi (PRD/ADR/README) diperbarui.
[ ] Tidak ada data sensitif di log, respons error, atau kode sumber.
[ ] Tampilan dicek di ponsel (360 px) dan desktop.
14. Fase Rilis dan Pertanyaan Terbuka
Pengembangan dibagi empat fase agar fitur inti siap diuji coba sebelum rekrutmen responden.
1. Fase 1 — Fondasi: ADR, skema basis data, autentikasi dua jalur (staf dan kode akses), manajemen pengguna Superadmin, List Responden dan pembuatan kode.
2. Fase 2 — Inti Responden: persetujuan, pretest, pencatatan konsumsi (termasuk Nol), Dashboard Responden, riwayat.
3. Fase 3 — Intervensi & Pemantauan: edukasi, target dan umpan balik, posttest, Dashboard Admin agregat, Detail Responden dengan "Lihat Hasil Responden".
   - Dipecah (2026-10-14): 3a = target & umpan balik, posttest, Lihat Hasil Responden, Dashboard Admin agregat, Pengaturan Penelitian (FR-S-04); 3b = edukasi (CMS, urutan drag-and-drop, kuis, media diunggah ke Supabase Storage).
4. Fase 4 — Data & Kesiapan: ekspor, log audit, uji e2e penuh, uji coba (pilot) dengan 3–5 responden, perbaikan sebelum penelitian dimulai.
Pertanyaan terbuka
[x] Apakah kode akses perlu tetap terlihat di List Responden? Ya, disimpan terenkripsi (ADR-004).
[x] Apakah setiap Admin melihat semua responden? Ya, semua responden.
[x] Apakah kode akses kedaluwarsa setelah periode penelitian? Tidak; Responden tetap dapat mengakses.
[ ] Instrumen pretest dan posttest apa yang dipakai (jumlah butir, skala, cara skor)? — Mesin kuesioner sudah ada (Fase 2) dengan butir CONTOH; butir final dimasukkan lewat migration setelah instrumen disetujui.
[ ] Sumber nilai gula per jenis minuman untuk tabel referensi. — Menu Admin "Referensi Minuman" sudah ada (Fase 2); 8 jenis awal masih nilai CONTOH bertanda "perlu diverifikasi".
[x] Apakah pencatatan dikunci setelah posttest? Tidak: responden tetap bisa mencatat setelah hari ke-14; catatan ditandai di luar periode.
[ ] Teks resmi lembar informasi/persetujuan yang disetujui komite etik (saat ini teks CONTOH di study_settings.consent_text).
[ ] Apakah dibutuhkan pengingat harian (email/WhatsApp) di fase berikutnya?
[ ] Ketentuan komite etik tentang lokasi server, masa simpan data, dan penghapusan data setelah penelitian.