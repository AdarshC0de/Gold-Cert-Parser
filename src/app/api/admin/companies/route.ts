import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      isActive: true,
      maxDevices: true,
      mustChangePassword: true,
      createdAt: true,
      _count: { select: { documents: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, companyName, tempPassword, maxDevices } = await req.json();

  if (!email || !tempPassword) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      companyName,
      password: hashed,
      role: "USER",
      isActive: true,
      mustChangePassword: true,
      maxDevices: maxDevices ?? 2,
    },
  });

  return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
}
