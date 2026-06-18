import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serialStr = req.nextUrl.searchParams.get("serial");
  const series = req.nextUrl.searchParams.get("series");
  const gram = req.nextUrl.searchParams.get("gram");

  if (!serialStr) {
    return NextResponse.json({ error: "serial is required" }, { status: 400 });
  }

  const serial = parseInt(serialStr, 10);
  if (isNaN(serial)) {
    return NextResponse.json({ error: "serial must be a number" }, { status: 400 });
  }

  const isAdmin = (session.user as any).role === "ADMIN";
  const userId = (session.user as any).id;

  // Build gram filter — match by gram string label
  // User types "10" → match "10GRAMS", user types "onz" → match "ONZ"
  // user types "10grams" → match "10GRAMS" exactly
  let gramFilter = {};
  if (gram) {
    const g = gram.toUpperCase().trim();
    // Normalize shorthand inputs
    const normalized =
      g === "1" ? "1GRAM" :
      g === "2.5" ? "2.5GRAMS" :
      g === "5" ? "5GRAMS" :
      g === "10" ? "10GRAMS" :
      g === "20" ? "20GRAMS" :
      g === "31.1" ? "31.1GRAMS" :
      g === "50" ? "50GRAMS" :
      g === "100" ? "100GRAMS" :
      g === "250" ? "250GRAMS" :
      g === "500" ? "500GRAMS" :
      g === "ONZ" || g === "OZ" || g === "1OZ" || g === "1ONZ" ? "ONZ" :
      g === "KILO" || g === "1KG" || g === "KG" ? "1KG" :
      // If they typed "10GRAMS" or "ONZ" directly, use as-is
      g;

    gramFilter = { gram: normalized };
  }

  const rows = await prisma.documentRow.findMany({
    where: {
      ...gramFilter,
      serialFrom: { lte: serial },
      serialTo: { gte: serial },
      ...(series ? { series: series.toUpperCase() } : {}),
      ...(isAdmin ? {} : { document: { userId } }),
    },
    include: { document: true },
  });

  return NextResponse.json({
    success: true,
    results: rows.map((row: (typeof rows)[number]) => ({
      matchedRow: {
        gram: row.gram,
        count: row.count,
        serialFrom: row.serialFrom,
        serialTo: row.serialTo,
        series: row.series,
        purity: row.purity,
        brand: row.brand,
        rowOrder: row.rowOrder,
      },
      document: {
        id: row.document.id,
        fileUrl: row.document.fileUrl,
        manufacturer: row.document.manufacturer,
        origin: row.document.origin,
        certNo: row.document.certNo,
        refDate: row.document.refDate,
        invoiceNo: row.document.invoiceNo,
      },
    })),
  });
}