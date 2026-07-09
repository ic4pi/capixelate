import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  // Turso requires an auth token in addition to the database URL.
  // Accept it under either TURSO_AUTH_TOKEN or DATABASE_AUTH_TOKEN.
  const authToken =
    process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

  const adapter = new PrismaLibSql(
    authToken ? { url, authToken } : { url }
  );

  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
