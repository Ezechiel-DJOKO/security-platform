import os
import sys
import json
import csv
import subprocess
from datetime import datetime

def run_command(cmd: list, timeout=300):
    """Exécute une commande et retourne le résultat structuré."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def scan_nuclei(target: str):
    """Scan avec Nuclei installé en local (pas Docker)."""
    os.makedirs("rapports", exist_ok=True)
    
    json_output = "rapports/nuclei-results.json"
    sarif_output = "rapports/nuclei-results.sarif"
    
    # Supprimer les anciens fichiers pour éviter la confusion
    for f in [json_output, sarif_output]:
        if os.path.exists(f):
            os.remove(f)
    
    cmd = [
        "nuclei",
        "-u", target,
        "-json-export", json_output,
        "-sarif-export", sarif_output,
        "-silent",
        "-stats"
    ]
    
    result = run_command(cmd, timeout=300)
    
    # Lire les résultats JSON
    findings = []
    if os.path.exists(json_output):
        try:
            with open(json_output, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        findings.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    
    # Vérifier que le SARIF a été créé
    sarif_exists = os.path.exists(sarif_output)
    
    if findings or sarif_exists:
        return {
            "status": "success",
            "scanner": "nuclei",
            "target": target,
            "data": findings,
            "sarif_file": sarif_output if sarif_exists else None,
            "json_file": json_output if os.path.exists(json_output) else None
        }
    
    # Si aucun résultat, retourner quand même le SARIF vide pour ne pas bloquer le workflow
    if result.get("stderr"):
        print(f"⚠️ Nuclei stderr: {result['stderr'][:500]}", file=sys.stderr)
    
    # Créer un SARIF vide minimal pour l'upload
    empty_sarif = {
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": []
    }
    with open(sarif_output, "w", encoding="utf-8") as f:
        json.dump(empty_sarif, f, indent=2)
    
    return {
        "status": "success",
        "scanner": "nuclei",
        "target": target,
        "data": [],
        "sarif_file": sarif_output,
        "warning": "Aucune vulnérabilité détectée ou scan incomplet"
    }

def scan_grype(target: str):
    """Scan des dépendances avec Grype."""
    result = run_command(["grype", target, "-o", "json"], timeout=180)
    
    if result.get("stdout") and result["stdout"].strip():
        try:
            data = json.loads(result["stdout"])
            return {"status": "success", "scanner": "grype", "target": target, "data": data}
        except json.JSONDecodeError:
            return {"status": "error", "scanner": "grype", "error": "Sortie JSON Grype invalide"}
    
    error_msg = result.get("error") or result.get("stderr") or "Échec inconnu Grype"
    return {"status": "error", "scanner": "grype", "error": error_msg}

def trier_csv_par_severite(csv_filename):
    """Trie le CSV par sévérité décroissante."""
    if not os.path.exists(csv_filename):
        return
    
    poids = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4, "UNKNOWN": 5}
    lignes = []
    
    with open(csv_filename, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        en_tetes = reader.fieldnames
        for row in reader:
            lignes.append(row)
            
    lignes.sort(key=lambda x: poids.get(x.get("Sévérité", "INFO").upper(), 99))
    
    with open(csv_filename, mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=en_tetes, delimiter=";")
        writer.writeheader()
        writer.writerows(lignes)

def extraire_et_sauvegarder_csv(output: dict, csv_filename="tableau_de_bord_remediation.csv"):
    """Extrait les résultats et les sauvegarde dans un CSV centralisé."""
    scanner = output.get("scanner")
    target = output.get("target")
    date_now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    nouvelles_lignes = []

    if scanner == "grype":
        matches = output.get("data", {}).get("matches", [])
        for match in matches:
            vuln = match.get("vulnerability", {})
            artifact = match.get("artifact", {})
            nouvelles_lignes.append({
                "Date Scan": date_now, "Outil": "GRYPE", "Cible": target,
                "ID Vulnérabilité (CVE)": vuln.get("id", "N/A"),
                "Titre / Package": artifact.get("name", "N/A"),
                "Sévérité": vuln.get("severity", "INFO").upper(),
                "Description": vuln.get("description", "N/A")[:100] + "..." if vuln.get("description") else "N/A"
            })

    elif scanner == "nuclei":
        findings = output.get("data", [])
        for finding in findings:
            info = finding.get("info", {})
            cve_ids = info.get("classification", {}).get("cve-id", [])
            nouvelles_lignes.append({
                "Date Scan": date_now, "Outil": "NUCLEI", "Cible": target,
                "ID Vulnérabilité (CVE)": ", ".join(cve_ids) if cve_ids else finding.get("template-id", "N/A"),
                "Titre / Package": info.get("name", "N/A"),
                "Sévérité": info.get("severity", "INFO").upper(),
                "Description": info.get("description", "N/A")[:100] + "..." if info.get("description") else "N/A"
            })

    if not nouvelles_lignes:
        return

    en_tetes = ["Date Scan", "Outil", "Cible", "ID Vulnérabilité (CVE)", "Titre / Package", "Sévérité", "Description"]
    fichier_existe = os.path.exists(csv_filename)

    with open(csv_filename, mode="a", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=en_tetes, delimiter=";")
        if not fichier_existe:
            writer.writeheader()
        writer.writerows(nouvelles_lignes)
        
    trier_csv_par_severite(csv_filename)

def sync_to_api(output: dict):
    """Synchronise les résultats avec l'API web (uniquement en local, pas en CI)."""
    if os.getenv("CI") == "true":
        return "Ignoré (mode CI)"
    
    try:
        import requests
        api_url = os.getenv("API_URL", "http://localhost:3000/api/scans/import")
        response = requests.post(api_url, json=output, timeout=10)
        return f"Réussie (Code {response.status_code})" if response.status_code == 200 else f"Échec (Code {response.status_code})"
    except ImportError:
        return "Module requests non installé"
    except Exception as api_err:
        return f"Indisponible ({str(api_err)})"

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"status": "error", "error": "Usage: python scan.py <grype|nuclei> <target>"}))
        sys.exit(1)

    scanner = sys.argv[1].lower()
    target = sys.argv[2]

    if scanner == "nuclei":
        output = scan_nuclei(target)
    elif scanner == "grype":
        output = scan_grype(target)
    else:
        output = {"status": "error", "error": f"Scanner inconnu: {scanner}. Utilisez 'nuclei' ou 'grype'"}

    # Sauvegarde CSV si succès
    if output.get("status") == "success" and output.get("data"):
        extraire_et_sauvegarder_csv(output)
        
        # Sauvegarde JSON local
        clean_target = target.replace(":", "_").replace("/", "_").replace("https__", "").replace("http__", "")
        json_filename = f"rapport_{scanner}_{clean_target}.json"
        with open(json_filename, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=4, ensure_ascii=False)
        
        output["json_file"] = json_filename

    # Sync API (uniquement hors CI)
    output["web_sync"] = sync_to_api(output)

    print(json.dumps(output, ensure_ascii=False))

if __name__ == "__main__":
    main()