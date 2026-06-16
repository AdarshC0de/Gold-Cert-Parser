"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ParsedRow, ParsedHeader } from "@/lib/parser";

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [header, setHeader] = useState<ParsedHeader | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [saved, setSaved] = useState(false);

  

  function updateRow<K extends keyof ParsedRow>(index: number, key: K, value: ParsedRow[K]) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  async function handleUpload() {
  if (!file) return;
  setLoading(true);
  setSaved(false);

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();

  if (!data.success) {
    alert("Upload failed: " + data.error);
    setLoading(false);
    return;
  }

  setFileUrl(data.fileUrl);
  setHeader(data.header);        // ← was data.document?.fileUrl
  setRows(data.rows ?? []);      // ← was data.document?.rows
  setLoading(false);
}

async function handleSave() {
  if (!fileUrl || !session?.user) return;   // ← removed header check
  setLoading(true);

  const res = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: (session.user as any).id,
      fileUrl,
      header: header ?? {},      // ← fallback to empty object
      rows,
    }),
  });

  const data = await res.json();
  if (data.success) {
    setSaved(true);
  } else {
    alert("Save failed: " + data.error);
  }
  setLoading(false);
}

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Upload Certificate</h1>

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Processing..." : "Upload & Read"}
        </button>
      </div>

      {fileUrl && (
        <p className="text-sm text-gray-500">
          File saved at <code>{fileUrl}</code>
        </p>
      )}

      {header && (
        <section className="space-y-2">
          <h2 className="font-semibold">Document Details (review/edit)</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col text-sm">
              Manufacturer
              <input
                className="border rounded p-1"
                value={header.manufacturer ?? ""}
                onChange={(e) => setHeader({ ...header, manufacturer: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm">
              Origin
              <input
                className="border rounded p-1"
                value={header.origin ?? ""}
                onChange={(e) => setHeader({ ...header, origin: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm">
              Invoice No
              <input
                className="border rounded p-1"
                value={header.invoiceNo ?? ""}
                onChange={(e) => setHeader({ ...header, invoiceNo: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm">
              Cert No
              <input
                className="border rounded p-1"
                value={header.certNo ?? ""}
                onChange={(e) => setHeader({ ...header, certNo: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm">
              Date
              <input
                className="border rounded p-1"
                value={header.refDate ?? ""}
                onChange={(e) => setHeader({ ...header, refDate: e.target.value })}
              />
            </label>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Table Rows (review/edit)</h2>
          <p className="text-sm text-amber-600 font-medium">
  ⚠️ Always verify before saving:
  <br />• Series column — OCR frequently assigns wrong series (AA/AC). Check each row.
  <br />• Serial numbers — OCR sometimes drops digits (e.g. 62300 instead of 623000). Compare with the original image.
</p>
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
                  <td className="border p-1">
                    <input
                      className="w-full"
                      value={row.gram}
                      onChange={(e) => updateRow(i, "gram", e.target.value)}
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      className="w-full"
                      type="number"
                      value={row.count}
                      onChange={(e) => updateRow(i, "count", parseInt(e.target.value || "0", 10))}
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      className="w-full"
                      type="number"
                      value={row.serialFrom}
                      onChange={(e) =>
                        updateRow(i, "serialFrom", parseInt(e.target.value || "0", 10))
                      }
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      className="w-full"
                      type="number"
                      value={row.serialTo}
                      onChange={(e) =>
                        updateRow(i, "serialTo", parseInt(e.target.value || "0", 10))
                      }
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      className="w-full"
                      value={row.series}
                      onChange={(e) => updateRow(i, "series", e.target.value.toUpperCase())}
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      className="w-full"
                      value={row.purity}
                      onChange={(e) => updateRow(i, "purity", e.target.value)}
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      className="w-full"
                      value={row.brand}
                      onChange={(e) => updateRow(i, "brand", e.target.value.toUpperCase())}
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      className="w-full"
                      type="number"
                      value={row.rowOrder}
                      onChange={(e) =>
                        updateRow(i, "rowOrder", parseInt(e.target.value || "0", 10))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Document"}
          </button>

          {saved && <p className="text-green-600">Saved!</p>}
        </section>
      )}
    </main>
  );
}
