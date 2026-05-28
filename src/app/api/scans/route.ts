import { NextRequest, NextResponse } from 'next/server';
import { lancerScanAction } from '@/features/scans/actions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const scans = await prisma.scan.findMany({
      include: {
        actif: true,
        utilisateur: true,
        vulnerabilites: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(scans);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des scans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await lancerScanAction(body);
    
    return NextResponse.json(result, { 
      status: result.success ? 201 : 400 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
