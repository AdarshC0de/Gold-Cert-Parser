"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

interface Row {
  id: string;
  rowOrder: number;
  gram: string;
  count: number;
  serialFrom: number;
  serialTo: number;
  series: string;
  purity: string | null;
  brand: string | null;
}

interface Header {
  manufacturer: string | null;
  origin: string | null;
  invoiceNo: string | null;
  certNo: string | null;
  refDate: string | null;
}

export default function AdminDocumentEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [header, setHeader] = useState<Header | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && !isAdmin) { router.push("/"); return; }
    if (status === "authenticated") {
      fetch(`/api/admin/documents/${id}`)
        .then((r) => r.json())
        .then((d) => {
          const doc = d.document;
          setFileUrl(doc.fileUrl);
          setHeader({
            manufacturer: doc.manufacturer,
            origin: doc.origin,
            invoiceNo: doc.invoiceNo,
            certNo: doc.certNo,
            refDate: doc.refDate,
          });
          setRows(doc.rows.sort((a: Row, b: Row) => a.rowOrder - b.rowOrder));
          setLoading(false);
        });
    }
  }, [status, id]);

  function updateRow<K extends keyof Row>(index: number, key: K, value: Row[K]) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/admin/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ header, rows }),
    });
    const data = await res.json();
    if (data.success) setSaved(true);
    else alert("Save failed: " + data.error);
    setSaving(false);
  }

  if (loading) return <main className="p-6 text-center text-gray-500">Loading...</main>;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">

      {lightbox && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <img src={fileUrl} alt="certificate" className="max-w-full max-h-full object-contain rounded" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white text-4xl font-bold" onClick={() => setLightbox(false)}>✕</button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-blue-600 text-sm">← Back</button>
        <h1 className="text-2xl font-bold">Edit Document</h1>
      </div>

      <div className="flex gap-6">
        {/* Image */}
        <div className="flex-shrink-0">
          <img
            src={fileUrl}
            alt="certificate"
            className="w-48 border rounded cursor-pointer hover:opacity-80"
            onClick={() => setLightbox(true)}
            title="Click to enlarge"
          />
          <p className="text-xs text-center text-gray-400 mt-1">Click to enlarge</p>
        </div>

        {/* Header fields */}
        {header && (
          <div className="flex-1 grid grid-cols-2 gap-3">
            {(Object.keys(header) as (keyof Header)[]).map((field) => (
              <label key={field} className="flex flex-col text-sm">
                {field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                <input
                  className="border rounded p-1 mt-1"
                  value={(header as any)[field] ?? ""}
                  onChange={(e) => setHeader({ ...header, [field]: e.target.value })}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Rows table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">#</th>
              <th className="border p-2">Gram</th>
              <th className="border p-2">Count</th>
              <th className="border p-2">From (low)</th>
              <th className="border p-2">To (high)</th>
              <th className="border p-2">Series</th>
              <th className="border p-2">Purity</th>
              <th className="border p-2">Brand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td className="border p-1"><input className="w-14" type="number" value={row.rowOrder} onChange={(e) => updateRow(i, "rowOrder", parseInt(e.target.value || "0", 10))} /></td>
                <td className="border p-1"><input className="w-28" value={row.gram} onChange={(e) => updateRow(i, "gram", e.target.value)} /></td>
                <td className="border p-1"><input className="w-16" type="number" value={row.count} onChange={(e) => updateRow(i, "count", parseInt(e.target.value || "0", 10))} /></td>
                <td className="border p-1"><input className="w-24" type="number" value={row.serialFrom} onChange={(e) => updateRow(i, "serialFrom", parseInt(e.target.value || "0", 10))} /></td>
                <td className="border p-1"><input className="w-24" type="number" value={row.serialTo} onChange={(e) => updateRow(i, "serialTo", parseInt(e.target.value || "0", 10))} /></td>
                <td className="border p-1"><input className="w-14" value={row.series} onChange={(e) => updateRow(i, "series", e.target.value.toUpperCase())} /></td>
                <td className="border p-1"><input className="w-16" value={row.purity ?? ""} onChange={(e) => updateRow(i, "purity", e.target.value)} /></td>
                <td className="border p-1"><input className="w-24" value={row.brand ?? ""} onChange={(e) => updateRow(i, "brand", e.target.value.toUpperCase())} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && <span className="text-green-600">✓ Saved successfully</span>}
      </div>
    </main>
  );
}
