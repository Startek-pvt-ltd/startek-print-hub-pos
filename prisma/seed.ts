import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL or DATABASE_URL before seeding");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Startek Administrator";
  if (!email || !password || password.length < 12) {
    throw new Error("SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters are required");
  }
  const passwordHash = await hash(password, 12);

  await db.$transaction([
    db.setting.upsert({ where: { id: "primary" }, update: {}, create: { id: "primary" } }),
    db.user.upsert({
      where: { email },
      update: { name, passwordHash, role: "ADMIN", status: "ACTIVE" },
      create: { name, email, role: "ADMIN", passwordHash },
    }),
  ]);
}

main().finally(() => db.$disconnect());
