import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
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

  // Recover jobs orphaned by a killed/frozen serverless instance so they
  // don't sit stuck at PROCESSING forever.
  await prisma.processingJob.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
    data: { status: "PENDING", error: "Requeued after stall" },
  });

  const [pending, paused, processing, done, failed] = await Promise.all([
    prisma.processingJob.count({ where: { ...where, status: "PENDING" } }),
    prisma.processingJob.count({ where: { ...where, status: "PAUSED" } }),
    prisma.processingJob.count({ where: { ...where, status: "PROCESSING" } }),
    prisma.processingJob.count({ where: { ...where, status: "DONE" } }),
    prisma.processingJob.count({ where: { ...where, status: "FAILED" } }),
  ]);

  const jobs = await prisma.processingJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, fileName: true, status: true, error: true, userId: true, createdAt: true, updatedAt: true },
  });

  // In-memory flag can be wrong if this request landed on a fresh serverless
  // instance. Treat "a job is actively PROCESSING" as running too, so the UI
  // doesn't show Idle while work is genuinely in flight.
  const isRunning = getQueueStatus() || processing > 0;

  return NextResponse.json({
    counts: { pending, paused, processing, done, failed, total: pending + paused + processing + done + failed },
    isRunning,
    currentUserId: userId,
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
    stopQueue();
    return NextResponse.json({ success: true });
  }

  if (body.action === "retry" && body.jobId) {
    const job = await prisma.processingJob.findUnique({ where: { id: body.jobId } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && job.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await retryJob(body.jobId);
    if (!getQueueStatus()) after(() => runQueue().catch(console.error));
    return NextResponse.json({ success: true });
  }

  if (body.action === "retry-all-failed") {
    await prisma.processingJob.updateMany({
      where: { status: "FAILED", ...(isAdmin ? {} : { userId }) },
      data: { status: "PENDING", error: null },
    });
    if (!getQueueStatus()) after(() => runQueue().catch(console.error));
    return NextResponse.json({ success: true });
  }

  if (body.action === "pause" && body.jobId) {
    const job = await prisma.processingJob.findUnique({ where: { id: body.jobId } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && job.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (job.status !== "PENDING") {
      return NextResponse.json({ error: "Can only pause a job that hasn't started yet" }, { status: 409 });
    }
    await prisma.processingJob.update({ where: { id: body.jobId }, data: { status: "PAUSED" } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "resume" && body.jobId) {
    const job = await prisma.processingJob.findUnique({ where: { id: body.jobId } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && job.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (job.status !== "PAUSED") {
      return NextResponse.json({ error: "Job isn't paused" }, { status: 409 });
    }
    await prisma.processingJob.update({ where: { id: body.jobId }, data: { status: "PENDING" } });
    if (!getQueueStatus()) after(() => runQueue().catch(console.error));
    return NextResponse.json({ success: true });
  }

  if (body.action === "cancel" && body.jobId) {
    const job = await prisma.processingJob.findUnique({ where: { id: body.jobId } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && job.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (job.status === "PROCESSING") {
      return NextResponse.json({ error: "Can't cancel a job that's actively processing — wait for it to finish, or Pause the whole queue first" }, { status: 409 });
    }
    if (job.status === "DONE") {
      return NextResponse.json({ error: "Job already completed" }, { status: 409 });
    }
    await prisma.processingJob.update({
      where: { id: body.jobId },
      data: { status: "FAILED", error: isAdmin ? "Cancelled by admin" : "Cancelled by user" },
    });
    return NextResponse.json({ success: true });
  }

  // Start queue — both admin and user can trigger.
  // after() keeps this background work alive past the response on Vercel,
  // instead of relying on a bare fire-and-forget promise that may get killed.
  if (!getQueueStatus()) {
    after(() => runQueue().then((r) => console.log("Queue done:", r)).catch(console.error));
  }
  return NextResponse.json({ success: true, message: "Queue started" });
}