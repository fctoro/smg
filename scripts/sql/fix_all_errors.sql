-- Script complet pour corriger les deux erreurs
-- Exécutez ce script dans Supabase SQL Editor

-- ============================================
-- 1. CORRECTION DES PERMISSIONS RLS POUR tblFacture
-- ============================================

-- Désactiver RLS temporairement
ALTER TABLE "tblFacture" DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes (y compris celle qui existe déjà)
DROP POLICY IF EXISTS "Allow all operations" ON "tblFacture";
DROP POLICY IF EXISTS "Enable read access for all users" ON "tblFacture";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "tblFacture";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "tblFacture";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "tblFacture";

-- Créer une politique qui permet tout (pour le développement)
CREATE POLICY "Allow all operations" ON "tblFacture"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Réactiver RLS
ALTER TABLE "tblFacture" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. AUGMENTER LA TAILLE DU CHAMP Remarque
-- ============================================

-- Augmenter la taille du champ Remarque pour accepter des textes plus longs
ALTER TABLE "tblFacture" ALTER COLUMN "Remarque" TYPE TEXT;

-- Vérifier les modifications
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'tblFacture'
    AND column_name = 'Remarque';

-- ============================================
-- 3. VÉRIFICATION DES POLITIQUES
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'tblFacture';

SELECT '✅ Toutes les corrections ont été appliquées!' AS message;