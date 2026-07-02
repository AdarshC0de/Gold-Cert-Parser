import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ocrImage } from "@/lib/ocr";
import { buildRows } from "@/lib/parser";
import type { ParsedHeader } from "@/lib/parser";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { hashBuffer } from "@/lib/file-hash";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function POST(req: NextRequest) {

  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }


  try {

    const formData = await req.formData();

    const file = formData.get("file") as File | null;


    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }


    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const fileHash = hashBuffer(buffer);

    // Upload image to Cloudinary
    const fileUrl = await uploadToCloudinary(
      buffer,
      `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`
    );

    // Duplicate check: if this exact file (any user) was already parsed,
    // reuse that result instead of spending another OCR call. Visibility
    // stays siloed — this only pre-fills the review form; a new independent
    // Document is created for this admin's account when they save.
    const existing = await prisma.document.findFirst({
      where: { fileHash, rows: { some: {} } },
      include: { rows: true },
      orderBy: { createdAt: "desc" },
    });

    let header: ParsedHeader;
    let rows;
    let duplicate = false;

    if (existing) {
      duplicate = true;
      header = {
        manufacturer: existing.manufacturer,
        origin: existing.origin,
        invoiceNo: existing.invoiceNo,
        certNo: existing.certNo,
        refDate: existing.refDate,
      };
      rows = existing.rows.map((r) => ({
        rowOrder: r.rowOrder,
        gram: r.gram,
        gramValue: r.gramValue,
        count: r.count,
        serialFrom: r.serialFrom,
        serialTo: r.serialTo,
        series: r.series,
        purity: r.purity ?? "",
        brand: r.brand ?? "",
      }));
    } else {
      // OCR from Cloudinary URL
      const extracted = await ocrImage(fileUrl);

      rows = buildRows(extracted.rows);

      header = {

        manufacturer: extracted.manufacturer,

        origin: extracted.origin,

        invoiceNo: extracted.invoiceNo,

        certNo: extracted.certNo,

        refDate: extracted.refDate,

      };
    }


    return NextResponse.json({

      success: true,

      fileUrl,

      fileHash,

      duplicate,

      header,

      rows,

    });



  } catch (error) {


    console.error("UPLOAD ERROR:", error);


    return NextResponse.json(

      {
        success:false,
        error:String(error)
      },

      {
        status:500
      }

    );

  }

}