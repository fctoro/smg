-- Script pour corriger le champ Remarque et Description dans tblPaiements
-- Exécutez ce script dans Supabase SQL Editor

-- ============================================
-- 1. AUGMENTER LA TAILLE DES CHAMPS Remarque ET Description
-- ============================================

-- Vérifier les colonnes existantes et leurs types
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'tblPaiements'
    AND (column_name = 'Remarque' OR column_name = 'Description')
ORDER BY ordinal_position;

-- Augmenter la taille du champ Remarque
ALTER TABLE "tblPaiements" ALTER COLUMN "Remarque" TYPE TEXT;

-- Augmenter la taille du champ Description
ALTER TABLE "tblPaiements" ALTER COLUMN "Description" TYPE TEXT;

-- Vérifier les modifications
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'tblPaiements'
    AND (column_name = 'Remarque' OR column_name = 'Description')
ORDER BY ordinal_position;

SELECT '✅ Champs Remarque et Description corrigés dans tblPaiements!' AS message;