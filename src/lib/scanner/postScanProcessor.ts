// src/lib/scanner/postScanProcessor.ts

import { prisma } from '@/lib/prisma';
import { applyAutoMappingBulk } from '@/lib/mapping/vulnerabilityMappingService';

export async function processScanResults(scanId: string) {
  console.log(`🔄 Post-traitement du scan ${scanId}...`);

  // Récupérer toutes les vulnérabilités liées à ce scan
  const vulnerabilites = await prisma.vulnerabilite.findMany({
    where: { idScan: scanId },
    select: { id: true, titre: true },
  });

  if (vulnerabilites.length === 0) {
    console.log("Aucune vulnérabilité trouvée pour ce scan.");
    return;
  }

  console.log(`${vulnerabilites.length} vulnérabilités à traiter...`);

  // Appliquer le mapping automatique en batch
  const mappingResults = await applyAutoMappingBulk(
    vulnerabilites.map(v => v.id)
  );

  const totalMappings = mappingResults.reduce((sum, r) => sum + r.mappingsCreated, 0);

  console.log(`✅ Post-traitement terminé : ${totalMappings} mappings ISO 27001 créés.`);

  return {
    scanId,
    vulnerabilitesCount: vulnerabilites.length,
    mappingsCreated: totalMappings,
    details: mappingResults,
  };
}