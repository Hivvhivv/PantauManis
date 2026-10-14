# Runbook: database production di Supabase

Supabase dipakai **hanya sebagai PostgreSQL**: tanpa supabase-js dan tanpa Supabase Auth. Autentikasi tetap milik aplikasi (ADR-003).

## Dua URL dari Supabase

| Variabel       | Dipakai oleh                                                        | Supabase (Connect → ORMs / Connection string)        |
| -------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL` | Aplikasi saat berjalan (`src/server/db.ts`, adapter `pg`)           | Transaction pooler, port **6543**, `?pgbouncer=true` |
| `DIRECT_URL`   | Prisma CLI: `migrate deploy`, `migrate status` (`prisma.config.ts`) | Session pooler, port **5432**                        |

Prisma 7 tidak lagi punya `directUrl` di `schema.prisma`. CLI memakai `datasource.url` di `prisma.config.ts`, yang diisi dari `DIRECT_URL` (atau `DATABASE_URL` jika `DIRECT_URL` kosong, untuk lokal). Jika `DATABASE_URL` adalah pooler 6543 dan `DIRECT_URL` tidak diisi, Prisma CLI sengaja berhenti dengan pesan error, karena migration lewat pooler mode transaksi tidak aman.

Adapter `pg` tidak memakai prepared statement bernama, sehingga aman dipakai dengan pooler mode transaksi.

## Enkripsi koneksi (SSL)

Tanpa parameter `sslmode`, driver `pg` tersambung **tanpa enkripsi**. Tambahkan:

- `DATABASE_URL` (driver `pg`): `&sslmode=require&uselibpqcompat=true`. Koneksi terenkripsi tanpa verifikasi sertifikat. Untuk verifikasi penuh, unduh sertifikat CA dari Supabase (Project Settings → Database → SSL Configuration), lalu pakai `&sslmode=verify-full&sslrootcert=/path/ke/prod-ca.crt`.
- `DIRECT_URL` (Prisma CLI): `?sslmode=require`.

Di Supabase, aktifkan juga **Enforce SSL on incoming connections** agar koneksi tanpa SSL ditolak.

## Menjalankan perintah ke production tanpa mengganggu `.env` lokal

Kredensial production disimpan di **`.env.supabase`** di akar proyek. File ini sudah di-gitignore (pola `.env.*`) dan tidak dibaca Next.js. Jangan memakai nama `.env.production`, karena Next.js memuatnya otomatis saat `next build`.

```dotenv
# .env.supabase — JANGAN di-commit
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&uselibpqcompat=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
```

Jika kata sandi mengandung karakter khusus (`@ : / ? # %`), tulis dalam bentuk URL-encoded.

Skrip `:prod` memuat `.env.supabase` (lewat `dotenv-cli`) dan mengatur `DOTENV_CONFIG_PATH=.env.supabase`, sehingga `import "dotenv/config"` di Prisma dan skrip CLI juga membaca file itu. `.env` lokal tidak pernah dibaca:

```bash
npm run db:status:prod                 # 1. uji koneksi + lihat migration yang belum diterapkan
npm run db:deploy:prod                 # 2. terapkan semua migration
npm run superadmin:create:prod -- --name "Nama Lengkap" --email ketua@kampus.ac.id
npm run superadmin:reset-password:prod -- --email ketua@kampus.ac.id   # bila lupa kata sandi
```

`db:status:prod` aman dijalankan kapan saja karena hanya membaca. Pastikan baris `Datasource "db": ... at "aws-0-...pooler.supabase.com:5432"` menunjuk ke Supabase sebelum menjalankan `db:deploy:prod`.

Pemeriksaan setelah deploy: `npm run db:status:prod` harus melaporkan `Database schema is up to date!`.

## Environment variable di server aplikasi (mis. Vercel)

Atur di dashboard hosting, bukan di repositori:

- `DATABASE_URL`: URL pooler 6543 (lihat di atas).
- `APP_URL`: URL publik aplikasi.
- `ACCESS_CODE_HMAC_SECRET` dan `ACCESS_CODE_ENC_KEY`: **buat baru khusus production**, jangan memakai nilai lokal. Simpan cadangannya di password manager, terpisah dari backup database. Jika keduanya hilang, semua kode akses yang ada tidak bisa dipakai lagi (ADR-004).
- `DIRECT_URL` tidak dibutuhkan saat runtime.

## Catatan

- Migration hanya dijalankan dari mesin pengembang lewat `db:deploy:prod`, tidak saat build.
- Region project saat ini `ap-southeast-2` (Sydney). Pastikan sesuai ketentuan komite etik tentang lokasi data (ADR-002).
- Jika kata sandi database pernah tersebar (chat, tangkapan layar, commit), reset di Project Settings → Database, lalu perbarui `.env.supabase` dan env di hosting.
