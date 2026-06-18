"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  fileUrl: string;
  manufacturer: string | null;
  certNo: string | null;
  invoiceNo: string | null;
  refDate: string | null;
  createdAt: string;
  user?: { email: string };
}

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const url = isAdmin
        ? "/api/admin/documents"
        : `/api/documents?userId=${(session.user as any).id}`;

      fetch(url)
        .then((r) => r.json())
        .then((d) => { setDocuments(d.documents ?? []); setLoading(false); });
    }
  }, [status, isAdmin]);

  if (status === "loading" || loading) {
    return <main className="p-6 text-center text-gray-500">Loading...</main>;
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">

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
          <button
            className="absolute top-4 right-4 text-white text-4xl font-bold"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isAdmin ? "All Uploaded Documents" : "My Documents"}
        </h1>
        <span className="text-sm text-gray-500">{documents.length} total</span>
      </div>

      {documents.length === 0 && (
        <p className="text-gray-500">No documents uploaded yet.</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className="cursor-pointer"
              onClick={() => setLightbox(doc.fileUrl)}
            >
              <img
                src={doc.fileUrl}
                alt="certificate"
                className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
              />
            </div>
            <div className="p-3 space-y-1 text-xs text-gray-600">
              <p><strong>Cert No:</strong> {doc.certNo ?? "—"}</p>
              <p><strong>Invoice:</strong> {doc.invoiceNo ?? "—"}</p>
              <p><strong>Manufacturer:</strong> {doc.manufacturer ?? "—"}</p>
              <p><strong>Date:</strong> {doc.refDate ?? "—"}</p>
              {isAdmin && doc.user && (
                <p><strong>By:</strong> {doc.user.email}</p>
              )}
              <p className="text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}