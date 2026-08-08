-- Script pour vérifier et corriger le schéma de la table tblPaiements

-- 1. Vérifier les colonnes existantes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tblPaiements'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Si les colonnes Statut ou Periode n'existent pas, les ajouter
-- Décommentez les lignes ci-dessous si nécessaire :

-- ALTER TABLE tblPaiements ADD COLUMN IF NOT EXISTS "Statut" TEXT DEFAULT 'pending';
-- ALTER TABLE tblPaiements ADD COLUMN IF NOT EXISTS "Periode" TEXT;

-- 3. Vérifier les contraintes de la table
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_namespace n ON n.oid = c.connamespace 
WHERE conrelid = 'public.tblPaiements'::regclass;

-- 4. Afficher un exemple de données existantes
SELECT * FROM tblPaiements LIMIT 1;