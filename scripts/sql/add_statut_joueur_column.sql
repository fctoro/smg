-- Colonne dédiée au statut personnalisé du joueur.
-- A exécuter une seule fois dans Supabase SQL Editor.
ALTER TABLE public."tblEtudiants"
ADD COLUMN IF NOT EXISTS "StatutJoueur" TEXT;

COMMENT ON COLUMN public."tblEtudiants"."StatutJoueur"
IS 'Statut personnalisé du joueur choisi dans le formulaire de paiement';
