"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

function getFingerprint(): string {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join("|");

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

    try {
      const res = await signIn("credentials", {
        email,
        password,
        fingerprint,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("ACCOUNT_INACTIVE")) {
          setError(
            "Your account has been deactivated. Contact your administrator."
          );
        } else if (res.error.includes("DEVICE_LIMIT_REACHED")) {
          setError(
            "Device limit reached. Contact your administrator to increase the limit."
          );
        } else {
          setError("Invalid email or password.");
        }

        return;
      }

      // Get updated session after login
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      router.refresh();

      if (session?.user?.mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace("/upload");
      }

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <Image
            src="/logo.jpeg"
            alt="Shada Finder"
            width={64}
            height={64}
            className="mx-auto rounded-xl shadow"
          />

          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-400 bg-clip-text text-transparent">
            Shada Finder
          </h1>

          <p className="text-xs text-gray-400 tracking-wide">
            FIND. VERIFY. TRUST.
          </p>
        </div>


        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border"
        >

          <label className="flex flex-col text-sm">
            Email

            <input
              type="email"
              required
              className="border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

          </label>


          <label className="flex flex-col text-sm">
            Password

            <input
              type="password"
              required
              className="border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

          </label>


          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-2.5 rounded-lg">
              {error}
            </p>
          )}


          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? "Logging in..." : "Login"}
          </button>


        </form>

      </div>
    </main>
  );
}