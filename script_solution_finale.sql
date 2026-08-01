-- Script SOLUTION FINALE pour tblPaiements
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Ajouter la colonne Statut (avec guillemets pour préserver la casse)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tblPaiements' 
        AND column_name = 'Statut'
    ) THEN
        ALTER TABLE "tblPaiements" ADD COLUMN "Statut" TEXT DEFAULT 'pending';
        RAISE NOTICE '✅ Colonne Statut ajoutée';
    END IF;
END $$;

-- Ajouter la colonne Periode
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tblPaiements' 
        AND column_name = 'Periode'
    ) THEN
        ALTER TABLE "tblPaiements" ADD COLUMN "Periode" TEXT;
        RAISE NOTICE '✅ Colonne Periode ajoutée';
    END IF;
END $$;

-- Vérifier la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'tblPaiements'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ Terminé! Les colonnes ont été ajoutées.' AS message;