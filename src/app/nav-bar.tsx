"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b">
      <div className="flex gap-4 font-medium">
        <Link href="/">Home</Link>
        <Link href="/upload">Upload</Link>
        <Link href="/search">Search</Link>
      </div>
      <div className="text-sm">
        {status === "loading" ? null : session ? (
          <div className="flex items-center gap-3">
            <span>{session.user?.email}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-blue-600">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link href="/login" className="text-blue-600">
              Login
            </Link>
            <Link href="/signup" className="text-blue-600">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
