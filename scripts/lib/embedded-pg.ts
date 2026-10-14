import { existsSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";

export type EmbeddedDb = {
  pg: EmbeddedPostgres;
  url: string;
};

type Options = {
  /** Nama folder data Postgres (di bawah PM_PG_DATA_DIR atau %LOCALAPPDATA%/pantaumanis). */
  name: string;
  port: number;
  database: string;
  /** Hapus data lama sebelum mulai (untuk test). */
  fresh?: boolean;
};

const USER = "postgres";
const PASSWORD = "postgres";

export function databaseUrl(port: number, database: string): string {
  return `postgresql://${USER}:${PASSWORD}@localhost:${port}/${database}`;
}

/** Menjalankan PostgreSQL asli tanpa Docker (ADR-002) dan memastikan basis data ada. */
export async function startEmbeddedPostgres(opts: Options): Promise<EmbeddedDb> {
  // Data disimpan di luar folder proyek: di Windows, Controlled Folder Access dapat memblokir
  // Postgres menulis ke bawah Documents.
  const baseDir =
    process.env.PM_PG_DATA_DIR ??
    path.join(
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), ".local", "share"),
      "pantaumanis",
    );
  mkdirSync(baseDir, { recursive: true });
  const databaseDir = path.join(baseDir, opts.name);
  if (opts.fresh && existsSync(databaseDir)) rmSync(databaseDir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: USER,
    password: PASSWORD,
    port: opts.port,
    persistent: !opts.fresh,
    // Wajib UTF-8: tanpa ini Postgres di Windows memakai WIN1252 dan menolak emoji/huruf non-Latin.
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
  });

  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    opts.database,
  ]);
  await client.end();
  if (exists.rowCount === 0) await pg.createDatabase(opts.database);

  return { pg, url: databaseUrl(opts.port, opts.database) };
}

/** Menerapkan semua migration ke basis data pada `url`. */
export function migrateDeploy(url: string): void {
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url },
  });
}
