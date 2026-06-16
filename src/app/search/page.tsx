"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SearchResult {
  document: {
    id: string;
    fileUrl: string;
    manufacturer: string | null;
    origin: string | null;
    certNo: string | null;
    refDate: string | null;
  };
  matchedRow: {
    gram: string;
    count: number;
    serialFrom: number;
    serialTo: number;
    series: string;
    purity: string | null;
    brand: string | null;
    rowOrder: number;
  };
}

export default function SearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [gram, setGram] = useState("");
  const [serial, setSerial] = useState("");
  const [series, setSeries] = useState("AA");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <main className="max-w-md mx-auto p-6 text-center space-y-3">
        <p>Please log in to search.</p>
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Go to Login
        </button>
      </main>
    );
  }

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  async function handleSearch() {
    setLoading(true);
    const params = new URLSearchParams({ gram, serial, series });
    const res = await fetch(`/api/search?${params.toString()}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Search Certificate</h1>
      <p className="text-sm text-gray-500">
        {isAdmin
          ? "Admin: searching across all users' documents."
          : "Searching your uploaded documents only."}
      </p>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col text-sm">
          Gram (e.g. 10, 2.5, or ONZ)
          <input className="border rounded p-2" value={gram} onChange={(e) => setGram(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          Serial Number
          <input
            className="border rounded p-2"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          Series
          <select className="border rounded p-2" value={series} onChange={(e) => setSeries(e.target.value)}>
            <option value="AA">AA</option>
            <option value="AC">AC</option>
          </select>
        </label>
      </div>

      <button
        onClick={handleSearch}
        disabled={loading || !gram || !serial}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? "Searching..." : "Search"}
      </button>

      {results !== null && (
        <section className="space-y-4">
          {results.length === 0 && <p>No matching certificate found.</p>}

          {results.map((r, i) => (
            <div key={i} className="border rounded p-4 flex gap-4">
              <img src={r.document.fileUrl} alt="certificate" className="w-40 border" />
              <div className="text-sm space-y-1">
                <p>
                  <strong>Manufacturer:</strong> {r.document.manufacturer}
                </p>
                <p>
                  <strong>Cert No:</strong> {r.document.certNo}
                </p>
                <p>
                  <strong>Date:</strong> {r.document.refDate}
                </p>
                <hr />
                <p>
                  <strong>Matched Row:</strong> {r.matchedRow.gram} | Range{" "}
                  {r.matchedRow.serialFrom}-{r.matchedRow.serialTo} | Series {r.matchedRow.series} |
                  Brand {r.matchedRow.brand}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
