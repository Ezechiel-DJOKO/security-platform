'use server';

import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { StatutScan } from '@prisma/client';
import { broadcastScanCompleted } from './sse';   // ← Import important

const execAsync = promisify(exec);

// ==================== TRIGGER SCAN ====================
export async function triggerScanBackground(scanId: string) {
  console.log(`[SCAN START] Début du scan ${scanId}`);

  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true }
    });

    if (!scan) throw new Error(`Scan ${scanId} introuvable`);

    const cible = scan.cible;
    const outil = scan.outil;
    const scriptPath = path.join(process.cwd(), 'python-scanner', 'scan.py');

    console.log(`🎯 Cible : ${cible} | Outil : ${outil}`);

    const command = `python3 ${scriptPath} --tool ${outil.toLowerCase()} --target ${cible} --scan-id ${scanId}`;
    console.log(`[SCAN] Exécution : ${command}`);

    const { stdout, stderr } = await execAsync(command, { timeout: 300000 });

    if (stderr) console.warn(`[Python stderr]: ${stderr}`);
    if (stdout) console.log(`[Python stdout]: ${stdout}`);

    await postScanProcessing(scanId);

    return { success: true, scanId };

  } catch (error: any) {
    console.error(`❌ Erreur lors du scan ${scanId}:`, error);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.ECHEC,
        fin: new Date(),
        erreur: error.message || 'Erreur inconnue',
      }
    });

    throw error;
  }
}

// ==================== POST-PROCESSING ====================
async function postScanProcessing(scanId: string) {
  try {
    console.log(`📥 Début du post-traitement pour le scan ${scanId}...`);

    await createRemediationPlans(scanId);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.TERMINE,
        fin: new Date(),
      }
    });

    console.log(`✅ [SCAN SUCCESS] Scan ${scanId} terminé avec succès`);

    await sendScanCompletionAlert(scanId);

  } catch (error) {
    console.error(`Erreur post-traitement scan ${scanId}:`, error);
  }
}

// ==================== CRÉATION PLANS ====================
async function createRemediationPlans(scanId: string) {
  try {
    const vulnerabilites = await prisma.vulnerabilite.findMany({
      where: {
        idScan: scanId,
        plansCorrection: { none: {} }
      }
    });

    console.log(`🛠️ Création de ${vulnerabilites.length} plans de correction...`);

    await Promise.all(
      vulnerabilites.map(vuln => {
        let priorite: any = 'MOYENNE';
        if (vuln.severite === 'CRITICAL' || vuln.severite === 'HIGH') {
          priorite = 'HAUTE';
        }

        return prisma.planCorrection.create({
          data: {
            idVulnerabilite: vuln.id,
            priorite,
            assigneA: null as any,
            dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            statut: 'EN_COURS',
            commentaire: `Plan généré automatiquement après le scan ${scanId}`,
          }
        });
      })
    );

    console.log(`✅ Plans de correction créés avec succès`);
  } catch (error) {
    console.error("Erreur création plans:", error);
  }
}

// ==================== ENVOI ALERTE ====================
async function sendScanCompletionAlert(scanId: string) {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { vulnerabilites: true }
    });

    if (!scan) return;

    const nbCritiques = scan.vulnerabilites.filter((v: any) => v.severite === 'CRITIQUE').length;

    await prisma.auditLog.create({
      data: {
        action: 'SCAN_COMPLETED' as any,
        entite: 'SCAN' as any,
        idEntite: scanId,
        details: {
          cible: scan.cible,
          outil: scan.outil,
          nbVulnerabilites: scan.vulnerabilites.length,
          nbCritiques
        }
      }
    });

    broadcastScanCompleted({
      scanId: scan.id,
      cible: scan.cible,
      nbVulnerabilites: scan.vulnerabilites.length,
      nbCritiques,
      message: nbCritiques > 0
        ? `🚨 Scan terminé : ${nbCritiques} vulnérabilité(s) critique(s)`
        : `✅ Scan terminé avec succès sur ${scan.cible}`
    });

  } catch (error) {
    console.error("Erreur envoi alerte:", error);
  }
}