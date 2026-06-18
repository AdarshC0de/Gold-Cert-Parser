"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterCompanyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    companyName: "",
    tempPassword: "",
    maxDevices: 2,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (status === "authenticated" && !isAdmin) { router.push("/"); return null; }

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create company");
      return;
    }

    router.push("/admin/companies");
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4 mt-6">
      <h1 className="text-2xl font-bold">Register Company</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col text-sm">
          Company Name
          <input className="border rounded p-2 mt-1" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          Contact Name
          <input className="border rounded p-2 mt-1" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          Email (login credentials)
          <input type="email" required className="border rounded p-2 mt-1" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          Temporary Password
          <input type="text" required className="border rounded p-2 mt-1" value={form.tempPassword} onChange={(e) => update("tempPassword", e.target.value)} />
          <span className="text-xs text-gray-400 mt-1">Company must change this on first login.</span>
        </label>
        <label className="flex flex-col text-sm">
          Max Devices Allowed
          <input type="number" min={1} max={10} className="border rounded p-2 mt-1 w-24" value={form.maxDevices} onChange={(e) => update("maxDevices", parseInt(e.target.value || "2", 10))} />
        </label>

        {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {loading ? "Creating..." : "Create Company"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded">
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
