"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Document {
  id: string;
  fileUrl: string;
  manufacturer: string | null;
  certNo: string | null;
  invoiceNo: string | null;
  refDate: string | null;
  verified: boolean;
  createdAt: string;
  user?: { email: string };
  rows: {
    id: string;
    gram: string;
    count: number;
    serialFrom: number;
    serialTo: number;
    series: string;
    purity: string | null;
    brand: string | null;
    rowOrder: number;
  }[];
}

export default function AdminDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      if (!isAdmin) { router.push("/"); return; }
      fetch("/api/admin/documents")
        .then((r) => r.json())
        .then((d) => { setDocuments(d.documents ?? []); setLoading(false); });
    }
  }, [status, isAdmin]);

  if (status === "loading" || loading) {
    return <main className="p-6 text-center text-gray-500">Loading...</main>;
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="certificate"
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="absolute top-4 right-4 text-white text-4xl font-bold" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Uploaded Documents</h1>
        <span className="text-sm text-gray-500">{documents.length} total</span>
      </div>

      {documents.length === 0 && (
        <p className="text-gray-500">No documents uploaded yet.</p>
      )}

      <div className="space-y-4">
        {documents.map((doc) => (
          <div key={doc.id} className="border rounded-xl shadow-sm overflow-hidden">

            {/* Document header row */}
            <div className="flex gap-4 p-4 bg-white">
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                <img
                  src={doc.fileUrl}
                  alt="certificate"
                  className="w-24 h-32 object-cover border rounded cursor-pointer hover:opacity-80"
                  onClick={() => setLightbox(doc.fileUrl)}
                  title="Click to enlarge"
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-sm space-y-1">
                <p><strong>Cert No:</strong> {doc.certNo ?? "—"}</p>
                <p><strong>Invoice:</strong> {doc.invoiceNo ?? "—"}</p>
                <p><strong>Manufacturer:</strong> {doc.manufacturer ?? "—"}</p>
                <p><strong>Date:</strong> {doc.refDate ?? "—"}</p>
                <p><strong>Uploaded by:</strong> {doc.user?.email ?? "—"}</p>
                <p><strong>Uploaded at:</strong> {new Date(doc.createdAt).toLocaleString()}</p>
                <p><strong>Rows:</strong> {doc.rows.length}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 text-sm">
                <button
                  onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                >
                  {expandedId === doc.id ? "Hide Table" : "View Table"}
                </button>
                <Link
                  href={`/admin/documents/${doc.id}`}
                  className="px-3 py-1 border rounded hover:bg-gray-50 text-center"
                >
                  Edit
                </Link>
              </div>
            </div>

            {/* Expandable table */}
            {expandedId === doc.id && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border-b p-2 text-left">#</th>
                      <th className="border-b p-2 text-left">Gram</th>
                      <th className="border-b p-2 text-left">Count</th>
                      <th className="border-b p-2 text-left">From</th>
                      <th className="border-b p-2 text-left">To</th>
                      <th className="border-b p-2 text-left">Series</th>
                      <th className="border-b p-2 text-left">Purity</th>
                      <th className="border-b p-2 text-left">Brand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.rows
                      .sort((a, b) => a.rowOrder - b.rowOrder)
                      .map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="border-b p-2">{row.rowOrder}</td>
                          <td className="border-b p-2">{row.gram}</td>
                          <td className="border-b p-2">{row.count}</td>
                          <td className="border-b p-2">{row.serialFrom}</td>
                          <td className="border-b p-2">{row.serialTo}</td>
                          <td className="border-b p-2">{row.series}</td>
                          <td className="border-b p-2">{row.purity}</td>
                          <td className="border-b p-2">{row.brand}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
