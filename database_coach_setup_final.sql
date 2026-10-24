-- ==============================================================================
-- FC TORO : SCRIPT SQL GLOBAL D'INITIALISATION ET MISE À NIVEAU (COACH & SUIVI)
-- Copiez tout ce contenu et collez-le dans Supabase > SQL Editor > Run
-- ==============================================================================

-- 1. TABLE DES PRÉSENCES (Entraînements & Matchs disputés)
CREATE TABLE IF NOT EXISTS public.player_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id VARCHAR NOT NULL,
    coach_id VARCHAR,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    event_type VARCHAR NOT NULL CHECK (event_type IN ('Entraînement', 'Match')),
    status VARCHAR NOT NULL CHECK (status IN ('Présent', 'Absent', 'Blessé', 'En retard')),
    saison VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_attendance_player_id ON public.player_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_player_attendance_saison ON public.player_attendance(saison);
CREATE INDEX IF NOT EXISTS idx_player_attendance_date ON public.player_attendance(date);
ALTER TABLE public.player_attendance DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.player_attendance TO anon, authenticated;

-- 2. TABLE DES FORMULAIRES D'ÉVALUATION OFFICIELS (U8, U10, U12, etc.)
CREATE TABLE IF NOT EXISTS public.player_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id VARCHAR NOT NULL,
    coach_id VARCHAR,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    comments TEXT NOT NULL,
    saison VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_evaluations_player_id ON public.player_evaluations(player_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_saison ON public.player_evaluations(saison);
ALTER TABLE public.player_evaluations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.player_evaluations TO anon, authenticated;

-- 3. TABLE DES EFFECTIFS ET RAPPORTS DE MATCH (Scores, Buteurs Toro & Adverses, Cartons, Passes D.)
CREATE TABLE IF NOT EXISTS public."tblEffectifs" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom VARCHAR NOT NULL,
    date_match DATE NOT NULL DEFAULT CURRENT_DATE,
    periode VARCHAR,
    categorie VARCHAR NOT NULL,
    joueurs TEXT[] DEFAULT '{}',
    tactique_id VARCHAR,
    coach_email VARCHAR NOT NULL,
    score_toro INT DEFAULT NULL,
    score_adversaire INT DEFAULT NULL,
    match_events JSONB DEFAULT '[]'::jsonb,
    coach_notes_strengths TEXT,
    coach_notes_weaknesses TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mises à jour sécurisées si la table tblEffectifs existait déjà sans certaines colonnes
ALTER TABLE public."tblEffectifs" ADD COLUMN IF NOT EXISTS score_toro INT DEFAULT NULL;
ALTER TABLE public."tblEffectifs" ADD COLUMN IF NOT EXISTS score_adversaire INT DEFAULT NULL;
ALTER TABLE public."tblEffectifs" ADD COLUMN IF NOT EXISTS match_events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public."tblEffectifs" ADD COLUMN IF NOT EXISTS coach_notes_strengths TEXT;
ALTER TABLE public."tblEffectifs" ADD COLUMN IF NOT EXISTS coach_notes_weaknesses TEXT;

CREATE INDEX IF NOT EXISTS idx_tbleffectifs_coach_email ON public."tblEffectifs"(coach_email);
CREATE INDEX IF NOT EXISTS idx_tbleffectifs_date_match ON public."tblEffectifs"(date_match);
ALTER TABLE public."tblEffectifs" DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public."tblEffectifs" TO anon, authenticated;
