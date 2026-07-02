import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">

      <section className="text-center space-y-5">
        <Image src="/logo.jpeg" alt="Shada Finder" width={90} height={90} className="mx-auto rounded-2xl shadow-lg" />
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-400 bg-clip-text text-transparent">
            Shada Finder
          </h1>
          <p className="text-gray-500 text-sm tracking-wide mt-1">FIND. VERIFY. TRUST.</p>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload Kuwait Ministry of Commerce & Industry gold certificates.
          Shada Finder reads the document automatically, extracts every serial number
          range, and lets you instantly verify whether a specific gold bar
          belongs to a certificate.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link
            href="/upload"
            className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-xl font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            Upload Certificate
          </Link>
          <Link
            href="/search"
            className="px-6 py-3 border-2 border-yellow-500 text-yellow-700 rounded-xl font-medium hover:bg-yellow-50 transition-colors"
          >
            Search Serial
          </Link>
        </div>

        <div className="max-w-md mx-auto">
          <div className="border-2 border-dashed border-yellow-300 bg-yellow-50 rounded-xl p-4 text-center space-y-2">
            <p className="text-sm font-semibold text-yellow-700">Try the Demo</p>
            <p className="text-xs text-gray-600">Use these credentials to log in and explore</p>
            <div className="bg-white rounded-lg border p-3 text-sm font-mono space-y-1">
              <p><span className="text-gray-500">Email:</span> admin@gmail.com</p>
              <p><span className="text-gray-500">Password:</span> admin123</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="border rounded-2xl p-6 space-y-2 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl">📄</div>
          <h3 className="font-semibold text-lg">1. Upload</h3>
          <p className="text-gray-500 text-sm">
            Upload your gold certificate image. Supports all Kuwait Ministry
            certificate formats — Arabic and English layouts, multiple document types.
          </p>
        </div>
        <div className="border rounded-2xl p-6 space-y-2 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl">🤖</div>
          <h3 className="font-semibold text-lg">2. Auto Extract</h3>
          <p className="text-gray-500 text-sm">
            AI reads the certificate and extracts all rows — gram weight,
            serial ranges, series (AA/AC), purity, and brand automatically.
          </p>
        </div>
        <div className="border rounded-2xl p-6 space-y-2 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl">🔍</div>
          <h3 className="font-semibold text-lg">3. Verify</h3>
          <p className="text-gray-500 text-sm">
            Enter a serial number and series to instantly find which
            certificate that gold bar belongs to.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-center">How Search Works</h2>
        <div className="border rounded-2xl p-6 bg-white shadow-sm max-w-lg mx-auto space-y-2 text-sm text-gray-700">
          <p><strong>Example certificate row:</strong></p>
          <p className="font-mono text-xs bg-gray-50 p-2 rounded">10GRAMS | Range: 728501–728800 | Series: AA</p>
          <hr />
          <p><strong>Search:</strong> Serial = 728601, Series = AA</p>
          <p className="text-green-700">✓ Match found — within range 728501–728800</p>
        </div>
      </section>
    </main>
  );
}
