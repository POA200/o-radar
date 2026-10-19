import path from "node:path";
import { fileURLToPath } from "node:url";
import { setDefaultResultOrder } from "node:dns";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Prefer IPv4 first: Neon's pooler hostname resolves to IPv6 addresses
// that are unreachable in some local/network environments.
setDefaultResultOrder("ipv4first");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load the monorepo root .env before constructing the Prisma client.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
// Also allow a local .env in the db package to override (useful for CLI/dev).
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const db = prisma;
export { PrismaClient } from "@prisma/client";
