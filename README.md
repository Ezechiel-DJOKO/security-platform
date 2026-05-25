# Security Platform

**Outil intégré d'audit de sécurité — Ministère du Numérique**

Plateforme moderne de gestion de la sécurité des systèmes d'information.

## Technologies

- **Next.js 16** (App Router) + React 19
- **TypeScript**
- **Tailwind CSS v4**
- **Prisma ORM v7** + **PostgreSQL**
- **NextAuth.js v4** (JWT + Middleware RBAC)
- **Lucide React** (icônes)

## Fonctionnalités implémentées

- Authentification sécurisée avec rôles (Admin, Superviseur, Auditeur)
- Role-Based Access Control (RBAC) via middleware et composants
- Audit Trail complet (journalisation des actions)
- Structure des pages : Dashboard, Inventaire, Conformité, Rapports
- Modèles Prisma : Utilisateurs, Actifs, Vulnérabilités, Scans, etc.

## Installation

```bash
# Cloner le projet
git clone https://github.com/Ezechiel-DJOKO/security-platform.git
cd security-platform

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local

# Appliquer les migrations Prisma
npx prisma migrate dev

# Lancer le serveur de développement
npm run dev