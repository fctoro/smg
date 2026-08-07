-- Script pour mettre à jour la table tblPaiements avec les colonnes manquantes
-- Exécutez ce script dans l'éditeur SQL de Supabase

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

-- Afficher la structure mise à jour
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

-- Message de confirmation
SELECT 'Table tblPaiements mise à jour avec succès!' AS message;