# ADR-006: Strategi lazy loading untuk "Lihat Hasil Responden"

- Status: Diterima
- Tanggal: 2026-10-14
- Rujukan: PRD FR-A-03, FR-A-04, FR-S-03, AC-04, AC-05; CLAUDE.md bagian Peran dan akses

## Konteks

Halaman Detail Responden dipakai Admin untuk urusan administratif: kode akses, status, dan catatan. Data hasil, yaitu log konsumsi, grafik, target, dan jawaban kuesioner, lebih sensitif. PRD mensyaratkan tiga hal:

1. Data hasil **tidak** dimuat saat halaman detail dibuka (AC-04).
2. Data baru diambil ketika tombol "Lihat Hasil Responden" diklik.
3. **Setiap** pembukaan hasil dicatat di log audit: siapa, kapan, dan responden mana (AC-05).

## Keputusan

1. **Endpoint terpisah:** `GET /api/admin/respondents/[id]/results`, khusus staf (`requireStaff`). Endpoint detail (`GET /api/admin/respondents/[id]`) dan halaman server detail hanya memuat data ringkas. Test integrasi memastikan respons detail tidak memiliki kunci `dashboard`, `logs`, `goals`, `pretest`, maupun `posttest`.
2. **Audit di server, sebelum data disusun:** endpoint hasil menulis baris `respondent.results_viewed` (pelaku, waktu, IP, ID responden) pada setiap pemanggilan, termasuk saat hasil dibuka ulang setelah disembunyikan. Audit tidak bergantung pada perilaku browser.
3. **Komponen klien `ResultsPanel`:** awalnya hanya menampilkan tombol. Data diambil dengan `fetch` saat tombol diklik, sambil menampilkan indikator loading. "Sembunyikan Hasil" membuang data dari memori komponen, sehingga membuka lagi berarti request baru dan baris audit baru.
4. **Respons tidak di-cache** (`Cache-Control: no-store`, sama seperti semua respons API).
5. **Isi hasil** memakai fungsi yang sama dengan Dashboard Responden (`getDashboard`, `getGoalState`), sehingga angka yang dilihat Admin identik dengan yang dilihat responden. Isinya ditambah log konsumsi lengkap (termasuk catatan di luar periode) serta jawaban dan skor pretest/posttest. Tombol "Ekspor Data Responden Ini" menyusul di Fase 4.

## Alternatif yang dipertimbangkan

- **Memuat semua data di halaman detail lalu menyembunyikannya dengan CSS:** melanggar AC-04, karena data tetap terkirim ke browser, dan pembukaan hasil tidak bisa diaudit.
- **Server Action / form submit:** bisa saja dipakai, tetapi endpoint GET terpisah lebih mudah diuji, baik lewat integration test maupun pemeriksaan request di e2e.
- **Audit di sisi klien (mencatat saat panel dirender):** bisa dilewati oleh siapa pun yang memanggil API langsung.

## Konsekuensi

- Setiap klik menambah satu baris audit. Ini memang dikehendaki untuk kerahasiaan, tetapi membuat log audit cepat bertambah. Halaman Log Audit (Fase 4) perlu filter per aksi.
- Test e2e memeriksa daftar request jaringan: tidak ada request ke `/results` sebelum tombol diklik, dan ada tepat satu request setelahnya.
