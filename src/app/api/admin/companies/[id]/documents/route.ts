import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

// POST: copy a document to another company
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { documentId, targetUserId } = await req.json();

  // Get original document with rows
  const original = await prisma.document.findUnique({
    where: { id: documentId },
    include: { rows: true },
  });

  if (!original) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Create a copy under the target user
  const copy = await prisma.document.create({
    data: {
      userId: targetUserId,
      fileUrl: original.fileUrl,
      refDate: original.refDate,
      manufacturer: original.manufacturer,
      origin: original.origin,
      invoiceNo: original.invoiceNo,
      certNo: original.certNo,
      verified: original.verified,
      rows: {
        create: original.rows.map((r) => ({
          rowOrder: r.rowOrder,
          gram: r.gram,
          gramValue: r.gramValue,
          count: r.count,
          serialFrom: r.serialFrom,
          serialTo: r.serialTo,
          series: r.series,
          purity: r.purity,
          brand: r.brand,
        })),
      },
    },
  });

  return NextResponse.json({ success: true, document: copy });
}

// DELETE: delete a document
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { documentId } = await req.json();

  await prisma.document.delete({ where: { id: documentId } });

  return NextResponse.json({ success: true });
}
