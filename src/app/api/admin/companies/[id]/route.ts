import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      documents: {
        include: { rows: true },
        orderBy: { createdAt: "desc" },
      },
      sessions: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ company: user });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, companyName, isActive, maxDevices, resetPassword, newPassword } = await req.json();

  const updateData: any = { name, companyName, maxDevices };

  if (typeof isActive === "boolean") {
    updateData.isActive = isActive;
    // Kill all sessions if deactivating
    if (!isActive) {
      await prisma.userSession.deleteMany({ where: { userId: id } });
    }
  }

  if (resetPassword && newPassword) {
    updateData.password = await bcrypt.hash(newPassword, 10);
    updateData.mustChangePassword = true;
  }

  const user = await prisma.user.update({ where: { id }, data: updateData });

  return NextResponse.json({ success: true, user });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
