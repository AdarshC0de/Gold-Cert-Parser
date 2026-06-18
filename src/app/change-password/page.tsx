"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPass !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (newPass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: (session?.user as any)?.id,
        currentPassword: current,
        newPassword: newPass,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      setError(data.error ?? "Failed to change password.");
      return;
    }

    router.push("/upload");
  }

  return (
    <main className="max-w-sm mx-auto p-6 space-y-4 mt-10">
      <h1 className="text-2xl font-bold">Change Password</h1>
      <p className="text-sm text-gray-500">You must change your temporary password before continuing.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col text-sm">
          Current (Temporary) Password
          <input type="password" required className="border rounded p-2 mt-1" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          New Password
          <input type="password" required className="border rounded p-2 mt-1" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          Confirm New Password
          <input type="password" required className="border rounded p-2 mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
        <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? "Saving..." : "Set New Password"}
        </button>
      </form>
    </main>
  );
}
