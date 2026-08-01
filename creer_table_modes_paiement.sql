-- Script pour créer la table des modes de paiement
-- Exécutez ce script dans Supabase SQL Editor

-- Créer la table des modes de paiement
CREATE TABLE IF NOT EXISTS public.tblModesPaiement (
    Id SERIAL PRIMARY KEY,
    Code TEXT NOT NULL UNIQUE,
    Libelle TEXT NOT NULL,
    Actif BOOLEAN DEFAULT true
);

-- Insérer les modes de paiement
INSERT INTO public.tblModesPaiement (Code, Libelle) VALUES
    ('especes', 'Espèces'),
    ('carte', 'Carte bancaire'),
    ('virement', 'Virement bancaire'),
    ('mobile', 'Mobile Money')
ON CONFLICT (Code) DO NOTHING;

-- Afficher les modes de paiement
SELECT * FROM public.tblModesPaiement;