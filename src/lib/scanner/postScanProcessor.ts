// src/lib/scanner/postScanProcessor.ts
import { prisma } from '@/lib/prisma';
import { Severite, StatutVulnerabilite } from '@prisma/client';

interface OpenvasVulnerability {
  name: string;
  description?: string;
  severity: string;
  cvss?: number;
  cve?: string;
  solution?: string;
  vector?: string;           // ← Ajouté
  threat?: string;
  port?: string | number;
  host?: string;
  // Ajoute d'autres champs selon la structure réelle de tes rapports OpenVAS
  [key: string]: any;        // Pour plus de flexibilité
}

export async function processScanResults(scanId: string) {
  console.log(`🔄 Post-traitement du scan ${scanId}`);

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { actif: true }
  });

  if (!scan?.resultatBrut) {
    console.warn("Aucun résultat brut trouvé pour le post-traitement");
    return;
  }

  const rawResults = scan.resultatBrut as any;
  
  // Adaptation selon la structure réelle des résultats OpenVAS
  const vulnerabilities: OpenvasVulnerability[] = 
    rawResults.vulnerabilities || 
    rawResults.results || 
    rawResults || 
    [];

  console.log(`📊 ${vulnerabilities.length} vulnérabilités à traiter`);

  for (const vuln of vulnerabilities) {
    const severite = mapSeverity(vuln.severity);

    await prisma.vulnerabilite.create({
      data: {
        idScan: scanId,
        cveId: vuln.cve,
        titre: vuln.name || 'Vulnérabilité OpenVAS',
        description: vuln.description,
        severite,
        scoreCVSS: vuln.cvss,
        vecteurCVSS: vuln.vector || null,           // ← Maintenant sécurisé
        statut: StatutVulnerabilite.OUVERTE,
        preuve: JSON.stringify(vuln),
        recommandation: vuln.solution || "Appliquer les correctifs recommandés par OpenVAS",
        risqueRelatif: calculateRiskScore(vuln.cvss || 0),
        dateDecouverte: new Date(),
        impact: vuln.threat || undefined
      }
    });

    // Mapping avec contrôles conformité
    // await mapToControls(createdVuln.id); // décommente si tu veux le mapping auto
  }

  console.log(`✅ Post-traitement terminé pour le scan ${scanId}`);
}

function mapSeverity(severity: string): Severite {
  const s = (severity || '').toLowerCase();
  if (s.includes('critical') || s.includes('high')) return Severite.CRITICAL;
  if (s.includes('medium')) return Severite.HIGH;
  if (s.includes('low')) return Severite.MEDIUM;
  return Severite.LOW;
}

function calculateRiskScore(cvss: number): number {
  return Math.min(10, Math.max(0, (cvss || 0) * 0.8));
}

// Optionnel : Mapping avec contrôles ISO27001
async function mapToControls(vulnerabiliteId: string) {
  const controls = await prisma.controlConformite.findMany({
    where: { referentiel: 'ISO27001' },
    take: 5 // limite pour ne pas créer trop d'entrées
  });

  for (const control of controls) {
    await prisma.vulnerabiliteControl.create({
      data: {
        vulnerabiliteId,
        controleId: control.id,
        niveauPertinence: 65,
        sourceMapping: "AUTO"
      }
    });
  }
}