/**
 * Prisma client singleton (Prisma 7 + driver adapter).
 *
 * Usage:
 *   import { getPrisma } from "@/lib/prisma";
 *   const orders = await getPrisma().order.findMany();
 *
 * The client is created lazily so that pages which don't touch the database
 * (the domain search, for example) keep working before DATABASE_URL is set.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

type GlobalWithPrisma = typeof globalThis & { __prisma?: PrismaClient };

const globalRef = globalThis as GlobalWithPrisma;

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env (see .env.example), then restart the dev server.",
    );
  }
  const hostname = new URL(connectionString).hostname;
  let adapter: PrismaNeon | PrismaPg;
  if (hostname.endsWith(".neon.tech")) {
    neonConfig.webSocketConstructor = ws;
    adapter = new PrismaNeon({ connectionString });
  } else {
    adapter = new PrismaPg({ connectionString });
  }
  return new PrismaClient({ adapter });
}

export function getPrisma(): PrismaClient {
  if (!globalRef.__prisma) globalRef.__prisma = createClient();
  return globalRef.__prisma;
}
