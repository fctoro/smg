-- Table pour les présences (Appel quotidien)
CREATE TABLE IF NOT EXISTS public.player_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id VARCHAR NOT NULL,
    coach_id VARCHAR, -- UUID ou VARCHAR selon l'auth
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    event_type VARCHAR NOT NULL CHECK (event_type IN ('Entraînement', 'Match')),
    status VARCHAR NOT NULL CHECK (status IN ('Présent', 'Absent', 'Blessé', 'En retard')),
    saison VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes sur les présences d'un joueur
CREATE INDEX IF NOT EXISTS idx_player_attendance_player_id ON public.player_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_player_attendance_saison ON public.player_attendance(saison);

-- Table pour les évaluations périodiques (Commentaires)
CREATE TABLE IF NOT EXISTS public.player_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id VARCHAR NOT NULL,
    coach_id VARCHAR,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    comments TEXT NOT NULL,
    saison VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes sur les évaluations d'un joueur
CREATE INDEX IF NOT EXISTS idx_player_evaluations_player_id ON public.player_evaluations(player_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_saison ON public.player_evaluations(saison);

-- Désactiver le RLS pour faciliter l'accès API
ALTER TABLE public.player_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_evaluations DISABLE ROW LEVEL SECURITY;
