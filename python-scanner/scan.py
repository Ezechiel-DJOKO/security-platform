# python-scanner/scan.py
import os
import sys
import json
import time
from gvm.connections import UnixSocketConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeTransform
from gvm.exceptions import GvmError

def get_env_variable(var_name: str, default=None):
    value = os.getenv(var_name)
    if value is None and default is None:
        raise ValueError(f"Variable d'environnement {var_name} non définie")
    return value or default

def launch_scan(target_ip: str, scan_name: str = "Scan from Security-Platform"):
    try:
        # Connexion à OpenVAS/GVM
        connection = UnixSocketConnection()  # Utilise le socket Unix (recommandé en local)

        with Gmp(connection, transform=EtreeTransform()) as gmp:
            # Authentification avec variables d'environnement
            username = get_env_variable("OPENVAS_USERNAME", "admin")
            password = get_env_variable("OPENVAS_PASSWORD")
            
            gmp.authenticate(username, password)

            # Créer ou récupérer le target
            target_response = gmp.create_target(
                name=f"Target-{target_ip}-{int(time.time())}",
                hosts=target_ip
            )
            target_id = target_response.get('id')

            # Créer la tâche (task)
            task_response = gmp.create_task(
                name=scan_name,
                config_id="daba56c8-73ec-11df-a475-002264764cea",  # Full and fast
                target_id=target_id,
                scanner_id="08b69003-5fc2-4037-a479-93b440211c73"   # OpenVAS Default Scanner
            )
            task_id = task_response.get('id')

            # Lancer le scan
            report_response = gmp.start_task(task_id)
            report_id = report_response.get('id')

            result = {
                "status": "success",
                "task_id": task_id,
                "report_id": report_id,
                "target": target_ip,
                "message": "Scan lancé avec succès"
            }
            
            print(json.dumps(result))
            return result

    except GvmError as e:
        error_result = {
            "status": "error",
            "error": str(e),
            "target": target_ip
        }
        print(json.dumps(error_result))
        return error_result
    except Exception as e:
        error_result = {
            "status": "error",
            "error": f"Erreur inattendue: {str(e)}",
            "target": target_ip
        }
        print(json.dumps(error_result))
        return error_result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "Target IP requis en argument"}))
        sys.exit(1)
    
    target = sys.argv[1]
    launch_scan(target)