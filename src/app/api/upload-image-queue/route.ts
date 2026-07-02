import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";
import { writeFile } from "fs/promises";
import { getSession } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/upload-image-queue
 * Uploads image to Cloudinary and creates a ProcessingJob (PENDING).
 * Does NOT parse/OCR — that happens in the queue processor.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save temp for nothing — just upload to Cloudinary directly
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const fileUrl = await uploadToCloudinary(buffer, safeName);

    // Create queue job
    await prisma.processingJob.create({
      data: {
        userId,
        fileUrl,
        fileName: file.name,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, fileUrl });
  } catch (error) {
    console.error("QUEUE IMAGE ERROR:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
