-- Script pour corriger la table tblPaiements dans Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Vérifier si la table existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tblPaiements'
);

-- 2. Ajouter les colonnes manquantes si elles n'existent pas
-- Ces colonnes sont nécessaires pour le formulaire de paiement

-- Ajouter la colonne Statut si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tblPaiements' 
        AND column_name = 'Statut'
    ) THEN
        ALTER TABLE tblPaiements ADD COLUMN "Statut" TEXT DEFAULT 'pending';
        RAISE NOTICE 'Colonne Statut ajoutée';
    ELSE
        RAISE NOTICE 'Colonne Statut existe déjà';
    END IF;
END $$;

-- Ajouter la colonne Periode si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tblPaiements' 
        AND column_name = 'Periode'
    ) THEN
        ALTER TABLE tblPaiements ADD COLUMN "Periode" TEXT;
        RAISE NOTICE 'Colonne Periode ajoutée';
    ELSE
        RAISE NOTICE 'Colonne Periode existe déjà';
    END IF;
END $$;

-- 3. Afficher la structure complète de la table
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'tblPaiements'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Afficher les contraintes
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'public.tblPaiements'::regclass;

-- 5. Tester l'insertion d'un paiement de test (à commenter après test)
-- INSERT INTO tblPaiements (EtudiantId, DateTransact, ModePaiement, Remarque, Statut, Periode, MntPayeUS, MntPayeGd)
-- VALUES (1, NOW(), 'especes', 'test', 'pending', '2026-07', 100, 0);