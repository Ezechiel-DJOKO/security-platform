import os
import sys
import json
import subprocess
import requests
from datetime import datetime
from typing import Dict, Any

def run_command(cmd: list, timeout=1800):
    """Exécute une commande avec timeout"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout exceeded"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def update_scan_status(scan_id: str, status: str, error: str = None):
    """Met à jour le statut du scan via l'API (étape importante du diagramme)"""
    try:
        api_url = os.getenv("API_URL", "http://localhost:3000/api")
        payload = {"statut": status}
        if error:
            payload["erreur"] = error
        
        requests.patch(f"{api_url}/scans/{scan_id}/status", json=payload, timeout=10)
        print(f"📡 Statut mis à jour: {status}")
    except Exception as e:
        print(f"⚠️ Impossible de mettre à jour le statut: {e}")

def send_results_to_api(scan_id: str, output: Dict[str, Any]):
    """Envoie les résultats complets vers l'API d'import"""
    try:
        api_url = os.getenv("API_URL", "http://localhost:3000/api")
        response = requests.post(
            f"{api_url}/scans/{scan_id}/import",
            json=output,
            timeout=30
        )
        
        if response.status_code in (200, 201):
            print(f"✅ Résultats importés avec succès vers Prisma")
            return True
        else:
            print(f"❌ Échec import - Code {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi des résultats: {e}")
        return False

def scan_openvas(target: str, scan_id: str):
    """Scanner OpenVAS - conforme au diagramme"""
    update_scan_status(scan_id, "EN_COURS")
    
    os.makedirs("rapports", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"rapports/openvas_{scan_id}_{timestamp}.xml"
    
    # À adapter selon ton installation OpenVAS / Greenbone (gvm-cli ou omp)
    # Exemple simplifié (à remplacer par ta vraie commande)
    cmd = ["gvm-cli", "socket", "--xml", f"""
        <create_task>
            <name>Scan_{scan_id}</name>
            <target><hosts>{target}</hosts></target>
            <config id="daba56c8-73ec-11df-a475-002264764cea"/>
        </create_task>
    """]  # ID de config à adapter

    print(f"🚀 Lancement du scan OpenVAS sur {target}...")
    result = run_command(cmd, timeout=1800)

    if not result["success"]:
        update_scan_status(scan_id, "ECHEC", result.get("stderr", "Erreur OpenVAS"))
        return {"status": "error", "scanner": "openvas", "error": result.get("stderr")}

    # Simulation des résultats pour le moment (à remplacer par parsing réel du rapport XML)
    findings = [
        {
            "name": "Exemple de vulnérabilité critique",
            "description": "Vulnérabilité détectée par OpenVAS",
            "severity": "CRITICAL",
            "cvss": 9.8,
            "cve_id": "CVE-2024-XXXX",
        }
    ] if result["success"] else []

    return {
        "status": "success",
        "scanner": "openvas",
        "target": target,
        "scan_id": scan_id,
        "report_file": report_file,
        "data": findings,
        "raw_stdout": result.get("stdout", "")[:1000]
    }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"status": "error", "error": "Usage: python scan.py <openvas|nuclei|grype> <target> [scan_id]"}))
        sys.exit(1)

    scanner = sys.argv[1].lower()
    target = sys.argv[2]
    scan_id = sys.argv[3] if len(sys.argv) > 3 else f"scan_{int(datetime.now().timestamp())}"

    print(f"🔍 Démarrage du scan {scanner} - ID: {scan_id} - Cible: {target}")

    if scanner == "openvas":
        output = scan_openvas(target, scan_id)
    elif scanner == "nuclei":
        # Tu peux remettre ta fonction nuclei ici
        output = {"status": "error", "error": "Nuclei non encore adapté dans cette version"}
    elif scanner == "grype":
        output = {"status": "error", "error": "Grype non encore adapté dans cette version"}
    else:
        output = {"status": "error", "error": f"Scanner inconnu: {scanner}"}

    # === Envoi des résultats vers l'API (clé du diagramme) ===
    if output.get("status") == "success":
        success = send_results_to_api(scan_id, output)
        if success:
            update_scan_status(scan_id, "TERMINE")
        else:
            update_scan_status(scan_id, "ECHEC", "Échec de l'import Prisma")

    # Sauvegarde locale du rapport
    json_filename = f"rapport_{scanner}_{scan_id}.json"
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4, ensure_ascii=False)

    print(json.dumps(output, ensure_ascii=False))

if __name__ == "__main__":
    main()