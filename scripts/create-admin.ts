import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const hashed = await bcrypt.hash("admin123", 10);

  const existing = await prisma.user.findUnique({ where: { email: "admin@gmail.com" } });
  if (existing) {
    console.log("Admin already exists.");
    return;
  }

  await prisma.user.create({
    data: {
      email: "admin@gmail.com",
      password: hashed,
      name: "Admin",
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log("Admin user created.");
}

main().finally(() => prisma.$disconnect());