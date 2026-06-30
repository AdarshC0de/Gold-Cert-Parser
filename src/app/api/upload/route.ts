import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { ocrImage } from "@/lib/ocr";
import { buildRows } from "@/lib/parser";
import type { ParsedHeader } from "@/lib/parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const filePath = path.join(uploadsDir, safeName);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${safeName}`;

    const extracted = await ocrImage(filePath);
    const rows = buildRows(extracted.rows);

    const header: ParsedHeader = {
      manufacturer: extracted.manufacturer,
      origin: extracted.origin,
      invoiceNo: extracted.invoiceNo,
      certNo: extracted.certNo,
      refDate: extracted.refDate,
    };

    return NextResponse.json({ success: true, fileUrl, header, rows });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
