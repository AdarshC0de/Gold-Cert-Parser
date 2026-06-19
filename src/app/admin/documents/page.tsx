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
  const [tableModal, setTableModal] = useState<Document | null>(null);

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
    <main className="w-full px-6 py-6 space-y-6">

      {/* Image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="certificate" className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white text-4xl font-bold" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      {/* Table modal — wide and clean */}
      {tableModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onClick={() => setTableModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div>
                <h3 className="font-semibold text-lg">Cert No: {tableModal.certNo ?? "—"}</h3>
                <p className="text-sm text-gray-500">{tableModal.manufacturer} · {tableModal.refDate} · {tableModal.user?.email}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/documents/${tableModal.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Edit Document
                </Link>
                <button
                  onClick={() => setTableModal(null)}
                  className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal body — scrollable table */}
            <div className="overflow-auto p-4 flex-1">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100 sticky top-0">
                    <th className="border p-2 text-left">#</th>
                    <th className="border p-2 text-left">Gram</th>
                    <th className="border p-2 text-left">Count</th>
                    <th className="border p-2 text-left">From (low)</th>
                    <th className="border p-2 text-left">To (high)</th>
                    <th className="border p-2 text-left">Series</th>
                    <th className="border p-2 text-left">Purity</th>
                    <th className="border p-2 text-left">Brand</th>
                  </tr>
                </thead>
                <tbody>
                  {tableModal.rows
                    .sort((a, b) => a.rowOrder - b.rowOrder)
                    .map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="border p-2">{row.rowOrder}</td>
                        <td className="border p-2 font-medium">{row.gram}</td>
                        <td className="border p-2">{row.count}</td>
                        <td className="border p-2">{row.serialFrom}</td>
                        <td className="border p-2">{row.serialTo}</td>
                        <td className="border p-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${row.series === "AA" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                            {row.series}
                          </span>
                        </td>
                        <td className="border p-2">{row.purity}</td>
                        <td className="border p-2">{row.brand}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Uploaded Documents</h1>
        <span className="text-sm text-gray-500">{documents.length} total</span>
      </div>

      {documents.length === 0 && <p className="text-gray-500">No documents uploaded yet.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <img
              src={doc.fileUrl}
              alt="certificate"
              className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightbox(doc.fileUrl)}
              title="Click to enlarge"
            />
            <div className="p-3 space-y-1 text-xs text-gray-600">
              <p><strong>Cert No:</strong> {doc.certNo ?? "—"}</p>
              <p><strong>Invoice:</strong> {doc.invoiceNo ?? "—"}</p>
              <p><strong>Manufacturer:</strong> {doc.manufacturer ?? "—"}</p>
              <p><strong>Date:</strong> {doc.refDate ?? "—"}</p>
              <p><strong>By:</strong> {doc.user?.email ?? "—"}</p>
              <p className="text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setTableModal(doc)}
                  className="flex-1 px-2 py-1 border rounded hover:bg-gray-50"
                >
                  Table
                </button>
                <Link
                  href={`/admin/documents/${doc.id}`}
                  className="flex-1 px-2 py-1 border rounded hover:bg-gray-50 text-center"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}