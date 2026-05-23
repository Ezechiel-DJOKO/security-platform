import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { RoleUtilisateur } from "@prisma/client";

const ROLE_PERMISSIONS: Record<RoleUtilisateur, string[]> = {
  [RoleUtilisateur.ADMIN]: [
    "/",
    "/dashboard",
    "/users",
    "/scans",
    "/vulnerabilites",
    "/plans",
    "/rapports",
    "/conformite",
    "/settings",
  ],
  [RoleUtilisateur.AUDITEUR]: [
    "/",
    "/dashboard",
    "/scans",
    "/vulnerabilites",
    "/plans",
    "/rapports",
    "/conformite",
  ],
  [RoleUtilisateur.SUPERVISEUR]: [
    "/",
    "/dashboard",
    "/scans",
    "/vulnerabilites",
    "/plans",
    "/rapports",
  ],
};

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/error",
  "/api/auth",
  "/_next",
  "/favicon.ico",
];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const userRole = token?.role as RoleUtilisateur | undefined;
  const pathname = nextUrl.pathname;

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  const allowedRoutes = ROLE_PERMISSIONS[userRole ?? RoleUtilisateur.AUDITEUR];
  const hasPermission = allowedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!hasPermission) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
