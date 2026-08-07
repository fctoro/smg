-- Script FINAL pour ajouter les colonnes manquantes à tblPaiements
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ÉTAPE 1: Vérifier le nom exact de la table
SELECT 
    table_name, 
    table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name ILIKE '%paiement%';

-- ÉTAPE 2: Ajouter la colonne Statut (avec guillemets pour préserver la casse)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tblPaiements' 
        AND column_name = 'Statut'
    ) THEN
        ALTER TABLE "tblPaiements" ADD COLUMN "Statut" TEXT DEFAULT 'pending';
        RAISE NOTICE '✅ Colonne Statut ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne Statut existe déjà';
    END IF;
END $$;

-- ÉTAPE 3: Ajouter la colonne Periode
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tblPaiements' 
        AND column_name = 'Periode'
    ) THEN
        ALTER TABLE "tblPaiements" ADD COLUMN "Periode" TEXT;
        RAISE NOTICE '✅ Colonne Periode ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne Periode existe déjà';
    END IF;
END $$;

-- ÉTAPE 4: Vérifier la structure finale
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'tblPaiements'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Message final
SELECT '✅ Script exécuté avec succès! Les colonnes Statut et Periode sont maintenant disponibles.' AS resultat;