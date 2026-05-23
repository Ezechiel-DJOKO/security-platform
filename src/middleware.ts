import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
// Note : Ajustez le nom de l'enum si vous utilisez "Role" à la place de "RoleUtilisateur"
import { RoleUtilisateur } from "@prisma/client";

// CORRECTION : Remplacement de '<<' par '<'
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
  // Attention : Assurez-vous que SUPERVISEUR existe dans votre enum Prisma
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
  const userId = token?.id as string | undefined;
  const pathname = nextUrl.pathname;

  if (PUBLIC_ROUTES.some((route: string) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    logToApi({
      idUtilisateur: undefined,
      action: "LECTURE",
      entite: "UTILISATEUR",
      details: { route: pathname, resultat: "ACCES_REFUSE_NON_AUTHENTIFIE" },
      // Utilisation parfaite des headers pour récupérer l'IP !
      ipAdresse: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  const allowedRoutes = ROLE_PERMISSIONS[userRole ?? RoleUtilisateur.AUDITEUR];
  const hasPermission = allowedRoutes ? allowedRoutes.some((route: string) =>
    pathname.startsWith(route)
  ) : false;

  if (!hasPermission) {
    logToApi({
      idUtilisateur: userId,
      action: "LECTURE",
      entite: "UTILISATEUR",
      details: { route: pathname, role: userRole, resultat: "ACCES_REFUSE_RBAC" },
      ipAdresse: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", nextUrl));
  }

  return NextResponse.next();
}

function logToApi(data: {
  idUtilisateur?: string;
  action: string;
  entite: string;
  details?: Record<string, unknown>;
  ipAdresse?: string;
  userAgent?: string;
}) {
  const url = process.env.NEXTAUTH_URL || "http://localhost:3000";
  fetch(`${url}/api/audit/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
