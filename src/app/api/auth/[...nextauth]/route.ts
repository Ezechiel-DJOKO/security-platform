import { NextRequest, NextResponse } from "next/server";
import { logAction } from "@/lib/audit";   // Garde cet import

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // === Correction ici ===
    await logAction(
      body.userId || "anonymous",     // userId
      body.action || "LOGIN",         // action
      body.resource || "Auth",        // resource / entite
      body.details || {}              // details
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Audit] Erreur:", error);
    return NextResponse.json({ error: "Failed to log action" }, { status: 500 });
  }
}