"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ParsedRow, ParsedHeader } from "@/lib/parser";

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ name: string; status: string }[]>([]);

  // Admin-only state for review table
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [header, setHeader] = useState<ParsedHeader | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [saved, setSaved] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <main className="max-w-md mx-auto p-6 text-center space-y-3">
        <p>Please log in to upload documents.</p>
        <button onClick={() => router.push("/login")} className="px-4 py-2 bg-blue-600 text-white rounded">
          Go to Login
        </button>
      </main>
    );
  }

  async function uploadSingleFile(file: File): Promise<{ fileUrl: string; header: ParsedHeader; rows: ParsedRow[] }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? "Upload failed");
    return { fileUrl: data.fileUrl, header: data.header ?? {}, rows: data.rows ?? [] };
  }

  async function saveDocument(fileUrl: string, header: ParsedHeader, rows: ParsedRow[]) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: (session!.user as any).id,
        fileUrl,
        header,
        rows,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? "Save failed");
  }

  async function handleUpload() {
    if (!files.length) return;
    setLoading(true);
    setSaved(false);
    setResults([]);

    if (isAdmin && files.length === 1) {
      // Admin single file — show review table
      try {
        const { fileUrl, header, rows } = await uploadSingleFile(files[0]);
        setFileUrl(fileUrl);
        setHeader(header);
        setRows(rows);
      } catch (e: any) {
        alert("Upload failed: " + e.message);
      }
      setLoading(false);
      return;
    }

    // Bulk upload (or regular user) — auto save all, no review table
    const newResults: { name: string; status: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i);
      const file = files[i];
      try {
        const { fileUrl, header, rows } = await uploadSingleFile(file);
        await saveDocument(fileUrl, header, rows);
        newResults.push({ name: file.name, status: "✓ Saved" });
      } catch (e: any) {
        newResults.push({ name: file.name, status: "✗ Failed: " + e.message });
      }
      setResults([...newResults]);
    }
    setLoading(false);
  }

  function updateRow<K extends keyof ParsedRow>(index: number, key: K, value: ParsedRow[K]) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  async function handleSave() {
    if (!fileUrl || !session?.user) return;
    setLoading(true);
    try {
      await saveDocument(fileUrl, header ?? { manufacturer: null, origin: null, invoiceNo: null, certNo: null, refDate: null }, rows);
      setSaved(true);
    } catch (e: any) {
      alert("Save failed: " + e.message);
    }
    setLoading(false);
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Upload Certificate</h1>

      {/* Drop zone */}
      <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
        <div className="text-center space-y-2">
          <div className="text-4xl">📎</div>
          <p className="text-gray-600 font-medium">
            {files.length > 0
              ? files.length === 1
                ? files[0].name
                : `${files.length} files selected`
              : "Click to choose file(s)"}
          </p>
          <p className="text-xs text-gray-400">JPG, PNG, PDF — single or multiple files</p>
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>

      <button
        onClick={handleUpload}
        disabled={!files.length || loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {loading
          ? files.length > 1
            ? `Processing ${currentFileIndex + 1} of ${files.length}...`
            : "Processing..."
          : "Upload & Save"}
      </button>

      {/* Bulk results (non-admin or multiple files) */}
      {results.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Upload Results</h2>
          <div className="border rounded-lg divide-y text-sm">
            {results.map((r, i) => (
              <div key={i} className={`flex justify-between px-4 py-2 ${r.status.startsWith("✓") ? "bg-green-50" : "bg-red-50"}`}>
                <span className="text-gray-700 truncate">{r.name}</span>
                <span className={r.status.startsWith("✓") ? "text-green-600" : "text-red-600"}>{r.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admin review table (single file only) */}
      {isAdmin && header && rows.length > 0 && !saved && (
        <section className="space-y-4">
          <h2 className="font-semibold text-lg">Review & Edit Before Saving</h2>

          {/* Header fields */}
          <div className="grid grid-cols-2 gap-3">
            {(["manufacturer", "origin", "invoiceNo", "certNo", "refDate"] as (keyof ParsedHeader)[]).map((field) => (
              <label key={field} className="flex flex-col text-sm capitalize">
                {field.replace(/([A-Z])/g, " $1")}
                <input
                  className="border rounded p-1 mt-1"
                  value={(header as any)[field] ?? ""}
                  onChange={(e) => setHeader({ ...header, [field]: e.target.value })}
                />
              </label>
            ))}
          </div>

          {/* Rows table */}
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-1">Gram</th>
                <th className="border p-1">Count</th>
                <th className="border p-1">From (low)</th>
                <th className="border p-1">To (high)</th>
                <th className="border p-1">Series</th>
                <th className="border p-1">Purity</th>
                <th className="border p-1">Brand</th>
                <th className="border p-1">#</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className="border p-1"><input className="w-full" value={row.gram} onChange={(e) => updateRow(i, "gram", e.target.value)} /></td>
                  <td className="border p-1"><input className="w-full" type="number" value={row.count} onChange={(e) => updateRow(i, "count", parseInt(e.target.value || "0", 10))} /></td>
                  <td className="border p-1"><input className="w-full" type="number" value={row.serialFrom} onChange={(e) => updateRow(i, "serialFrom", parseInt(e.target.value || "0", 10))} /></td>
                  <td className="border p-1"><input className="w-full" type="number" value={row.serialTo} onChange={(e) => updateRow(i, "serialTo", parseInt(e.target.value || "0", 10))} /></td>
                  <td className="border p-1"><input className="w-full" value={row.series} onChange={(e) => updateRow(i, "series", e.target.value.toUpperCase())} /></td>
                  <td className="border p-1"><input className="w-full" value={row.purity} onChange={(e) => updateRow(i, "purity", e.target.value)} /></td>
                  <td className="border p-1"><input className="w-full" value={row.brand} onChange={(e) => updateRow(i, "brand", e.target.value.toUpperCase())} /></td>
                  <td className="border p-1"><input className="w-full" type="number" value={row.rowOrder} onChange={(e) => updateRow(i, "rowOrder", parseInt(e.target.value || "0", 10))} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
            {loading ? "Saving..." : "Save Document"}
          </button>
        </section>
      )}

      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          ✓ Certificate saved successfully!
        </div>
      )}
    </main>
  );
}
