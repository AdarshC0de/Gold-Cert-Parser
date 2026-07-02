"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Job {
  id: string;
  fileName: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface QueueData {
  counts: { pending: number; processing: number; done: number; failed: number; total: number };
  isRunning: boolean;
  jobs: Job[];
}

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700 animate-pulse",
  DONE: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function QueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<QueueData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/queue");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [status, fetchStatus]);

  async function sendAction(body: object, loadingKey: string) {
    setActionLoading(loadingKey);
    await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await fetchStatus();
    setActionLoading(null);
  }

  if (!data) return <main className="p-6 text-center text-gray-500">Loading...</main>;

  const { counts } = data;
  const progressPct = counts.total > 0
    ? Math.round(((counts.done + counts.failed) / counts.total) * 100)
    : 0;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Processing Queue</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm px-3 py-1 rounded-full ${data.isRunning ? "bg-blue-100 text-blue-700 animate-pulse" : "bg-gray-100 text-gray-600"}`}>
            {data.isRunning ? "⚙ Running..." : "● Idle"}
          </span>

          {isAdmin && (
            <>
              {!data.isRunning && (
                <button
                  onClick={() => sendAction({ action: "start" }, "start")}
                  disabled={actionLoading === "start"}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  ▶ Start Queue
                </button>
              )}

              {data.isRunning && (
                <button
                  onClick={() => sendAction({ action: "stop" }, "stop")}
                  disabled={actionLoading === "stop"}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  ⏹ Stop Queue
                </button>
              )}

              {counts.failed > 0 && (
                <button
                  onClick={() => sendAction({ action: "retry-all-failed" }, "retry-all")}
                  disabled={!!actionLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  ↺ Retry All Failed ({counts.failed})
                </button>
              )}
            </>
          )}

          <button
            onClick={fetchStatus}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{counts.pending}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
        <div className="border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{counts.processing}</p>
          <p className="text-sm text-gray-500">Processing</p>
        </div>
        <div className="border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{counts.done}</p>
          <p className="text-sm text-gray-500">Done</p>
        </div>
        <div className="border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{counts.failed}</p>
          <p className="text-sm text-gray-500">Failed</p>
        </div>
      </div>

      {/* Progress bar */}
      {counts.total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>{counts.done + counts.failed} of {counts.total} processed</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Jobs list */}
      <section className="space-y-2">
        <h2 className="font-semibold">Recent Jobs (last 50)</h2>
        {data.jobs.length === 0 && <p className="text-gray-500 text-sm">No jobs yet.</p>}
        <div className="border rounded-xl divide-y overflow-hidden">
          {data.jobs.map((job) => (
            <div key={job.id} className="flex items-start gap-3 p-3 hover:bg-gray-50">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 shrink-0 ${STATUS_COLORS[job.status]}`}>
                {job.status}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{job.fileName}</p>
                {job.error && (
                  <p className="text-xs text-red-500 mt-0.5 truncate" title={job.error}>
                    {job.error.length > 80 ? job.error.slice(0, 80) + "..." : job.error}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">
                  {new Date(job.updatedAt).toLocaleTimeString()}
                </span>

                {/* Retry button for failed jobs — admin only */}
                {job.status === "FAILED" && isAdmin && (
                  <button
                    onClick={() => sendAction({ action: "retry", jobId: job.id }, job.id)}
                    disabled={actionLoading === job.id}
                    className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded border border-orange-200 hover:bg-orange-200 disabled:opacity-50"
                  >
                    {actionLoading === job.id ? "..." : "↺ Retry"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}