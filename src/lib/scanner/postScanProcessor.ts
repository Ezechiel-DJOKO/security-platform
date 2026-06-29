// src/lib/scanner/postScanProcessor.ts
import { prisma } from '@/lib/prisma';
import { Severite, StatutVulnerabilite, StatutPlan, Priorite } from '@prisma/client';

interface RawVulnerability {
  cveId?: string;
  cve?: string;
  titre?: string;
  name?: string;
  description?: string;
  severite?: string;
  severity?: string;
  scoreCVSS?: number;
  cvss?: number;
  vecteurCVSS?: string;
  vector?: string;
  preuve?: string;
  solution?: string;
  recommandation?: string;
  impact?: string;
  threat?: string;
}

interface RawResults {
  data?: RawVulnerability[];
  vulnerabilities?: RawVulnerability[];
  results?: RawVulnerability[];
}

export async function processScanResults(scanId: string): Promise<{ mappingsCreated: number }> {
  console.log(`🔄 Post-traitement du scan ${scanId}`);

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { 
      actif: true, 
      vulnerabilites: true,
      utilisateur: true  // Pour récupérer qui a lancé le scan
    }
  });

  if (!scan) {
    console.error("Scan non trouvé");
    return { mappingsCreated: 0 };
  }

  if (scan.vulnerabilites.length === 0 && scan.resultatBrut) {
    await parseAndCreateVulnerabilities(scanId, scan.resultatBrut as RawResults, scan.lancerPar);
  }

  // Mise à jour dernierScan
  try {
    const now = new Date();
    await prisma.actif.update({
      where: { id: scan.idActif },
      data: { dernierScan: now }
    });
    console.log(`✅ dernierScan mis à jour pour ${scan.actif.nom}`);
  } catch (err: any) {
    console.error("❌ Erreur mise à jour dernierScan :", err.message);
  }

  console.log(`✅ Post-traitement terminé pour le scan ${scanId}`);
  return { mappingsCreated: 0 };
}

async function parseAndCreateVulnerabilities(
  scanId: string, 
  rawResults: RawResults,
  createdById: string   // ID de la personne qui a lancé le scan
) {
  const vulnerabilities = rawResults.data ||
                         rawResults.vulnerabilities ||
                         rawResults.results ||
                         (Array.isArray(rawResults) ? rawResults : []);

  const vulnArray = Array.isArray(vulnerabilities) ? vulnerabilities : [];

  console.log(`📥 Parsing de ${vulnArray.length} vulnérabilités brutes`);

  for (const vuln of vulnArray) {
    try {
      const rawSeverity = vuln.severite || vuln.severity || 'UNKNOWN';
      const severity = mapSeverity(rawSeverity);
      const cvssScore = vuln.scoreCVSS || vuln.cvss || 0;

      console.log(`Vuln: "${vuln.titre || vuln.name}" | Severity brute: "${rawSeverity}" → ${severity} | CVSS: ${cvssScore}`);

      // Création de la vulnérabilité
      const nouvelleVuln = await prisma.vulnerabilite.create({
        data: {
          idScan: scanId,
          cveId: vuln.cveId || vuln.cve || null,
          titre: vuln.titre || vuln.name || 'Vulnérabilité détectée',
          description: vuln.description || '',
          severite: severity,
          scoreCVSS: cvssScore,
          vecteurCVSS: vuln.vecteurCVSS || vuln.vector || null,
          statut: StatutVulnerabilite.OUVERTE,
          preuve: vuln.preuve || JSON.stringify(vuln),
          recommandation: vuln.recommandation || vuln.solution || "Appliquer les correctifs recommandés",
          risqueRelatif: calculateRiskScore(cvssScore),
          dateDecouverte: new Date(),
          impact: vuln.impact || vuln.threat || '',
        }
      });

      // Création automatique du plan pour CRITICAL et HIGH + assignation technicien
      // Création automatique du plan pour CRITICAL et HIGH
if (severity === Severite.CRITICAL || severity === Severite.HIGH) {
  const dateEcheance = calculerDateEcheance(severity);
  const priorite = severity === Severite.CRITICAL ? Priorite.CRITIQUE : Priorite.HAUTE;

  const plan = await prisma.planCorrection.create({
    data: {
      idVulnerabilite: nouvelleVuln.id,
      assigneA: createdById,
      priorite,
      dateEcheance,
      statut: StatutPlan.A_FAIRE,
      createdBy: createdById,
      commentaire: `Plan généré automatiquement après détection (${severity})`,
    },
    include: {
      assigne: {
        select: { id: true, nom: true, prenom: true, email: true }
      }
    }
  });

  console.log(`[PLAN CREATED] ID: ${plan.id} | assigneA: ${plan.assigneA} | Assigne:`, plan.assigne);

  // Mise à jour de la vulnérabilité
  await prisma.vulnerabilite.update({
    where: { id: nouvelleVuln.id },
    data: {
      statut: StatutVulnerabilite.EN_COURS,
      assigneA: createdById
    }
  });

  console.log(`✅ Plan de correction créé et assigné pour : ${nouvelleVuln.titre}`);
}
  

    } catch (err) {
      console.error("Erreur création vulnérabilité:", err);
    }
  }
}

// Calcul de la date d'échéance selon sévérité
function calculerDateEcheance(severite: Severite): Date {
  const jours = severite === Severite.CRITICAL ? 2 : 7; // 2 jours pour CRITICAL, 7 pour HIGH
  const date = new Date();
  date.setDate(date.getDate() + jours);
  return date;
}

// Mapping amélioré
function mapSeverity(sev?: string): Severite {
  console.log(`[MAP_SEVERITY] Entrée: "${sev}"`);
  
  const severityMap: Record<string, Severite> = {
    critical : Severite.CRITICAL,
    critique : Severite.CRITICAL,
    high     : Severite.HIGH,
    élevé    : Severite.HIGH,
    haute    : Severite.HIGH,
    medium   : Severite.MEDIUM,
    moyen    : Severite.MEDIUM,
    low      : Severite.LOW,
    faible   : Severite.LOW,
    bas      : Severite.LOW,
  };

  const key = (sev ?? '').toLowerCase().trim();
  const result = severityMap[key] ?? Severite.MEDIUM;
  
  console.log(`[MAP_SEVERITY] "${sev}" → key="${key}" → ${result}`);
  return result;
}

function calculateRiskScore(cvss: number): number {
  return Math.min(10, Math.max(0, (cvss || 0) * 0.8));
}