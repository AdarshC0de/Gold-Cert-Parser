"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
  _count: { documents: number };
}

interface DocRow {
  id: string;
  gram: string;
  count: number;
  serialFrom: number;
  serialTo: number;
  series: string;
}

interface Doc {
  id: string;
  fileUrl: string;
  manufacturer: string | null;
  certNo: string | null;
  createdAt: string;
  rows: DocRow[];
}

export default function TransferPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []));
  }, [isAdmin]);

  useEffect(() => {
    if (!sourceId) { setDocs([]); setSelected(new Set()); return; }
    setLoadingDocs(true);
    setSelected(new Set());
    fetch(`/api/admin/companies/${sourceId}`)
      .then((r) => r.json())
      .then((d) => setDocs(d.company?.documents ?? []))
      .finally(() => setLoadingDocs(false));
  }, [sourceId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === docs.length ? new Set() : new Set(docs.map((d) => d.id))));
  }

  async function handleTransfer() {
    if (!sourceId || !targetId || selected.size === 0) return;
    if (sourceId === targetId) { setMessage("Source and destination can't be the same company."); return; }

    setTransferring(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/companies/${sourceId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: Array.from(selected), targetUserId: targetId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Transfer failed");
      const target = companies.find((c) => c.id === targetId);
      setMessage(`✓ Copied ${data.count} document(s) to ${target?.companyName || target?.name || target?.email}. Both companies can now view them.`);
      setSelected(new Set());
    } catch (e: any) {
      setMessage("✗ " + e.message);
    }
    setTransferring(false);
  }

  if (status === "loading") return null;
  if (!isAdmin) {
    return <main className="max-w-md mx-auto p-6 text-center text-gray-500">Admin access only.</main>;
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transfer Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Copy documents from one company to another. Both companies keep independent, viewable copies — nothing is removed from the source.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm">
          <span className="font-medium mb-1">From company</span>
          <select
            className="border rounded-lg p-2"
            value={sourceId}
            onChange={(e) => { setSourceId(e.target.value); setMessage(null); }}
          >
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.name || c.email} ({c._count.documents} docs)
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          <span className="font-medium mb-1">To company</span>
          <select
            className="border rounded-lg p-2"
            value={targetId}
            onChange={(e) => { setTargetId(e.target.value); setMessage(null); }}
          >
            <option value="">Select a company…</option>
            {companies.filter((c) => c.id !== sourceId).map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.name || c.email}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sourceId && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Documents ({docs.length})</h2>
            {docs.length > 0 && (
              <button onClick={toggleAll} className="text-sm text-blue-600 hover:underline">
                {selected.size === docs.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          {loadingDocs && <p className="text-sm text-gray-500">Loading…</p>}
          {!loadingDocs && docs.length === 0 && <p className="text-sm text-gray-500">No documents for this company.</p>}

          <div className="border rounded-xl divide-y overflow-hidden bg-white shadow-sm max-h-[420px] overflow-y-auto">
            {docs.map((doc) => (
              <label key={doc.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggle(doc.id)} />
                <img src={doc.fileUrl} alt="" className="w-12 h-12 object-cover rounded border shrink-0" />
                <div className="flex-1 min-w-0 text-sm">
                  <p className="truncate">{doc.certNo || doc.manufacturer || "Untitled certificate"}</p>
                  <p className="text-xs text-gray-400">{doc.rows.length} row(s) · {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleTransfer}
          disabled={!sourceId || !targetId || selected.size === 0 || transferring}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {transferring ? "Transferring..." : `Transfer ${selected.size || ""} Document${selected.size === 1 ? "" : "s"}`}
        </button>
        {message && (
          <p className={`text-sm ${message.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{message}</p>
        )}
      </div>
    </main>
  );
}