import sys
import time
import requests

def main():
    if len(sys.argv) < 4:
        print("❌ Paramètres manquants.")
        sys.exit(1)

    scan_id = sys.argv[1]
    outil = sys.argv[2].upper()
    target = sys.argv[3]
    
    app_url = "http://localhost:3000/api/scans/update"

    print(f"🚀 Début du scan {scan_id} ({outil}) sur {target}")

    # 1. Signaler à Next.js que le scan commence
    requests.post(app_url, json={"scanId": scan_id, "statut": "EN_COURS"})

    # 2. Simulation du scan
    time.sleep(3) 
    
    # 3. Faux résultats selon l'outil
    vulnerabilities = [
        {"cveId": "CVE-2026-9999", "titre": f"Faille critique détectée par {outil}", "severite": "CRITICAL"}
    ]

    # 4. Envoyer les résultats finaux à Next.js
    payload = {
        "scanId": scan_id,
        "statut": "TERMINE",
        "duree": 3,
        "vulnerabilities": vulnerabilities
    }
    
    response = requests.post(app_url, json=payload)
    if response.status_code == 200:
        print(f"✅ Résultats envoyés avec succès pour le scan {scan_id} !")
    else:
        print("❌ Échec de l'envoi des résultats.")

if __name__ == "__main__":
    main()
