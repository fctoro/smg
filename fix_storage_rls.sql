-- Script pour corriger les permissions RLS du storage Supabase
-- Exécutez ce script dans Supabase SQL Editor

-- ============================================
-- 1. CRÉER UN BUCKET POUR LES PHOTOS DE PAIEMENT (s'il n'existe pas)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-photos',
    'payment-photos',
    true,
    5242880, -- 5MB en bytes
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CORRIGER LES POLITIQUES RLS POUR LE STORAGE
-- ============================================

-- Supprimer les politiques existantes pour le bucket payment-photos
DROP POLICY IF EXISTS "Allow public uploads to payment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from payment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from payment-photos" ON storage.objects;

-- Créer des politiques permissives pour le développement
CREATE POLICY "Allow public uploads to payment-photos" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'payment-photos');

CREATE POLICY "Allow public read from payment-photos" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'payment-photos');

CREATE POLICY "Allow public update to payment-photos" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'payment-photos');

CREATE POLICY "Allow public delete from payment-photos" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'payment-photos');

-- ============================================
-- 3. VÉRIFICATION
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND qual LIKE '%payment-photos%' OR with_check LIKE '%payment-photos%';

SELECT '✅ Storage RLS corrigé pour payment-photos!' AS message;