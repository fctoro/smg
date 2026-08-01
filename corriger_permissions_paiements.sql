-- Script pour corriger les permissions de la table tblPaiements
-- Exécutez ce script dans Supabase SQL Editor

-- Désactiver RLS temporairement pour permettre les insertions
ALTER TABLE "tblPaiements" DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
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
WHERE tablename = 'tblPaiements';

SELECT '✅ Permissions corrigées! Vous pouvez maintenant ajouter des paiements.' AS message;