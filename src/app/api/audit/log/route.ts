export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    const { userId, action, resource, details } = await req.json()

    // Récupération sécurisée de l'IP
    const ipAdresse = 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null

    await prisma.auditLog.create({
      data: {
        idUtilisateur: userId || (session?.user as any)?.id || null,
        action: action as any,
        entite: resource as any,
        idEntite: null,
        details: details || {},
        ipAdresse: ipAdresse,
        userAgent: req.headers.get('user-agent') || null,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Audit log error:', error)
    return NextResponse.json({ error: 'Failed to log audit' }, { status: 500 })
  }
}