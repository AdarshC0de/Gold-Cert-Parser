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
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as any).role === "ADMIN";
  const userId = (session.user as any).id;
  const body = await req.json().catch(() => ({}));

  if (body.action === "stop") {
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    stopQueue();
    return NextResponse.json({ success: true });
  }

  if (body.action === "retry" && body.jobId) {
    const job = await prisma.processingJob.findUnique({ where: { id: body.jobId } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && job.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await retryJob(body.jobId);
    if (!getQueueStatus()) runQueue().catch(console.error);
    return NextResponse.json({ success: true });
  }

  if (body.action === "retry-all-failed") {
    await prisma.processingJob.updateMany({
      where: { status: "FAILED", ...(isAdmin ? {} : { userId }) },
      data: { status: "PENDING", error: null },
    });
    if (!getQueueStatus()) runQueue().catch(console.error);
    return NextResponse.json({ success: true });
  }

  if (body.action === "cancel" && body.jobId) {
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.processingJob.update({
      where: { id: body.jobId },
      data: { status: "FAILED", error: "Cancelled by admin" },
    });
    return NextResponse.json({ success: true });
  }

  // Start queue — both admin and user can trigger
  runQueue().then((r) => console.log("Queue done:", r)).catch(console.error);
  return NextResponse.json({ success: true, message: "Queue started" });
}
