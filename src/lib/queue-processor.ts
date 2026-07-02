import { prisma } from "@/lib/prisma";
import { ocrImage } from "@/lib/ocr";
import { buildRows } from "@/lib/parser";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as https from "https";
import * as http from "http";

let isProcessing = false;
let shouldStop = false; // manual stop flag

function downloadToTemp(url: string, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(os.tmpdir(), filename);
    const file = fs.createWriteStream(tempPath);
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(tempPath); });
    }).on("error", reject);
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify the error type:
 * - "quota"   → daily/minute limit exceeded — wait retry delay from Gemini
 * - "demand"  → model overloaded temporarily — retry in 10s
 * - "fatal"   → unrecoverable — mark as FAILED
 */
function classifyError(errMsg: string): "quota" | "demand" | "fatal" {
  if (
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("quota") ||
    errMsg.includes("exceeded your current quota")
  ) return "quota";

  if (
    errMsg.includes("high demand") ||
    errMsg.includes("overloaded") ||
    errMsg.includes("503") ||
    errMsg.includes("500") ||
    errMsg.includes("currently unavailable")
  ) return "demand";

  return "fatal";
}

function parseRetryDelay(errMsg: string): number {
  const match = errMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (match) return Math.ceil(parseFloat(match[1])) * 1000 + 3000;
  return 65000; // default 65s for quota errors
}

async function processJob(jobId: string): Promise<void> {
  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  await prisma.processingJob.update({ where: { id: jobId }, data: { status: "PROCESSING" } });

  try {
    const safeName = `job-${jobId}.jpg`;
    const tempPath = await downloadToTemp(job.fileUrl, safeName);
    const extracted = await ocrImage(tempPath);
    const rows = buildRows(extracted.rows);
    try { fs.unlinkSync(tempPath); } catch {}

    if (!rows.length) throw new Error("No rows extracted from image");

    const document = await prisma.document.create({
      data: {
        userId: job.userId,
        fileUrl: job.fileUrl,
        manufacturer: extracted.manufacturer,
        origin: extracted.origin,
        invoiceNo: extracted.invoiceNo,
        certNo: extracted.certNo,
        refDate: extracted.refDate,
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
    });

    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: "DONE", documentId: document.id },
    });

  } catch (error: any) {
    const errMsg = String(error?.message ?? error);
    const errorType = classifyError(errMsg);

    // Always reset to PENDING for retriable errors
    if (errorType === "quota" || errorType === "demand") {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { status: "PENDING", error: errMsg },
      });
      throw { errorType, delay: errorType === "quota" ? parseRetryDelay(errMsg) : 10000 };
    }

    // Fatal — mark as FAILED, don't retry automatically
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: errMsg },
    });
  }
}

export async function runQueue(): Promise<{ processed: number; failed: number; remaining: number }> {
  if (isProcessing) {
    const remaining = await prisma.processingJob.count({ where: { status: "PENDING" } });
    return { processed: 0, failed: 0, remaining };
  }

  isProcessing = true;
  shouldStop = false;
  let processed = 0;
  let failed = 0;

  try {
    while (!shouldStop) {
      const job = await prisma.processingJob.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      });

      if (!job) break; // no more pending jobs — done

      try {
        await processJob(job.id);
        processed++;
        await sleep(3000); // normal delay between requests
      } catch (err: any) {
        if (err?.errorType === "demand") {
          // Model overloaded — wait 10s and retry same job
          console.log(`Model busy — retrying in 10s`);
          await sleep(10000);
          continue;
        }

        if (err?.errorType === "quota") {
          // Quota hit — wait for Gemini's retry delay then continue
          console.log(`Quota exceeded — waiting ${err.delay}ms then resuming`);
          await sleep(err.delay);
          continue; // resume automatically after wait
        }

        // Fatal error on this job — skip it and move on
        failed++;
      }
    }
  } finally {
    isProcessing = false;
  }

  const remaining = await prisma.processingJob.count({ where: { status: "PENDING" } });
  return { processed, failed, remaining };
}

export function stopQueue() {
  shouldStop = true;
}

export function getQueueStatus() {
  return isProcessing;
}

// Retry a single failed job by ID
export async function retryJob(jobId: string): Promise<void> {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: { status: "PENDING", error: null },
  });
}