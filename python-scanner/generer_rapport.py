import json
import csv
from datetime import datetime

# Simuler le chargement des données (remplacez par l'ouverture de votre fichier ou flux API)
donnees_plateforme = [
    # Collez ou chargez votre liste d'objets JSON ici
]

def extraire_vulnerabilites(data_list):
    liste_finale = []
    
    for scan in data_list:
        outil = scan.get("outil")
        statut_scan = scan.get("statut")
        
        # Récupérer les infos de l'actif (serveur, firewall, etc.)
        actif = scan.get("actif", {})
        nom_actif = actif.get("nom", "Inconnu")
        ip_actif = actif.get("adresseIP", "Inconnu")
        criticite_actif = actif.get("criticite", "Inconnu")
        
        # Récupérer l'utilisateur responsable du lancement
        user = scan.get("utilisateur", {})
        lance_par = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or "Inconnu"
        
        # Parcourir les vulnérabilités trouvées
        vulnerabilites = scan.get("vulnerabilites", [])
        for vulne in vulnerabilites:
            liste_finale.append({
                "Actif Cible": nom_actif,
                "Adresse IP": ip_actif,
                "Criticité Actif": criticite_actif,
                "Outil de Scan": outil,
                "ID Vulnérabilité (CVE)": vulne.get("cveId", "N/A"),
                "Titre de la Faille": vulne.get("titre", "N/A"),
                "Sévérité": vulne.get("severite", "INFO"),
                "Statut Remédiation": vulne.get("statut", "OUVERTE"),
                "Date Découverte": vulne.get("dateDecouverte", "N/A"),
                "Lancé Par": lance_par
            })
            
    return liste_finale

def exporter_en_csv(vulnerabilites, nom_fichier="tableau_de_bord_remediation.csv"):
    if not vulnerabilites:
        print("Aucune vulnérabilité à exporter.")
        return
        
    en-tetes = vulnerabilites[0].keys()
    
    try:
        # Configuration avec séparateur ';' et encodage utf-8-sig pour une compatibilité parfaite avec Excel
        with open(nom_fichier, mode="w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=en-tetes, delimiter=";")
            writer.writeheader()
            writer.writerows(vulnerabilites)
        print(f"✅ Tableau de bord généré avec succès : {nom_fichier}")
    except Exception as e:
        print(f"❌ Erreur lors de la génération du CSV : {e}")

if __name__ == "__main__":
    # 1. Extraction des données
    resultats = extraire_vulnerabilites(donnees_plateforme)
    
    # 2. Export au format Excel/CSV
    exporter_en_csv(resultats)
