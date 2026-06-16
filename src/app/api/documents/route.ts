import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ParsedHeader, ParsedRow } from "@/lib/parser";

export const runtime = "nodejs";

interface SaveDocumentBody {
  userId: string;
  fileUrl: string;
  rawText?: string;
  header: ParsedHeader;
  rows: ParsedRow[];
}

export async function POST(req: NextRequest) {
  try {
    const body: SaveDocumentBody = await req.json();
    const { userId, fileUrl, rawText, header, rows } = body;

    if (!userId || !fileUrl || !rows?.length) {
      return NextResponse.json(
        { error: "userId, fileUrl, and at least one row are required" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        userId,
        fileUrl,
        rawOcrText: rawText,
        manufacturer: header.manufacturer,
        origin: header.origin,
        invoiceNo: header.invoiceNo,
        certNo: header.certNo,
        refDate: header.refDate,
        verified: true,
        rows: {
          create: rows.map((r) => ({
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
      include: { rows: true },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("SAVE ERROR:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const documents = await prisma.document.findMany({
    where: userId ? { userId } : undefined,
    include: { rows: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}