import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

// POST: copy one or more documents to another company (admin only).
// This creates independent copies — both companies end up with their own
// Document row, so each can view/edit it without affecting the other.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const targetUserId: string = body.targetUserId;
  const documentIds: string[] = body.documentIds ?? (body.documentId ? [body.documentId] : []);

  if (!targetUserId || !documentIds.length) {
    return NextResponse.json({ error: "targetUserId and at least one documentId are required" }, { status: 400 });
  }

  const originals = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    include: { rows: true },
  });

  if (!originals.length) return NextResponse.json({ error: "Document(s) not found" }, { status: 404 });

  const copies = [];
  for (const original of originals) {
    const copy = await prisma.document.create({
      data: {
        userId: targetUserId,
        fileUrl: original.fileUrl,
        fileHash: original.fileHash,
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
    copies.push(copy);
  }

  return NextResponse.json({ success: true, count: copies.length, documents: copies });
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