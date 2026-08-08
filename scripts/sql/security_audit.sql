-- Script d'Audit et de Correction RLS (Row Level Security)
-- Objectif : S'assurer qu'aucune donnée n'est publiquement accessible sans authentification.

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- 1. Activer RLS sur toutes les tables du schéma public
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP 
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;'; 
        RAISE NOTICE 'RLS activé sur la table : %', r.tablename;
    END LOOP; 
END $$;

-- 2. Création des politiques de sécurité de base pour toutes les tables
-- (ATTENTION: Ces politiques autorisent tous les utilisateurs authentifiés à tout faire. 
-- Vous pourrez ensuite les affiner par rôle (ex: Super Admin) selon vos besoins, 
-- mais cela bloque déjà l'accès public/anonyme).

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP 
        -- Politique SELECT pour les utilisateurs authentifiés
        BEGIN
            EXECUTE 'CREATE POLICY "Allow authenticated SELECT on ' || r.tablename || '" ON public.' || quote_ident(r.tablename) || ' FOR SELECT USING (auth.role() = ''authenticated'');';
        EXCEPTION WHEN duplicate_object THEN
            -- Ignore si la politique existe déjà
        END;

        -- Politique INSERT pour les utilisateurs authentifiés
        BEGIN
            EXECUTE 'CREATE POLICY "Allow authenticated INSERT on ' || r.tablename || '" ON public.' || quote_ident(r.tablename) || ' FOR INSERT WITH CHECK (auth.role() = ''authenticated'');';
        EXCEPTION WHEN duplicate_object THEN
        END;

        -- Politique UPDATE pour les utilisateurs authentifiés
        BEGIN
            EXECUTE 'CREATE POLICY "Allow authenticated UPDATE on ' || r.tablename || '" ON public.' || quote_ident(r.tablename) || ' FOR UPDATE USING (auth.role() = ''authenticated'');';
        EXCEPTION WHEN duplicate_object THEN
        END;

        -- Politique DELETE pour les utilisateurs authentifiés
        BEGIN
            EXECUTE 'CREATE POLICY "Allow authenticated DELETE on ' || r.tablename || '" ON public.' || quote_ident(r.tablename) || ' FOR DELETE USING (auth.role() = ''authenticated'');';
        EXCEPTION WHEN duplicate_object THEN
        END;
    END LOOP; 
END $$;

-- Note : Pour une sécurité maximale (10/10), vous devriez remplacer "auth.role() = 'authenticated'"
-- par des vérifications de rôles spécifiques (ex: vérifier si l'utilisateur est Admin dans la table profils).
