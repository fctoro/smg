-- Script pour corriger les permissions de la table tblFacture
-- Exécutez ce script dans Supabase SQL Editor

-- Désactiver RLS temporairement
ALTER TABLE "tblFacture" DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
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

-- Vérifier les politiques
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'tblFacture';

SELECT '✅ Permissions corrigées pour tblFacture!' AS message;