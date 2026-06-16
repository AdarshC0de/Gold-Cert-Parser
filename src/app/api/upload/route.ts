import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import { ocrImage } from "@/lib/ocr";
import { buildRows } from "@/lib/parser";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { ParsedHeader } from "@/lib/parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save temp file for Gemini OCR (needs a file path)
    const tempDir = os.tmpdir();
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const tempPath = path.join(tempDir, safeName);
    await writeFile(tempPath, buffer);

    // Upload to Cloudinary (permanent storage)
    const fileUrl = await uploadToCloudinary(buffer, safeName);

    // Run Gemini OCR on temp file
    const extracted = await ocrImage(tempPath);
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