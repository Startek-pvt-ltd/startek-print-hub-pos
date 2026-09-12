import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const ca = process.env.SUPABASE_CA_CERT;
  // Bound per-instance concurrency so one dashboard/report fan-out cannot
  // exhaust a small transaction-pooler allocation and leave route streams open.
  let adapterConfig: ConstructorParameters<typeof PrismaPg>[0] = {
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  };

  if (ca) {
    const url = new URL(connectionString);
    // pg-connection-string replaces an explicit CA when sslmode is present.
    // Keep every other approved parameter and enforce verified TLS here instead.
    url.searchParams.delete("sslmode");
    adapterConfig = {
      connectionString: url.toString(),
      ssl: { ca, rejectUnauthorized: true },
      max: 5,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    };
  }

  return new PrismaClient({ adapter: new PrismaPg(adapterConfig) });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
