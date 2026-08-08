-- Script pour ajouter les colonnes Statut et Periode à tblPaiements
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Vérifier d'abord le nom exact de la table
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%paiement%';

-- Ajouter la colonne Statut (avec guillemets doubles pour préserver la casse)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tblPaiements' 
        AND column_name = 'Statut'
    ) THEN
        ALTER TABLE "tblPaiements" ADD COLUMN "Statut" TEXT DEFAULT 'pending';
        RAISE NOTICE 'Colonne Statut ajoutée';
    ELSE
        RAISE NOTICE 'Colonne Statut existe déjà';
    END IF;
END $$;

-- Ajouter la colonne Periode
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tblPaiements' 
        AND column_name = 'Periode'
    ) THEN
        ALTER TABLE "tblPaiements" ADD COLUMN "Periode" TEXT;
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
SELECT 'Colonnes Statut et Periode ajoutées avec succès!' AS message;