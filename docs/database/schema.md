# 🗄️ Schéma de la Base de Données (Supabase)

La base de données du **FC TORO (SMG)** est hébergée sur [Supabase](https://supabase.com/) et utilise **PostgreSQL**.

## 📊 Tables Principales

Voici une vue d'ensemble structurée des tables clés qui gèrent la logique métier du club :

### 1. 🧑‍🤝‍🧑 `joueurs`
Contient toutes les informations relatives aux joueurs du club.
- `id` (UUID) : Identifiant unique du joueur.
- `nom`, `prenom` (String) : Identité du joueur.
- `date_naissance` (Date) : Permet de calculer automatiquement la catégorie (ex: U8, U17).
- `categorie` (String) : Catégorie actuelle (ex: Ti Toro).
- `statut` (String) : `Actif`, `Inactif`, `Blessé`, `Suspendu`.
- `matricule` (String) : Numéro d'identification unique généré automatiquement au format `FCT-XXXXX`.
- `photo_url` (String) : Lien vers la photo stockée dans Supabase Storage.

### 2. 👨‍👩‍👧 `parents`
Stocke les données des parents/tuteurs associés aux joueurs.
- `id` (UUID) : Identifiant unique du parent.
- `nom`, `prenom` (String) : Identité.
- `telephone`, `email` (String) : Coordonnées de contact.
- *Relation* : Un parent peut être lié à plusieurs joueurs via une table de jointure ou une référence matricule.

### 3. 👔 `employes` (Staff & Coachs)
Gère le personnel du club, incluant les entraîneurs et les administrateurs.
- `id` (UUID) : Identifiant unique de l'employé.
- `nom`, `prenom` (String) : Identité.
- `role` (String) : `Coach`, `Finance`, `Super Admin`, etc.
- `email` (String) : Utilisé pour la connexion (lié à Supabase Auth).
- `categories_gerees` (Array) : Catégories que l'entraîneur supervise.

### 4. 💰 `factures` & 💳 `paiements`
Gèrent le système financier bidevise (USD / HTG).
**Table `factures`** :
- `id` (UUID) : Identifiant de la facture.
- `joueur_id` (UUID) : Lien vers le joueur facturé.
- `montant` (Decimal) : Montant total dû.
- `devise` (String) : `USD` ou `HTG`.
- `statut` (String) : `Payée`, `Partielle`, `En attente`, `En retard`.

**Table `paiements`** :
- `id` (UUID) : Identifiant du paiement.
- `facture_id` (UUID) : Lien vers la facture concernée.
- `montant_paye` (Decimal) : Montant versé.
- `mode_paiement` (String) : `Espèces`, `Virement`, `Chèque`, `MonCash`.
- `date_paiement` (Date) : Date de la transaction.

### 5. 📅 `evenements`
Gestion du calendrier (Entraînements, Matchs, Réunions).
- `id` (UUID) : Identifiant de l'événement.
- `titre` (String) : Nom de l'événement.
- `type` (String) : `Entraînement`, `Match`, `Tournoi`.
- `date_debut`, `date_fin` (Timestamp) : Période.
- `lieu` (String) : Terrain ou adresse.

---
## 🔒 Sécurité des Données (Row Level Security - RLS)

Chaque table est protégée par les politiques **RLS (Row Level Security)** de PostgreSQL. Cela garantit que :
- Un Coach ne peut modifier que les données liées à son équipe.
- Le personnel de la Finance a accès complet aux tables `factures` et `paiements`.
- Un administrateur (Super Admin) possède les droits globaux (CRUD) sur toutes les entités.

---
> *Développé et maintenu par [OCTACORE](https://www.octacore.io/).*
