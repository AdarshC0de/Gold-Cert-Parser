"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpeg" alt="Shada Finder" width={36} height={36} className="rounded-lg" />
          <span className="font-bold text-lg bg-gradient-to-r from-yellow-600 to-yellow-400 bg-clip-text text-transparent">
            Shada Finder
          </span>
        </Link>

        <div className="flex gap-5 text-sm font-medium text-gray-600">
          <Link href="/upload" className="hover:text-gray-900">Upload</Link>
          <Link href="/documents" className="hover:text-gray-900">Documents</Link>
          <Link href="/search" className="hover:text-gray-900">Search</Link>
          <Link href="/queue" className="hover:text-gray-900">Queue</Link>
          {isAdmin && (
            <>
              <Link href="/admin/companies" className="text-purple-600 hover:text-purple-800">Companies</Link>
              <Link href="/admin/documents" className="text-purple-600 hover:text-purple-800">Admin Docs</Link>
            </>
          )}
        </div>
      </div>

      <div className="text-sm">
        {status === "loading" ? null : session ? (
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs">{session.user?.email}</span>
            {isAdmin && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-gray-600 hover:text-red-600 text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-1.5 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
