-- Script pour ajouter la colonne Devise à tblEmployes
-- À exécuter dans l'éditeur SQL de la console Supabase

ALTER TABLE public."tblEmployes" 
ADD COLUMN IF NOT EXISTS "Devise" TEXT DEFAULT 'HTG';

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tblEmployes' AND column_name = 'Devise';
