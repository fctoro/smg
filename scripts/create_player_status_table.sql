-- Créer une table séparée pour les statuts des joueurs
-- Cette table va stocker les statuts assignés dans la page "Statuts Spéciaux & Bourses"

CREATE TABLE IF NOT EXISTS public.player_status (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES public."tblEtudiants"("EtudiantID") ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(player_id)
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_player_status_player_id ON public.player_status(player_id);

-- Activer RLS (Row Level Security)
ALTER TABLE public.player_status ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre la lecture à tous
CREATE POLICY "Allow public read access" ON public.player_status
  FOR SELECT USING (true);

-- Créer une politique pour permettre l'insertion/update à tous (pour simplifier)
CREATE POLICY "Allow public insert access" ON public.player_status
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.player_status
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON public.player_status
  FOR DELETE USING (true);

-- Afficher un message de confirmation
SELECT 'Table player_status créée avec succès!' as message;