# FC TORO - Système de Gestion du Club (SMG)

Système de gestion globale et tableau de bord administratif pour le **Football Club TORO (FC TORO)**.

> **Conçu et développé par [OCTACORE](https://www.octacore.io/).**

---

## ⚽ Présentation du Projet

Le **SMG FC TORO** est une plateforme sur-mesure de nouvelle génération. Elle permet d'administrer numériquement l'ensemble des activités du **FC TORO**, d'automatiser les processus métier et de fournir un espace de travail collaboratif pour le staff, les coachs et l'équipe administrative.

### 🌟 Fonctionnalités Clés
- **Gestion Complète des Joueurs** : Suivi des joueurs par catégories (Ti Toro, U8 à U18), historique, statuts et génération de cartes d'identité PDF.
- **Gestion du Staff & des Parents** : Profils dédiés pour les coachs, le personnel administratif et les parents/tuteurs.
- **Système Financier & Facturation** : Gestion bidevise (USD & HTG), factures, reçus de paiement automatiques en PDF et suivi des arriérés.
- **Agenda & Evénements** : Planification des entraînements, tournois et événements du club.
- **Tableaux de Bord Analytiques** : Métriques financières et statistiques sportives en temps réel.
- **Génération de PDF** : Reçus financiers et documents administratifs générés à la volée.

---

## 🚀 Équipe de Développement

Le projet a été pensé, conçu et développé intégralement par **OCTACORE**, une agence spécialisée dans le développement de solutions logicielles sur-mesure de haute performance.
- 🌐 **Site Web** : [www.octacore.io](https://www.octacore.io/)

---

## 🛠️ Stack Technologique (Architecture)

L'application repose sur une architecture moderne pour garantir scalabilité, performance et sécurité.

- **Framework** : [Next.js 16 (App Router)](https://nextjs.org/)
- **UI & Style** : [React 19](https://react.dev/), [Tailwind CSS V4](https://tailwindcss.com/)
- **Langage de Programmation** : [TypeScript](https://www.typescriptlang.org/) (Typage statique fort)
- **Base de données & Backend** : [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, RLS)
- **Outils & Bibliothèques** :
  - `pdf-lib` & `jspdf` (Génération PDF côté client & serveur)
  - `nodemailer` (Envoi de mails automatiques)
  - `recharts` (Visualisation des données graphiques)

---

## 📚 Documentation Détaillée

Pour consulter la documentation technique complète du projet de façon professionnelle, explorez le dossier `docs/` :

1. 📂 **[Architecture & Code Source](./docs/architecture.md)** : Détails sur la structure du projet Next.js.
2. 🗄️ **[Schéma de la Base de Données (Supabase)](./docs/database/schema.md)** : Modèles de données, tables et stratégies de sécurité (RLS).

---

## ⚙️ Installation & Lancement local

### Prérequis
- [Node.js](https://nodejs.org/) (Version >= 18)
- Clés d'API Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Étapes

1. Clonez le projet et installez les dépendances :
   ```bash
   npm install
   ```

2. Configurez vos variables d'environnement dans un fichier `.env.local` :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=votre_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_publique
   SUPABASE_SERVICE_ROLE_KEY=votre_cle_secrete
   ```

3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

4. Créez un build de production :
   ```bash
   npm run build
   ```

---

## 📄 Licence & Crédits

**Copyright (c) 2026 FC TORO.**  
Plateforme conçue, développée et maintenue par [OCTACORE](https://www.octacore.io/). Tous droits réservés.  
Distribué sous licence MIT.
