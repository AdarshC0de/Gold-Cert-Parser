import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public routes — no auth required
        const publicPaths = ["/api/auth", "/api/docs", "/login", "/docs", "/"];

        if (publicPaths.some((p) => path === p || path.startsWith(p + "/") || path === p)) {
          return true;
        }

        // Everything else under /api requires a valid token
        if (path.startsWith("/api/")) return !!token;

        // Protected pages also require auth
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/api/:path*",
    "/upload/:path*",
    "/search/:path*",
    "/documents/:path*",
    "/queue/:path*",
    "/admin/:path*",
    "/change-password/:path*",
  ],
};
