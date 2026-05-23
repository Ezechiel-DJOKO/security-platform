import { NextRequest, NextResponse } from "next/server";
import { logAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await logAction(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Audit] Erreur:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}