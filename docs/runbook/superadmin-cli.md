# Runbook: akun Superadmin lewat CLI

Perintah ini dijalankan di server (atau mesin yang punya akses ke basis data produksi) dengan `DATABASE_URL` di `.env`. Kata sandi sementara hanya dicetak sekali ke terminal; jangan menyalinnya ke chat atau tiket.

## Membuat Superadmin pertama

```bash
npm run superadmin:create -- --name "Nama Lengkap" --email ketua@kampus.ac.id
```

Akun dibuat dengan tanda wajib ganti kata sandi. Login di `/staf/masuk`, lalu ganti kata sandi. Pembuatan akun dicatat di `audit_logs` (`staff.created`, `via: cli`).

## Reset kata sandi Superadmin (lupa kata sandi)

Alur reset lewat email belum tersedia (ADR-003). Sebagai gantinya:

```bash
npm run superadmin:reset-password -- --email ketua@kampus.ac.id
```

Efeknya: kata sandi diganti dengan kata sandi sementara, semua sesi akun itu diakhiri, dan pengguna wajib mengganti kata sandi saat login berikutnya. Status aktif/nonaktif akun tidak diubah. Reset dicatat di `audit_logs` (`staff.password_reset`, `via: cli`).

Kata sandi Admin di-reset oleh Superadmin dari menu **Manajemen Pengguna → Kelola → Reset kata sandi**.
