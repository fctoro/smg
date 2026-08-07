-- Script complet pour corriger tblPaiements
-- Exécutez ce script dans Supabase SQL Editor

-- ============================================
-- 1. CORRECTION DES PERMISSIONS RLS POUR tblPaiements
-- ============================================

-- Désactiver RLS temporairement
ALTER TABLE "tblPaiements" DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Allow all operations" ON "tblPaiements";
DROP POLICY IF EXISTS "Enable read access for all users" ON "tblPaiements";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "tblPaiements";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "tblPaiements";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "tblPaiements";

-- Créer une politique qui permet tout (pour le développement)
CREATE POLICY "Allow all operations" ON "tblPaiements"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Réactiver RLS
ALTER TABLE "tblPaiements" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. AUGMENTER LA TAILLE DES CHAMPS Remarque ET Description
-- ============================================

-- Augmenter la taille du champ Remarque
ALTER TABLE "tblPaiements" ALTER COLUMN "Remarque" TYPE TEXT;

-- Augmenter la taille du champ Description
ALTER TABLE "tblPaiements" ALTER COLUMN "Description" TYPE TEXT;

-- ============================================
-- 3. VÉRIFICATION DES MODIFICATIONS
-- ============================================

-- Vérifier les colonnes
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'tblPaiements'
    AND (column_name = 'Remarque' OR column_name = 'Description')
ORDER BY ordinal_position;

-- Vérifier les politiques
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'tblPaiements';

SELECT '✅ tblPaiements corrigé: RLS + colonnes TEXT!' AS message;