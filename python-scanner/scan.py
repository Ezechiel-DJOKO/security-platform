#!/usr/bin/env python3
import sys
import json
import argparse
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(description="Scanner Security Platform")
    parser.add_argument('--tool', required=True, choices=['nuclei', 'openvas', 'grype'])
    parser.add_argument('--target', required=True)
    parser.add_argument('--scan-id', required=True)
    args = parser.parse_args()

    print(f"[Python] Scan démarré → Tool: {args.tool.upper()} | Cible: {args.target} | ID: {args.scan_id}", 
          file=sys.stderr)

    try:
        if args.tool == "nuclei":
            output = simulate_nuclei(args.target, args.scan_id)
        elif args.tool == "openvas":
            output = simulate_openvas(args.target, args.scan_id)
        elif args.tool == "grype":
            output = simulate_grype(args.target, args.scan_id)
        else:
            raise ValueError(f"Tool inconnu: {args.tool}")

        # Sortie JSON propre (obligatoire pour scan.ts)
        print(json.dumps(output, ensure_ascii=False))

    except Exception as e:
        error_output = {
            "status": "error",
            "scanner": args.tool,
            "target": args.target,
            "scan_id": args.scan_id,
            "error": str(e)
        }
        print(json.dumps(error_output))
        sys.exit(1)


def simulate_nuclei(target: str, scan_id: str):
    return {
        "status": "success",
        "scanner": "NUCLEI",
        "target": target,
        "scan_id": scan_id,
        "findings": 12,
        "data": [
            {
                "id": "CVE-2024-1234",
                "titre": "Critical RCE in Nginx",
                "description": "Remote Code Execution vulnerability detected",
                "severite": "CRITICAL",
                "scoreCVSS": 9.8,
                "cveId": "CVE-2024-1234",
                "preuve": "nuclei template matched"
            },
            {
                "id": "CVE-2023-5678",
                "titre": "SQL Injection",
                "description": "Possible SQL injection on login page",
                "severite": "HIGH",
                "scoreCVSS": 8.2,
                "cveId": "CVE-2023-5678"
            }
        ]
    }


def simulate_openvas(target: str, scan_id: str):
    return {
        "status": "success",
        "scanner": "OPENVAS",
        "target": target,
        "scan_id": scan_id,
        "findings": 7,
        "data": [
            {
                "id": "OV-001",
                "titre": "Open Port with Weak Service",
                "description": "Port 445 (SMB) exposed with weak configuration",
                "severite": "HIGH",
                "scoreCVSS": 7.5,
                "cveId": None
            }
        ]
    }


def simulate_grype(target: str, scan_id: str):
    return {
        "status": "success",
        "scanner": "GRYPE",
        "target": target,
        "scan_id": scan_id,
        "findings": 15,
        "data": [
            {
                "id": "GHSA-xyz",
                "titre": "Vulnerable Docker Image",
                "description": "Container contains critical vulnerability",
                "severite": "CRITICAL",
                "scoreCVSS": 9.1,
                "cveId": "CVE-2025-9999"
            }
        ]
    }


if __name__ == "__main__":
    main()