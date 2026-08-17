-- ====================================================================
-- CORRECTION DES DERNIRÈES ALERTES : BUCKETS STORAGE (payment-photos & videos)
-- Exécuter dans Supabase -> SQL Editor -> Run
-- ====================================================================

-- 1. Supprimer les politiques SELECT publiques trop larges qui permettent de lister l'intégralité du contenu des buckets
DROP POLICY IF EXISTS "Allow public read from payment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from videos" ON storage.objects;

-- 2. Créer des politiques restreintes aux utilisateurs authentifiés pour la lecture des fichiers des buckets
CREATE POLICY "Authenticated read payment-photos" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'payment-photos');

CREATE POLICY "Authenticated read videos" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'videos');
