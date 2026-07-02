import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { uploadPdfToCloudinary } from "@/lib/cloudinary";
import { hashBuffer } from "@/lib/file-hash";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Please upload a PDF" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    // Note: this hashes the whole PDF, so it only catches the exact same PDF
    // being re-uploaded — not a page from this PDF matching a separately
    // uploaded single image of the same certificate. Good enough for the
    // common case (someone re-uploads the same file).
    const fileHash = hashBuffer(buffer);

    const result = await uploadPdfToCloudinary(buffer, `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, "_")}`);

    console.log("Cloudinary PDF result:", JSON.stringify(result, null, 2));

    const pages = result.pages ?? 1;

    // Cloudinary page URL format:
    // original: https://res.cloudinary.com/cloud/image/upload/folder/file.jpg
    // page N:   https://res.cloudinary.com/cloud/image/upload/pg_N/folder/file.jpg
    const baseUrl = result.secure_url;
    const uploadIndex = baseUrl.indexOf("/upload/");
    const beforeUpload = baseUrl.slice(0, uploadIndex + 8); // includes "/upload/"
    const afterUpload = baseUrl.slice(uploadIndex + 8);     // "folder/file.jpg"

    for (let i = 1; i <= pages; i++) {
      const pageUrl = `${beforeUpload}pg_${i}/${afterUpload.replace(/\.pdf$/i, ".jpg")}`;

      await prisma.processingJob.create({
        data: {
          userId,
          fileUrl: pageUrl,
          fileName: `${file.name} — Page ${i}`,
          fileHash: pages > 1 ? undefined : fileHash, // multi-page PDFs: pages are distinct images, don't dedup by whole-PDF hash
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({
      success: true,
      pagesFound: pages,
      message: `${pages} pages extracted and queued for processing.`,
    });

  } catch (error) {
    console.error("PDF upload error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}