/**
 * Menjalankan PostgreSQL lokal untuk pengembangan (port 54329, data di %LOCALAPPDATA%/pantaumanis/pg-dev).
 * Biarkan terminal ini tetap terbuka; tekan Ctrl+C untuk berhenti.
 */
import { startEmbeddedPostgres } from "./lib/embedded-pg";

async function main() {
  const { pg, url } = await startEmbeddedPostgres({
    name: "pg-dev",
    port: 54329,
    database: "pantaumanis",
  });
  console.log(`PostgreSQL berjalan: ${url}`);
  console.log("Tekan Ctrl+C untuk berhenti.");

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
