"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Company {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
  isActive: boolean;
  maxDevices: number;
  mustChangePassword: boolean;
  createdAt: string;
  _count: { documents: number; sessions: number };
}

export default function AdminCompaniesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      if (!isAdmin) { router.push("/"); return; }
      fetch("/api/admin/companies")
        .then((r) => r.json())
        .then((d) => { setCompanies(d.companies ?? []); setLoading(false); });
    }
  }, [status, isAdmin]);

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/companies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !current } : c));
  }

  async function deleteCompany(id: string, email: string) {
    if (!confirm(`Delete company ${email}? This will also delete all their documents.`)) return;
    await fetch(`/api/admin/companies/${id}`, { method: "DELETE" });
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  if (status === "loading" || loading) return <main className="p-6 text-center text-gray-500">Loading...</main>;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Link href="/admin/companies/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          + Register Company
        </Link>
      </div>

      {companies.length === 0 && <p className="text-gray-500">No companies registered yet.</p>}

      <div className="space-y-3">
        {companies.map((c) => (
          <div key={c.id} className="border rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{c.companyName ?? c.name ?? "—"}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {c.isActive ? "Active" : "Inactive"}
                </span>
                {c.mustChangePassword && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Temp Password</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{c.email}</p>
              <p className="text-xs text-gray-400">
                {c._count.documents} docs · {c._count.sessions} active devices · max {c.maxDevices} devices
              </p>
            </div>

            <div className="flex gap-2 text-sm">
              <button
                onClick={() => toggleActive(c.id, c.isActive)}
                className={`px-3 py-1 rounded border text-xs ${c.isActive ? "border-red-300 text-red-600 hover:bg-red-50" : "border-green-300 text-green-600 hover:bg-green-50"}`}
              >
                {c.isActive ? "Deactivate" : "Activate"}
              </button>
              <Link href={`/admin/companies/${c.id}`} className="px-3 py-1 rounded border text-xs hover:bg-gray-50">
                Edit
              </Link>
              <button
                onClick={() => deleteCompany(c.id, c.email)}
                className="px-3 py-1 rounded border border-red-300 text-red-600 text-xs hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
