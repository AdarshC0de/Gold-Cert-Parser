"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Simple browser fingerprint based on user agent + screen + timezone
function getFingerprint(): string {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join("|");

  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    setFingerprint(getFingerprint());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      fingerprint,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error.includes("ACCOUNT_INACTIVE")) {
        setError("Your account has been deactivated. Contact your administrator.");
      } else if (res.error.includes("DEVICE_LIMIT_REACHED")) {
        setError("Device limit reached. You are already logged in on the maximum number of devices. Contact your administrator to increase the limit.");
      } else {
        setError("Invalid email or password.");
      }
      return;
    }

    // Check if must change password
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    if ((session?.user as any)?.mustChangePassword) {
      router.push("/change-password");
    } else {
      router.push("/upload");
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6 space-y-4 mt-10">
      <h1 className="text-2xl font-bold">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col text-sm">
          Email
          <input type="email" required className="border rounded p-2 mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          Password
          <input type="password" required className="border rounded p-2 mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
        <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
