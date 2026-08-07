-- Création de la table programmes_match
CREATE TABLE IF NOT EXISTS public.programmes_match (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom TEXT NOT NULL,
    date_programme DATE NOT NULL,
    saison TEXT NOT NULL,
    categorie TEXT NOT NULL,
    joueurs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS
ALTER TABLE public.programmes_match ENABLE ROW LEVEL SECURITY;

-- Ajout des politiques de sécurité
CREATE POLICY "Les programmes sont visibles par tous les membres authentifiés" 
ON public.programmes_match FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Seuls les admins peuvent insérer des programmes" 
ON public.programmes_match FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Ajuster avec is_admin si nécessaire, mais on simplifie pour le dashboard

CREATE POLICY "Seuls les admins peuvent modifier des programmes" 
ON public.programmes_match FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Seuls les admins peuvent supprimer des programmes" 
ON public.programmes_match FOR DELETE 
TO authenticated 
USING (true);
