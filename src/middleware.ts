import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Routes protégées
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/(dashboard)") ||
      pathname.startsWith("/users") ||
      pathname.startsWith("/conformite") ||
      pathname.startsWith("/inventaire") ||
      pathname.startsWith("/rapports")
    ) {
      const token = (req as any).nextauth?.token

      if (!token) {
        return NextResponse.redirect(new URL("/auth/login", req.url))
      }

      // RBAC simple
      const role = token.role as string | undefined
      if (pathname.includes("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        if (pathname === "/" || pathname === "/auth/login") {
          return true
        }
        return !!token
      },
    },
    pages: {
      signIn: "/auth/login",
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/(dashboard)/:path*",
    "/users/:path*",
    "/conformite/:path*",
    "/inventaire/:path*",
    "/rapports/:path*",
  ]
}