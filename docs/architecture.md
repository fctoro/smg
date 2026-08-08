# 🏗️ Architecture du Projet

Le **Système de Gestion FC TORO (SMG)** est une application web full-stack moderne conçue avec les dernières technologies pour garantir performance, sécurité et maintenabilité.

## 💻 Technologies et Langages

- **Langage Principal** : [TypeScript](https://www.typescriptlang.org/) (assure la sécurité des types et la robustesse du code)
- **Framework Frontend** : [Next.js 16 (App Router)](https://nextjs.org/) (permet le rendu côté serveur "SSR", le pré-rendu statique "SSG" et un routage ultra-performant)
- **Bibliothèque UI** : [React 19](https://react.dev/)
- **Style et Design** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Base de données** : [Supabase](https://supabase.com/) (PostgreSQL, Authentification, Storage, Row Level Security "RLS")

## 📂 Structure du Code Source (Dossier `src`)

Le dossier principal `src` contient l'ensemble du code de l'application :

```text
src/
├── app/                  # Routes de l'application (Next.js App Router)
│   ├── (admin)/          # Layout sécurisé pour les administrateurs (dashboard, joueurs, finances, etc.)
│   ├── (auth)/           # Pages d'authentification (login, reset-password)
│   ├── api/              # Endpoints API (génération PDF, vérification de doublons, etc.)
│   └── layout.tsx        # Layout racine
├── components/           # Composants React réutilisables
│   ├── club/             # Composants spécifiques à la logique métier (Dashboard, KPI)
│   ├── ui/               # Composants d'interface (Boutons, Modales, Tableaux, Badges)
│   └── header/           # Composants de navigation et profil utilisateur
├── lib/                  # Fonctions utilitaires (formatage, calculs)
│   ├── supabase/         # Configuration et client Supabase
│   ├── pdf/              # Logique de génération de fichiers PDF (reçus, rapports)
│   └── club/             # Utilitaires de gestion (métriques financières, monnaie locale)
├── layout/               # Composants de la structure globale (AppSidebar, AppHeader)
└── icons/                # Icônes SVG utilisés dans le projet
```

## 🔐 Sécurité & Authentification

- **Authentification Supabase** : Gère l'inscription, la connexion et les sessions.
- **Role-Based Access Control (RBAC)** : Les permissions et les accès (Finance, Coach, Super Admin) sont définis et vérifiés à la fois côté client et côté serveur (via RLS PostgreSQL dans Supabase).

## 📄 Génération de Documents

- **PDF-Lib & jsPDF** : Utilisés pour générer dynamiquement des reçus de paiement et des fiches de joueurs au format PDF.

---
> *Développé et maintenu par [OCTACORE](https://www.octacore.io/).*
