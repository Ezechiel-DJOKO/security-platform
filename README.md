# Security Platform

**Outil intégré d'audit et de gestion de la sécurité des systèmes d'information**  
*Ministère du Numérique - République du Bénin*

---

## Technologies utilisées

- **Next.js 16** (App Router)
- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Prisma ORM v7** + **PostgreSQL**
- **NextAuth.js v4** (JWT + RBAC)
- **Lucide React** (icônes)

---

## Fonctionnalités implémentées

- Authentification sécurisée avec rôles (Admin, Superviseur, Auditeur)
- Role-Based Access Control (RBAC) via middleware et composants
- Audit Trail complet (journalisation des actions utilisateurs)
- Structure du dashboard : Accueil, Inventaire des actifs, Conformité, Rapports
- Gestion des utilisateurs
- Architecture prête pour les scans de vulnérabilités et reporting

---

## Installation et démarrage

### Prérequis
- Node.js 20+
- PostgreSQL

### Étapes

```bash
# 1. Cloner le projet
git clone https://github.com/Ezechiel-DJOKO/security-platform.git
cd security-platform

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local

# 4. Appliquer les migrations Prisma
npx prisma migrate dev

# 5. Lancer le serveur de développement
npm run dev