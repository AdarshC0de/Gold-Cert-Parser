"use client";

import { useEffect, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function DocsPage() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch("/api/docs").then((r) => r.json()).then(setSpec);
  }, []);

  if (!spec) return (
    <main className="p-6 text-center text-gray-500">Loading API docs...</main>
  );

  return (
    <main className="min-h-screen">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Gold Certificate Parser — API Docs</h1>
        <a href="/api/docs" target="_blank" className="text-sm text-blue-300 hover:underline">
          OpenAPI JSON ↗
        </a>
      </div>
      <SwaggerUI spec={spec} docExpansion="list" defaultModelsExpandDepth={1} />
    </main>
  );
}
