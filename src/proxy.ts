import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. Initialisation de la logique de filtrage sous la nouvelle convention "proxy"
const authProxy = withAuth(
  function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Analyse des routes protégées
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/(dashboard)") ||
      pathname.startsWith("/users") ||
      pathname.startsWith("/conformite") ||
      pathname.startsWith("/inventaire") ||
      pathname.startsWith("/rapports")
    ) {
      const token = (req as any).nextauth?.token;

      if (!token) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }

      // Gestion simple des privilèges (RBAC)
      const role = token.role as string | undefined;
      if (pathname.includes("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname === "/" || pathname === "/auth/login") {
          return true;
        }
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

// 2. Next.js 16 exige l'export par défaut nommé "proxy"
export default function proxy(req: NextRequest, event: any) {
  return (authProxy as any)(req, event);
}

// 3. Configuration des routes cibles (Matchérisation statique)
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
