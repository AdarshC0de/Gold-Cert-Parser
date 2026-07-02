import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ParsedRow } from "@/lib/parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileUrl, fileHash, rawText, header, rows } = await req.json();
    const userId = (session.user as any).id;

    if (!fileUrl || !rows?.length) {
      return NextResponse.json({ error: "fileUrl and rows are required" }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: {
        userId,
        fileUrl,
        fileHash,
        rawOcrText: rawText,
        manufacturer: header?.manufacturer,
        origin: header?.origin,
        invoiceNo: header?.invoiceNo,
        certNo: header?.certNo,
        refDate: header?.refDate,
        verified: true,
        rows: {
          create: rows.map((r: ParsedRow) => ({
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
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as any).role === "ADMIN";
  const userId = (session.user as any).id;
  const requestedUserId = req.nextUrl.searchParams.get("userId");

  // Non-admins can only ever see their own documents, regardless of query param
  const where = isAdmin && requestedUserId ? { userId: requestedUserId } : { userId };

  const documents = await prisma.document.findMany({
    where,
    include: { rows: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}