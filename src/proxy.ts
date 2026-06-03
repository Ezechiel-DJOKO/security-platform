import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";

// 1. Middleware avec withAuth — utilise le type interne de NextAuth
const authProxy = withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/(dashboard)") ||
      pathname.startsWith("/users") ||
      pathname.startsWith("/conformite") ||
      pathname.startsWith("/inventaire") ||
      pathname.startsWith("/rapports")
    ) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }

      const role = token.role as string | undefined;
      if (pathname.includes("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

// 2. Export par défaut — cast pour satisfaire Next.js
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  return authProxy(req as Parameters<typeof authProxy>[0], event);
}

// 3. Configuration
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/(dashboard)/:path*",
    "/users/:path*",
    "/conformite/:path*",
    "/inventaire/:path*",
    "/rapports/:path*",
  ]
};