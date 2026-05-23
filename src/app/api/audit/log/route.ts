import { NextRequest, NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { TypeAction, EntiteCible } from "@prisma/client";

// Interface pour la requête
interface AuditLogRequest {
  idUtilisateur?: string;
  action: TypeAction;
  entite: EntiteCible;
  idEntite?: string;
  details?: Record<string, any>;
  ipAdresse?: string;
  userAgent?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: AuditLogRequest = await req.json();

    // Validation basique
    if (!body.action || !body.entite) {
      return NextResponse.json(
        { error: "Action et entité sont obligatoires" },
        { status: 400 }
      );
    }

    // Récupération de l'IP (compatible Next.js 15)
    const ipAdresse =
      body.ipAdresse ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      undefined;

    const userAgent = body.userAgent || req.headers.get("user-agent") || undefined;

    await logAction({
      idUtilisateur: body.idUtilisateur,
      action: body.action,
      entite: body.entite,
      idEntite: body.idEntite,
      details: body.details,
      ipAdresse,
      userAgent,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[API Audit] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de l'audit" },
      { status: 500 }
    );
  }
}