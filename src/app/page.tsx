'use client'

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Gold Certificate Parser</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload Kuwait Ministry of Commerce & Industry gold certificates.
          Our system automatically reads the document, extracts all serial number
          ranges, and lets you instantly search whether a specific gold bar
          belongs to a certificate.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link
            href="/upload"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Upload Certificate
          </Link>
          <Link
            href="/search"
            className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50"
          >
            Search Serial
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="border rounded-xl p-6 space-y-2">
          <div className="text-3xl">📄</div>
          <h3 className="font-semibold text-lg">1. Upload</h3>
          <p className="text-gray-500 text-sm">
            Upload your gold certificate image. Supports all Kuwait Ministry
            certificate formats — Arabic and English layouts.
          </p>
        </div>
        <div className="border rounded-xl p-6 space-y-2">
          <div className="text-3xl">🤖</div>
          <h3 className="font-semibold text-lg">2. Auto Extract</h3>
          <p className="text-gray-500 text-sm">
            AI reads the certificate and extracts all rows — gram weight,
            serial ranges, series (AA/AC), purity, and brand automatically.
          </p>
        </div>
        <div className="border rounded-xl p-6 space-y-2">
          <div className="text-3xl">🔍</div>
          <h3 className="font-semibold text-lg">3. Search</h3>
          <p className="text-gray-500 text-sm">
            Enter a gram weight, serial number, and series to instantly find
            which certificate that gold bar belongs to.
          </p>
        </div>
      </section>

      {/* Sample document */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-center">Sample Certificate</h2>
        <p className="text-center text-sm text-gray-500">
          The system handles certificates like this one — extracting all table rows automatically.
        </p>
        <div className="border rounded-xl overflow-hidden max-w-lg mx-auto">
          <img
            src="/sample-cert.jpeg"
            alt="Sample gold certificate"
            className="w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="p-4 bg-gray-50 text-sm text-gray-600">
            <p><strong>Example search:</strong> Gram = 10, Serial = 728601, Series = AA</p>
            <p>→ Returns the certificate containing serial range 728501–728800</p>
          </div>
        </div>
      </section>

    </main>
  );
}