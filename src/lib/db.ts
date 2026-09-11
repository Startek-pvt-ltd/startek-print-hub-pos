import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const ca = process.env.SUPABASE_CA_CERT;
  let adapterConfig: ConstructorParameters<typeof PrismaPg>[0] = { connectionString };

  if (ca) {
    const url = new URL(connectionString);
    // pg-connection-string replaces an explicit CA when sslmode is present.
    // Keep every other approved parameter and enforce verified TLS here instead.
    url.searchParams.delete("sslmode");
    adapterConfig = {
      connectionString: url.toString(),
      ssl: { ca, rejectUnauthorized: true },
    };
  }

  return new PrismaClient({ adapter: new PrismaPg(adapterConfig) });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
