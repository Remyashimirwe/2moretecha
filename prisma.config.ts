import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration (replaces the old `url` inside schema.prisma).
 * Env vars are loaded explicitly from `.env` — see `.env.example`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Falls back to an empty string so `prisma generate` also works on a
    // fresh clone before `.env` exists (generation never connects to the DB).
    url: process.env.DATABASE_URL ?? "",
  },
});
