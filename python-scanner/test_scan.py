import json
import pytest
from unittest.mock import patch, MagicMock
from scan import run_command, scan_grype, scan_nuclei, scan_openvas

# 1. Test de la commande générique de base
@patch("subprocess.run")
def test_run_command_success(mock_run):
    # Simuler un retour de commande réussi
    mock_response = MagicMock()
    mock_response.returncode = 0
    mock_response.stdout = "Succès"
    mock_response.stderr = ""
    mock_run.return_value = mock_response

    res = run_command(["ls"])
    assert res["success"] is True
    assert res["stdout"] == "Succès"

@patch("subprocess.run")
def test_run_command_exception(mock_run):
    mock_run.side_effect = Exception("Erreur système")
    res = run_command(["invalid_cmd"])
    assert res["success"] is False
    assert "Erreur système" in res["error"]

# 2. Test du module GRYPE
@patch("scan.run_command")
def test_scan_grype_success(mock_run_cmd):
    # Simuler une réponse JSON valide de Grype
    mock_run_cmd.return_value = {
        "success": True,
        "stdout": json.dumps({"matches": [{"vulnerability": {"id": "CVE-2026-1234"}, "artifact": {"name": "nginx"}}]}),
        "stderr": ""
    }
    res = scan_grype("nginx:latest")
    assert res["status"] == "success"
    assert res["scanner"] == "grype"

@patch("scan.run_command")
def test_scan_grype_invalid_json(mock_run_cmd):
    mock_run_cmd.return_value = {"success": True, "stdout": "pas du json", "stderr": ""}
    res = scan_grype("nginx:latest")
    assert res["status"] == "error"
    assert "JSON Grype invalide" in res["error"]

# 3. Test du module NUCLEI
@patch("scan.run_command")
def test_scan_nuclei_success(mock_run_cmd):
    # Nuclei retourne du JSON par ligne (NDJSON)
    line1 = json.dumps({"template-id": "ssl-vulnerability", "info": {"name": "Expired Cert", "severity": "high"}})
    mock_run_cmd.return_value = {"success": True, "stdout": line1, "stderr": ""}
    
    res = scan_nuclei("https://badssl.com")
    assert res["status"] == "success"
    assert len(res["data"]) == 1
    assert res["data"][0]["info"]["severity"] == "high"

# 4. Test du module OPENVAS
@patch("scan.run_command")
def test_scan_openvas_mock_fallback(mock_run_cmd):
    # Simuler l'absence de gvm-cli (retour success faux) pour déclencher le mock de secours
    mock_run_cmd.return_value = {"success": False, "stdout": "", "stderr": "command not found"}
    res = scan_openvas("192.168.10.50")
    assert res["status"] == "success"
    assert res["scanner"] == "openvas"
    assert res["data"]["results"][0]["cve"] == "CVE-2024-5678"
