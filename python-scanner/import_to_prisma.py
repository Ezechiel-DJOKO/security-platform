#!/usr/bin/env python3
"""
Import automatique des résultats de scan vers Prisma
"""
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from prisma import Prisma, enums

# Configuration
RAPPORTS_DIR = Path("python-scanner/rapports")
RAPPORTS_DIR.mkdir(parents=True, exist_ok=True)

def map_severity(severity: str) -> str:
    mapping = {
        "critical": "CRITICAL",
        "high": "HIGH",
        "medium": "MEDIUM",
        "low": "LOW",
        "info": "LOW"
    }
    return mapping.get(severity.lower(), "MEDIUM")


async def import_nuclei_results(db: Prisma, scan_id: str):
    """Importe les résultats Nuclei"""
    file_path = RAPPORTS_DIR / "nuclei-results.json"
    
    if not file_path.exists():
        print(f"⚠️ Fichier non trouvé : {file_path}")
        return 0

    with open(file_path, 'r', encoding='utf-8') as f:
        results = json.load(f)

    count = 0
    for item in results:
        try:
            info = item.get("info", {})
            
            vuln = await db.vulnerabilite.create(
                data={
                    "idScan": scan_id,
                    "cveId": item.get("cve_id") or item.get("template-id"),
                    "titre": info.get("name", "Vulnérabilité Nuclei"),
                    "description": info.get("description"),
                    "severite": enums.Severite[map_severity(info.get("severity", "MEDIUM"))],
                    "scoreCVSS": info.get("classification", {}).get("cvss-score"),
                    "vecteurCVSS": info.get("classification", {}).get("cvss-vector"),
                    "preuve": json.dumps(item.get("matched-at", [])),
                    "recommandation": info.get("remediation"),
                    "risqueRelatif": None,  # Calculé côté Next.js
                    "statut": enums.StatutVulnerabilite.OUVERTE,
                }
            )
            count += 1
            print(f"✅ Importée : {vuln.titre} [{vuln.severite}]")
        except Exception as e:
            print(f"❌ Erreur import : {e}")

    return count


async def main():
    print("🚀 Démarrage de l'import des vulnérabilités vers Prisma...")

    scan_id = os.getenv("CURRENT_SCAN_ID")
    if not scan_id:
        scan_id = "00000000-0000-0000-0000-000000000000"  # Scan par défaut
        print(f"⚠️ Aucun CURRENT_SCAN_ID fourni, utilisation de l'ID par défaut.")

    db = Prisma()
    await db.connect()

    try:
        imported = await import_nuclei_results(db, scan_id)
        print(f"\n🎉 Import terminé : {imported} vulnérabilités importées.")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())