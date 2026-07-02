import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { runQueue, getQueueStatus, stopQueue, retryJob } from "@/lib/queue-processor";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === "ADMIN";
  const where = isAdmin ? {} : { userId };

  const [pending, processing, done, failed] = await Promise.all([
    prisma.processingJob.count({ where: { ...where, status: "PENDING" } }),
    prisma.processingJob.count({ where: { ...where, status: "PROCESSING" } }),
    prisma.processingJob.count({ where: { ...where, status: "DONE" } }),
    prisma.processingJob.count({ where: { ...where, status: "FAILED" } }),
  ]);

  const jobs = await prisma.processingJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, fileName: true, status: true, error: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({
    counts: { pending, processing, done, failed, total: pending + processing + done + failed },
    isRunning: getQueueStatus(),
    jobs,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "stop") {
    stopQueue();
    return NextResponse.json({ success: true, message: "Queue stopping after current job" });
  }

  if (body.action === "retry" && body.jobId) {
    await retryJob(body.jobId);
    // Start queue if not already running
    if (!getQueueStatus()) {
      runQueue().catch(console.error);
    }
    return NextResponse.json({ success: true, message: "Job requeued" });
  }

  if (body.action === "retry-all-failed") {
    await prisma.processingJob.updateMany({
      where: { status: "FAILED" },
      data: { status: "PENDING", error: null },
    });
    if (!getQueueStatus()) {
      runQueue().catch(console.error);
    }
    return NextResponse.json({ success: true, message: "All failed jobs requeued" });
  }

  // Default: start queue
  runQueue().then((r) => console.log("Queue done:", r)).catch(console.error);
  return NextResponse.json({ success: true, message: "Queue started" });
}