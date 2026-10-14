import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * URL untuk Prisma CLI (migrate, status, generate). Prisma 7 tidak punya `directUrl`:
 * CLI memakai `datasource.url` di sini, sedangkan aplikasi memakai DATABASE_URL lewat adapter
 * (src/server/db.ts). Di Supabase, migration harus lewat DIRECT_URL (session mode, port 5432),
 * bukan pooler mode transaksi (port 6543, pgbouncer).
 * Lokal tanpa DIRECT_URL → memakai DATABASE_URL.
 */
function migrationUrl(): string {
  const direct = process.env.DIRECT_URL;
  const pooled = process.env.DATABASE_URL;
  if (direct) return direct;
  if (pooled && /pgbouncer=true|:6543\//.test(pooled)) {
    throw new Error(
      "DATABASE_URL memakai pooler mode transaksi (pgbouncer). Atur DIRECT_URL untuk menjalankan migration.",
    );
  }
  // `prisma generate` tidak butuh koneksi; string kosong mencegah error saat env belum diisi.
  return pooled ?? "";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: migrationUrl() },
});
