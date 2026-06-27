#!/usr/bin/env python3
import sys
import json
import argparse
from datetime import datetime

def map_severity(sev: str) -> str:
    if not sev:
        return "MEDIUM"
    sev = str(sev).upper().strip()
    if sev in ["CRITICAL", "CRITIQUE", "C"]:
        return "CRITICAL"
    elif sev in ["HIGH", "ÉLEVÉ", "H"]:
        return "HIGH"
    elif sev in ["MEDIUM", "MOYEN", "M"]:
        return "MEDIUM"
    elif sev in ["LOW", "BAS", "L"]:
        return "LOW"
    return "MEDIUM"


# ====================== SIMULATEURS ENRICHIS ======================

def simulate_nuclei(target: str, scan_id: str):
    """Nuclei - Web & Network"""
    return {
        "status": "success",
        "scanner": "NUCLEI",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "Critical RCE in Nginx", "severite": "CRITICAL", "cveId": "CVE-2024-1234", "url": f"http://{target}/admin"},
            {"titre": "SQL Injection on Login", "severite": "HIGH", "cveId": "CVE-2023-5678", "url": f"http://{target}/login.php"},
            {"titre": "Reflected XSS", "severite": "HIGH", "url": f"http://{target}/search"},
            {"titre": "Missing Security Headers", "severite": "MEDIUM", "url": f"http://{target}/"},
            {"titre": "Directory Traversal", "severite": "HIGH", "cveId": "CVE-2024-1111"},
            {"titre": "Weak SSL/TLS Configuration", "severite": "MEDIUM"},
        ]
    }


def simulate_openvas(target: str, scan_id: str):
    """OpenVAS - Vulnérabilités Réseau & Infrastructure"""
    return {
        "status": "success",
        "scanner": "OPENVAS",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "SMBv1 Vulnerable (EternalBlue)", "severite": "CRITICAL", "cveId": "CVE-2017-0144"},
            {"titre": "Weak SSH Configuration (Password Auth)", "severite": "HIGH"},
            {"titre": "Outdated Apache Version", "severite": "MEDIUM"},
            {"titre": "Open RDP Port", "severite": "HIGH"},
            {"titre": "Firewall Misconfiguration", "severite": "HIGH", "description": "Règles firewall trop permissives"},
            {"titre": "DNS Zone Transfer Possible", "severite": "MEDIUM"},
            {"titre": "SNMP Community String Exposed", "severite": "HIGH"},
        ]
    }


def simulate_grype(target: str, scan_id: str):
    """Grype - Containers & Dépendances"""
    return {
        "status": "success",
        "scanner": "GRYPE",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "log4j-core Remote Code Execution", "severite": "CRITICAL", "cveId": "CVE-2021-44228"},
            {"titre": "Outdated OpenSSL", "severite": "HIGH", "cveId": "CVE-2022-0778"},
            {"titre": "Vulnerable Alpine Package", "severite": "HIGH"},
            {"titre": "Python Dependency with Known CVE", "severite": "MEDIUM"},
        ]
    }


def simulate_zap(target: str, scan_id: str):
    """OWASP ZAP - Tests Web Avancés"""
    return {
        "status": "success",
        "scanner": "ZAP",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "SQL Injection", "severite": "CRITICAL", "cveId": "CVE-2024-9999", "url": f"http://{target}/login"},
            {"titre": "Reflected XSS", "severite": "HIGH", "url": f"http://{target}/search"},
            {"titre": "Missing Anti-CSRF Token", "severite": "MEDIUM"},
            {"titre": "Phishing Page Detected", "severite": "HIGH", "description": "Page suspecte de phishing détectée"},
            {"titre": "Clickjacking Vulnerability", "severite": "MEDIUM"},
        ]
    }


def simulate_burp_suite(target: str, scan_id: str):
    """Burp Suite"""
    return {
        "status": "success",
        "scanner": "BURP_SUITE",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "Missing Security Headers", "severite": "MEDIUM"},
            {"titre": "Sensitive Data Exposure", "severite": "HIGH"},
            {"titre": "Insecure Deserialization", "severite": "CRITICAL"},
            {"titre": "Broken Authentication", "severite": "HIGH"},
        ]
    }


def simulate_trivy(target: str, scan_id: str):
    """Trivy - Scanner d'images & Infrastructure"""
    return {
        "status": "success",
        "scanner": "TRIVY",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "Critical Vulnerability in Base Image", "severite": "CRITICAL"},
            {"titre": "Vulnerable Alpine Package", "severite": "HIGH"},
            {"titre": "Secret Exposed in Docker Image", "severite": "HIGH"},
        ]
    }


def simulate_nessus(target: str, scan_id: str):
    """Nessus"""
    return {
        "status": "success",
        "scanner": "NESSUS",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "Critical Windows Vulnerability", "severite": "CRITICAL"},
            {"titre": "SSL Certificate Expired", "severite": "HIGH"},
            {"titre": "Unpatched Cisco Router", "severite": "HIGH"},
        ]
    }


def simulate_qualys(target: str, scan_id: str):
    """Qualys"""
    return {
        "status": "success",
        "scanner": "QUALYS",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "High Risk Vulnerability", "severite": "HIGH"},
            {"titre": "Phishing Domain Detected", "severite": "MEDIUM"},
        ]
    }


def simulate_manual(target: str, scan_id: str):
    """Scan Manuel"""
    return {
        "status": "success",
        "scanner": "MANUAL",
        "target": target,
        "scan_id": scan_id,
        "data": [
            {"titre": "Vulnérabilité manuelle ajoutée", "severite": "HIGH", "description": "Ajoutée manuellement par l'administrateur"}
        ]
    }


# ====================== MAIN ======================
def main():
    parser = argparse.ArgumentParser(description="Scanner Security Platform")
    parser.add_argument('--tool', required=True,
                       choices=['nuclei', 'openvas', 'grype', 'zap', 'burp_suite', 'trivy', 'nessus', 'qualys', 'manual'])
    parser.add_argument('--target', required=True)
    parser.add_argument('--scan-id', required=True)
    args = parser.parse_args()

    print(f"[Python] Scan simulé → Tool: {args.tool.upper()} | Cible: {args.target}", file=sys.stderr)

    try:
        if args.tool == "nuclei":
            output = simulate_nuclei(args.target, args.scan_id)
        elif args.tool == "openvas":
            output = simulate_openvas(args.target, args.scan_id)
        elif args.tool == "grype":
            output = simulate_grype(args.target, args.scan_id)
        elif args.tool == "zap":
            output = simulate_zap(args.target, args.scan_id)
        elif args.tool == "burp_suite":
            output = simulate_burp_suite(args.target, args.scan_id)
        elif args.tool == "trivy":
            output = simulate_trivy(args.target, args.scan_id)
        elif args.tool == "nessus":
            output = simulate_nessus(args.target, args.scan_id)
        elif args.tool == "qualys":
            output = simulate_qualys(args.target, args.scan_id)
        elif args.tool == "manual":
            output = simulate_manual(args.target, args.scan_id)
        else:
            raise ValueError(f"Tool non implémenté: {args.tool}")

        print(json.dumps(output, ensure_ascii=False, default=str))

    except Exception as e:
        error_output = {
            "status": "error",
            "scanner": args.tool.upper(),
            "target": args.target,
            "scan_id": args.scan_id,
            "error": str(e)
        }
        print(json.dumps(error_output))
        sys.exit(1)


if __name__ == "__main__":
    main()