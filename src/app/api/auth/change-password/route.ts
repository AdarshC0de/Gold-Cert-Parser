import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId, currentPassword, newPassword } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, mustChangePassword: false },
  });

  return NextResponse.json({ success: true });
}
