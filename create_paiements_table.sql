-- Script pour créer la table tblPaiements dans Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Créer la table tblPaiements si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.tblPaiements (
    Id SERIAL PRIMARY KEY,
    EtudiantId INTEGER NOT NULL REFERENCES public.tblEtudiants(EtudiantID) ON DELETE CASCADE,
    DateTransact TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ModePaiement TEXT NOT NULL DEFAULT 'especes',
    Remarque TEXT,
    Statut TEXT DEFAULT 'pending' NOT NULL,
    Periode TEXT,
    MntPayeUS DECIMAL(10,2) DEFAULT 0,
    MntPayeGd DECIMAL(10,2) DEFAULT 0,
    Taux DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur EtudiantId pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tblpaiements_etudiantid ON public.tblPaiements(EtudiantId);

-- Créer un index sur Periode pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tblpaiements_periode ON public.tblPaiements(Periode);

-- Créer un index sur Statut pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tblpaiements_statut ON public.tblPaiements(Statut);

-- Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_tblpaiements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tblpaiements_updated_at ON public.tblPaiements;
CREATE TRIGGER trigger_update_tblpaiements_updated_at
    BEFORE UPDATE ON public.tblPaiements
    FOR EACH ROW
    EXECUTE FUNCTION update_tblpaiements_updated_at();

-- Activer RLS (Row Level Security) si nécessaire
-- ALTER TABLE public.tblPaiements ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre l'accès public (à ajuster selon vos besoins)
-- CREATE POLICY "Allow public access" ON public.tblPaiements FOR ALL USING (true);

-- Afficher la structure de la table créée
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'tblPaiements'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Message de confirmation
SELECT 'Table tblPaiements créée avec succès!' AS message;