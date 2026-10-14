import { migrateDeploy, startEmbeddedPostgres } from "../../scripts/lib/embedded-pg";

/** Menyalakan Postgres test baru (port 54330) dan menerapkan semua migration. */
export default async function setup() {
  const { pg, url } = await startEmbeddedPostgres({
    name: "pg-test",
    port: 54330,
    database: "pantaumanis_test",
    fresh: true,
  });
  migrateDeploy(url);
  return async () => {
    await pg.stop();
  };
}
