import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: { rows: true, user: { select: { email: true } } },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ document });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { header, rows } = await req.json();

    await prisma.document.update({
      where: { id },
      data: {
        manufacturer: header.manufacturer,
        origin: header.origin,
        invoiceNo: header.invoiceNo,
        certNo: header.certNo,
        refDate: header.refDate,
      },
    });

    for (const row of rows) {
      await prisma.documentRow.update({
        where: { id: row.id },
        data: {
          rowOrder: row.rowOrder,
          gram: row.gram,
          gramValue: row.gram === "ONZ" || row.gram === "1KG" ? null : parseFloat(row.gram),
          count: row.count,
          serialFrom: row.serialFrom,
          serialTo: row.serialTo,
          series: row.series,
          purity: row.purity,
          brand: row.brand,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}