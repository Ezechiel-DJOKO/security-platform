# python-scanner/scan.py
from gvm.connections import UnixSocketConnection, TLSConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeTransform
import sys
import json
import time

def launch_scan(target_ip: str, scan_name: str = "Scan from Security-Platform"):
    connection = UnixSocketConnection()  # ou TLSConnection si remote

    with Gmp(connection, transform=EtreeTransform()) as gmp:
        gmp.authenticate('admin', 'ton_mot_de_passe')

        # Créer ou récupérer un target
        target_id = gmp.create_target(name=f"Target-{target_ip}", hosts=target_ip).get('id')

        # Créer une tâche (task)
        task_id = gmp.create_task(
            name=scan_name,
            config_id="daba56c8-73ec-11df-a475-002264764cea",  # Full and fast
            target_id=target_id,
            scanner_id="08b69003-5fc2-4037-a479-93b440211c73"   # OpenVAS Default Scanner
        ).get('id')

        # Lancer le scan
        report_id = gmp.start_task(task_id).get('id')

        print(json.dumps({
            "status": "success",
            "task_id": task_id,
            "report_id": report_id,
            "target": target_ip
        }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Target IP requis"}))
        sys.exit(1)
    
    launch_scan(sys.argv[1])