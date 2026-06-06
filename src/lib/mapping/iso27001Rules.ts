// src/lib/mapping/iso27001Rules.ts

export type MappingRule = {
  keywords: string[];
  controls: Array<{
    code: string;
    niveauPertinence: number;     // 0-100
    justification: string;
  }>;
  severityBoost?: boolean;
  cwe?: string[];                // Pour matcher sur CWE si disponible plus tard
};

export const iso27001MappingRules: MappingRule[] = [
  // ====================== INJECTIONS ======================
  {
    keywords: ["sql injection", "sqli", "injection sql", "blind sql"],
    controls: [
      { code: "8.26", niveauPertinence: 95, justification: "Sécurité des applications web - Protection contre les injections" },
      { code: "8.5", niveauPertinence: 85, justification: "Validation et assainissement des entrées" },
      { code: "8.14", niveauPertinence: 75, justification: "Sécurité des systèmes de développement" },
    ],
    severityBoost: true,
  },

  // ====================== XSS & CLIENT-SIDE ======================
  {
    keywords: ["xss", "cross site scripting", "reflected xss", "stored xss", "dom xss"],
    controls: [
      { code: "8.26", niveauPertinence: 92, justification: "Sécurité des applications web" },
      { code: "8.23", niveauPertinence: 80, justification: "Filtrage des contenus et protection contre les attaques web" },
    ],
    severityBoost: true,
  },

  // ====================== AUTHENTIFICATION ======================
  {
    keywords: ["weak password", "mot de passe faible", "bruteforce", "credential stuffing", "password spray", "default password"],
    controls: [
      { code: "8.5", niveauPertinence: 94, justification: "Authentification sécurisée" },
      { code: "8.3", niveauPertinence: 88, justification: "Gestion des informations d'identification" },
      { code: "8.2", niveauPertinence: 75, justification: "Privilèges des utilisateurs" },
    ],
    severityBoost: true,
  },

  // ====================== GESTION DES VULNÉRABILITÉS ======================
  {
    keywords: ["unpatched", "patch", "mise à jour manquante", "outdated", "vulnerable version", "cve"],
    controls: [
      { code: "8.8", niveauPertinence: 93, justification: "Gestion des vulnérabilités techniques" },
      { code: "8.15", niveauPertinence: 82, justification: "Gestion des vulnérabilités" },
      { code: "8.9", niveauPertinence: 70, justification: "Configuration sécurisée des systèmes" },
    ],
  },

  // ====================== CONFIGURATION & HARDENING ======================
  {
    keywords: ["misconfiguration", "mauvaise configuration", "default config", "insecure configuration", "exposed"],
    controls: [
      { code: "8.9", niveauPertinence: 90, justification: "Configuration de la sécurité" },
      { code: "8.21", niveauPertinence: 78, justification: "Gestion de la configuration" },
    ],
  },

  // ====================== ACCÈS & AUTORISATION ======================
  {
    keywords: ["authorization", "broken access control", "idor", "insecure direct object reference", "privilege escalation"],
    controls: [
      { code: "8.4", niveauPertinence: 95, justification: "Contrôle d'accès aux systèmes et applications" },
      { code: "8.1", niveauPertinence: 80, justification: "Gestion des utilisateurs" },
    ],
    severityBoost: true,
  },

  // ====================== CRYPTOGRAPHIE ======================
  {
    keywords: ["tls", "ssl", "weak cipher", "certificate", "encryption", "chiffrement faible", "http"],
    controls: [
      { code: "8.16", niveauPertinence: 90, justification: "Cryptographie" },
      { code: "8.24", niveauPertinence: 85, justification: "Utilisation de la cryptographie" },
    ],
  },

  // ====================== JOURNALISATION & MONITORING ======================
  {
    keywords: ["log", "journalisation", "monitoring", "audit trail", "insufficient logging"],
    controls: [
      { code: "8.12", niveauPertinence: 88, justification: "Journalisation et surveillance" },
      { code: "8.15", niveauPertinence: 75, justification: "Journalisation et surveillance" },
    ],
  },

  // ====================== SAUVEGARDE & CONTINUITÉ ======================
  {
    keywords: ["backup", "sauvegarde", "restore", "ransomware"],
    controls: [
      { code: "8.11", niveauPertinence: 85, justification: "Sauvegarde des données" },
    ],
  },

  // ====================== MALWARE & ANTIVIRUS ======================
  {
    keywords: ["malware", "virus", "trojan", "ransomware", "phishing"],
    controls: [
      { code: "8.7", niveauPertinence: 90, justification: "Protection contre les logiciels malveillants" },
    ],
  },

  // ====================== RÉSEAUX ======================
  {
    keywords: ["open port", "port ouvert", "exposed service", "firewall"],
    controls: [
      { code: "8.19", niveauPertinence: 85, justification: "Sécurité des réseaux" },
      { code: "8.20", niveauPertinence: 70, justification: "Services de réseau" },
    ],
  },
];

// Interface pour la vulnérabilité en entrée
export interface VulnerabilityInput {
  titre: string;
  description?: string;
  severite?: string;
  cveId?: string;
}

// Interface pour la suggestion de contrôle
export interface ControlSuggestion {
  controleCode: string;
  niveauPertinence: number;
  justification: string;
}

export function getSuggestedControls(vuln: VulnerabilityInput): ControlSuggestion[] {
  const text = `${vuln.titre} ${vuln.description || ""} ${vuln.cveId || ""}`.toLowerCase();
  const suggestions: ControlSuggestion[] = [];

  for (const rule of iso27001MappingRules) {
    const match = rule.keywords.some(kw => text.includes(kw.toLowerCase()));

    if (match) {
      for (const ctrl of rule.controls) {
        let score = ctrl.niveauPertinence;

        if (rule.severityBoost && ["HIGH", "CRITICAL"].includes(vuln.severite || "")) {
          score = Math.min(100, score + 12);
        }

        suggestions.push({
          controleCode: ctrl.code,
          niveauPertinence: score,
          justification: ctrl.justification,
        });
      }
    }
  }

  // Déduplication + meilleur score
  const unique = new Map<string, ControlSuggestion>();
  for (const sug of suggestions) {
    const existing = unique.get(sug.controleCode);
    if (!existing || existing.niveauPertinence < sug.niveauPertinence) {
      unique.set(sug.controleCode, sug);
    }
  }

  return Array.from(unique.values());
}