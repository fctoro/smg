-- Script SQL pour créer la table tblRubriques dans Supabase
CREATE TABLE IF NOT EXISTS public."tblRubriques" (
    "id" TEXT PRIMARY KEY,
    "rubrique" TEXT NOT NULL,
    "montant" NUMERIC NOT NULL DEFAULT 0,
    "devise" TEXT NOT NULL DEFAULT 'US',
    "precision" TEXT DEFAULT '',
    "categorie" TEXT DEFAULT '',
    "est_adhesion" BOOLEAN DEFAULT false,
    "actif" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activation du Row Level Security (RLS)
ALTER TABLE public."tblRubriques" ENABLE ROW LEVEL SECURITY;

-- Stratégies RLS
DROP POLICY IF EXISTS "Permettre la lecture publique des rubriques" ON public."tblRubriques";
CREATE POLICY "Permettre la lecture publique des rubriques"
ON public."tblRubriques" FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permettre toutes les operations pour la gestion des rubriques" ON public."tblRubriques";
CREATE POLICY "Permettre toutes les operations pour la gestion des rubriques"
ON public."tblRubriques" FOR ALL
USING (true)
WITH CHECK (true);

-- Insertion des données par défaut si la table est vide
INSERT INTO public."tblRubriques" ("id", "rubrique", "montant", "devise", "precision", "categorie", "est_adhesion", "actif")
VALUES
    ('inscription', 'Frais d''inscription / réinscription', 75, 'US', 'Applicables à tous les joueurs, nouveaux et anciens', '', false, true),
    ('adhesion-fc', 'Adhésion annuelle - FC TORO', 1350, 'US', 'Catégories École de Football / Académie / Élite, hors uniformes', 'FC TORO', true, true),
    ('adhesion-ti', 'Adhésion annuelle - TI TORO', 1000, 'US', 'Catégorie Ti Toro / U6-U8, hors uniformes', 'TI TORO', true, true),
    ('uniforme-jeux1', 'Uniforme – Jeux 1', 80, 'US', 'Jeux Entrainement - Obligatoire', '', false, true),
    ('uniforme-jeux2', 'Uniforme – Jeux 2', 100, 'US', 'Jeux Match 1 - Obligatoire', '', false, true),
    ('uniforme-jeux3', 'Uniforme – Jeux 3', 100, 'US', 'Jeux Match 2 - Obligatoire', '', false, true),
    ('tracksuit', 'Tracksuit', 150, 'US', 'Jacket & Jogger – Facultatif', '', false, true),
    ('backpack', 'Backpack', 90, 'US', 'Sac à dos – Facultatif', '', false, true)
ON CONFLICT ("id") DO NOTHING;
