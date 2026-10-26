/**
 * Local development database — embedded PostgreSQL (no system install needed).
 *
 *   npm run db:dev        # starts Postgres on 127.0.0.1:5433, db "2moretechs"
 *
 * Production (Neon) uses DATABASE_URL from .env instead — this script is only
 * for developing without a cloud database. Data lives in ./.devdb (gitignored).
 */
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.DEV_DB_PORT ?? 5433);
const DB = process.env.DEV_DB_NAME ?? "2moretechs";
const DATABASE_DIR = new URL("../.devdb", import.meta.url).pathname;

const pg = new EmbeddedPostgres({
  databaseDir: DATABASE_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

async function main() {
  try {
    await pg.initialise();
    console.log("[dev-db] initialised cluster");
  } catch {
    console.log("[dev-db] cluster already initialised");
  }

  await pg.start();
  console.log(`[dev-db] postgres running on 127.0.0.1:${PORT}`);

  try {
    await pg.createDatabase(DB);
    console.log(`[dev-db] created database "${DB}"`);
  } catch {
    console.log(`[dev-db] database "${DB}" already exists`);
  }

  console.log(
    `[dev-db] connection string: postgresql://postgres:postgres@127.0.0.1:${PORT}/${DB}`,
  );
  console.log("[dev-db] press Ctrl+C to stop");

  // Keep the process (and its postgres child) alive until interrupted.
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[dev-db] failed:", err);
  process.exit(1);
});
