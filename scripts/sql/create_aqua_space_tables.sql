-- ================================================================
-- AQUA SPACE (CLUB DE NATATION) - TABLES & RLS POLICIES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.aqua_space_members (
    id SERIAL PRIMARY KEY,
    matricule TEXT NOT NULL,
    etudiant_id INTEGER NULL REFERENCES public."tblEtudiants"("EtudiantID") ON DELETE SET NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance DATE NULL,
    sexe TEXT NULL,
    adresse TEXT NULL,
    photo_url TEXT NULL,
    niveau TEXT NOT NULL DEFAULT 'Apprentissage',
    statut TEXT NOT NULL DEFAULT 'actif',
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Parent / Responsable
    parent_nom TEXT NULL,
    parent_prenom TEXT NULL,
    parent_email TEXT NULL,
    parent_telephone TEXT NULL,
    parent_adresse TEXT NULL,

    -- Contact d'urgence
    urgence_lien TEXT NULL,
    urgence_nom TEXT NULL,
    urgence_prenom TEXT NULL,
    urgence_telephone TEXT NULL,
    urgence_email TEXT NULL,

    -- Fiche Médicale & Préventive
    maladies JSONB DEFAULT '[]'::jsonb,
    autre_maladie TEXT NULL,
    allergies TEXT NULL,
    prise_medicaments BOOLEAN DEFAULT false,
    medicaments_details TEXT NULL,
    auto_administration_medicaments BOOLEAN DEFAULT false,
    blessures_anterieures TEXT NULL,

    -- Paiement & Autorisations
    mode_paiement_souhaite TEXT NULL,
    autorisation_photos BOOLEAN DEFAULT false,
    absence_contre_indication BOOLEAN DEFAULT false,
    autorisation_urgence BOOLEAN DEFAULT false,
    notes TEXT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aqua_space_payments (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES public.aqua_space_members(id) ON DELETE CASCADE,
    etudiant_id INTEGER NULL,
    nom_membre TEXT NOT NULL,
    matricule TEXT NOT NULL,
    montant NUMERIC(12,2) NOT NULL DEFAULT 0,
    devise TEXT NOT NULL DEFAULT 'HTG',
    periode TEXT NOT NULL,
    type_paiement TEXT NOT NULL DEFAULT 'Cotisation',
    methode TEXT NOT NULL DEFAULT 'especes',
    statut TEXT NOT NULL DEFAULT 'paid',
    date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
    remarque TEXT NULL,
    recu_numero TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aqua_space_members_matricule ON public.aqua_space_members(matricule);
CREATE INDEX IF NOT EXISTS idx_aqua_space_members_etudiant_id ON public.aqua_space_members(etudiant_id);
CREATE INDEX IF NOT EXISTS idx_aqua_space_members_niveau ON public.aqua_space_members(niveau);
CREATE INDEX IF NOT EXISTS idx_aqua_space_payments_member_id ON public.aqua_space_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_aqua_space_payments_matricule ON public.aqua_space_payments(matricule);

ALTER TABLE public.aqua_space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aqua_space_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for aqua_space_members" ON public.aqua_space_members;
CREATE POLICY "Allow all for aqua_space_members" ON public.aqua_space_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for aqua_space_payments" ON public.aqua_space_payments;
CREATE POLICY "Allow all for aqua_space_payments" ON public.aqua_space_payments FOR ALL USING (true) WITH CHECK (true);
