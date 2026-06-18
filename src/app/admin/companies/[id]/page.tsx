"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

interface Doc {
  id: string;
  fileUrl: string;
  certNo: string | null;
  invoiceNo: string | null;
  refDate: string | null;
  createdAt: string;
}

interface Company {
  id: string;
  name: string | null;
  email: string;
  companyName: string | null;
  isActive: boolean;
  maxDevices: number;
  mustChangePassword: boolean;
  documents: Doc[];
  sessions: { id: string; fingerprint: string; lastSeen: string }[];
}

export default function EditCompanyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [allCompanies, setAllCompanies] = useState<{ id: string; companyName: string | null; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetPass, setResetPass] = useState("");
  const [copyTarget, setCopyTarget] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && !isAdmin) { router.push("/"); return; }
    if (status === "authenticated") {
      Promise.all([
        fetch(`/api/admin/companies/${id}`).then((r) => r.json()),
        fetch("/api/admin/companies").then((r) => r.json()),
      ]).then(([compData, allData]) => {
        setCompany(compData.company);
        setAllCompanies((allData.companies ?? []).filter((c: any) => c.id !== id));
        setLoading(false);
      });
    }
  }, [status, id]);

  async function handleSave() {
    if (!company) return;
    setSaving(true);
    setSaved(false);

    const body: any = {
      name: company.name,
      companyName: company.companyName,
      isActive: company.isActive,
      maxDevices: company.maxDevices,
    };

    if (resetPass) {
      body.resetPassword = true;
      body.newPassword = resetPass;
    }

    await fetch(`/api/admin/companies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    setSaved(true);
    setResetPass("");
  }

  async function copyDoc(docId: string) {
    if (!copyTarget) { alert("Select a target company first."); return; }
    const res = await fetch(`/api/admin/companies/${id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, targetUserId: copyTarget }),
    });
    const data = await res.json();
    if (data.success) alert("Document copied successfully.");
    else alert("Copy failed: " + data.error);
  }

  async function deleteDoc(docId: string) {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/admin/companies/${id}/documents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId }),
    });
    setCompany((prev) => prev ? { ...prev, documents: prev.documents.filter((d) => d.id !== docId) } : prev);
  }

  async function killSession(sessionId: string) {
    await fetch(`/api/admin/sessions/${sessionId}`, { method: "DELETE" });
    setCompany((prev) => prev ? { ...prev, sessions: prev.sessions.filter((s) => s.id !== sessionId) } : prev);
  }

  if (loading || !company) return <main className="p-6 text-center text-gray-500">Loading...</main>;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">

      {lightbox && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="cert" className="max-w-full max-h-full object-contain rounded" />
          <button className="absolute top-4 right-4 text-white text-4xl font-bold" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-blue-600 text-sm">← Back</button>
        <h1 className="text-2xl font-bold">{company.companyName ?? company.email}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full ${company.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {company.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Edit fields */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Company Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-sm">
            Company Name
            <input className="border rounded p-2 mt-1" value={company.companyName ?? ""} onChange={(e) => setCompany({ ...company, companyName: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">
            Contact Name
            <input className="border rounded p-2 mt-1" value={company.name ?? ""} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">
            Max Devices
            <input type="number" min={1} max={20} className="border rounded p-2 mt-1 w-24" value={company.maxDevices} onChange={(e) => setCompany({ ...company, maxDevices: parseInt(e.target.value || "2", 10) })} />
          </label>
          <label className="flex flex-col text-sm">
            Status
            <select className="border rounded p-2 mt-1" value={company.isActive ? "active" : "inactive"} onChange={(e) => setCompany({ ...company, isActive: e.target.value === "active" })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="flex flex-col text-sm col-span-2">
            Reset Password (leave blank to keep current)
            <input type="text" placeholder="New temporary password" className="border rounded p-2 mt-1" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && <span className="text-green-600 text-sm">✓ Saved</span>}
        </div>
      </section>

      {/* Active sessions */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Active Sessions ({company.sessions.length}/{company.maxDevices})</h2>
        {company.sessions.length === 0 && <p className="text-sm text-gray-500">No active sessions.</p>}
        {company.sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm border rounded p-2">
            <div>
              <p className="text-gray-600">Device: <code>{s.fingerprint}</code></p>
              <p className="text-gray-400 text-xs">Last seen: {new Date(s.lastSeen).toLocaleString()}</p>
            </div>
            <button onClick={() => killSession(s.id)} className="text-red-600 text-xs border border-red-300 rounded px-2 py-1 hover:bg-red-50">
              Kill Session
            </button>
          </div>
        ))}
      </section>

      {/* Documents */}
      <section className="border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Documents ({company.documents.length})</h2>
          <div className="flex items-center gap-2 text-sm">
            <span>Copy selected to:</span>
            <select className="border rounded p-1" value={copyTarget} onChange={(e) => setCopyTarget(e.target.value)}>
              <option value="">Select company...</option>
              {allCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName ?? c.email}</option>
              ))}
            </select>
          </div>
        </div>

        {company.documents.length === 0 && <p className="text-sm text-gray-500">No documents.</p>}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {company.documents.map((doc) => (
            <div key={doc.id} className="border rounded-lg overflow-hidden text-xs">
              <img
                src={doc.fileUrl}
                alt="cert"
                className="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                onClick={() => setLightbox(doc.fileUrl)}
              />
              <div className="p-2 space-y-1">
                <p><strong>Cert:</strong> {doc.certNo ?? "—"}</p>
                <p><strong>Date:</strong> {doc.refDate ?? "—"}</p>
                <div className="flex gap-1 pt-1">
                  <button onClick={() => copyDoc(doc.id)} className="flex-1 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100">
                    Copy
                  </button>
                  <button onClick={() => deleteDoc(doc.id)} className="flex-1 py-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
