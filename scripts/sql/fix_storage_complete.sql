-- Script pour corriger les permissions RLS du storage Supabase
-- Ce script corrige les permissions pour TOUS les buckets de stockage
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
-- 2. CORRIGER LES POLITIQUES RLS POUR LE BUCKET 'videos' (par défaut)
-- ============================================

-- Supprimer les politiques existantes pour le bucket videos
DROP POLICY IF EXISTS "Allow public uploads to videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from videos" ON storage.objects;

-- Créer des politiques permissives pour le bucket videos
CREATE POLICY "Allow public uploads to videos" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow public read from videos" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'videos');

CREATE POLICY "Allow public update to videos" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'videos');

CREATE POLICY "Allow public delete from videos" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'videos');

-- ============================================
-- 3. CORRIGER LES POLITIQUES RLS POUR LE BUCKET 'payment-photos'
-- ============================================

-- Supprimer les politiques existantes pour le bucket payment-photos
DROP POLICY IF EXISTS "Allow public uploads to payment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from payment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to payment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from payment-photos" ON storage.objects;

-- Créer des politiques permissives pour le bucket payment-photos
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
-- 4. CRÉER UNE POLITIQUE GLOBALE (fallback) pour tous les buckets
-- ============================================

-- Supprimer la politique globale si elle existe
DROP POLICY IF EXISTS "Allow all operations on storage.objects" ON storage.objects;

-- Créer une politique globale qui permet tout (pour le développement)
CREATE POLICY "Allow all operations on storage.objects" ON storage.objects
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 5. VÉRIFICATION
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
ORDER BY policyname;

SELECT '✅ Storage RLS corrigé pour tous les buckets!' AS message;