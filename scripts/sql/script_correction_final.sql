-- Script FINAL pour ajouter les colonnes manquantes
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ÉTAPE 1: Vérifier le nom exact de la table (en minuscules)
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%paiement%';

-- ÉTAPE 2: Ajouter les colonnes en utilisant le nom en minuscules
DO $$ 
BEGIN
    -- Vérifier si la table existe en minuscules
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tblpaiements'
    ) THEN
        -- Ajouter Statut si elle n'existe pas
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tblpaiements' 
            AND column_name = 'statut'
        ) THEN
            ALTER TABLE tblpaiements ADD COLUMN statut TEXT DEFAULT 'pending';
            RAISE NOTICE '✅ Colonne statut ajoutée';
        END IF;
        
        -- Ajouter periode si elle n'existe pas
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tblpaiements' 
            AND column_name = 'periode'
        ) THEN
            ALTER TABLE tblpaiements ADD COLUMN periode TEXT;
            RAISE NOTICE '✅ Colonne periode ajoutée';
        END IF;
    END IF;
END $$;

-- ÉTAPE 3: Afficher la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'tblpaiements'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ Script terminé!' AS resultat;