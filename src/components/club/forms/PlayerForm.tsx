"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PaymentStatus, PlayerFormValues, PlayerStatus } from "@/types/club";
import { normalizePlayerFormValues } from "@/lib/club/player-form";

interface PlayerFormProps {
  initialValues?: Partial<PlayerFormValues>;
  categories?: string[];
  onSubmit: (values: PlayerFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
  highlightFields?: string[];
  draftKey?: string;
}

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const defaultValues: PlayerFormValues = {
  photoUrl: "",
  nom: "",
  prenom: "",
  dateNaissance: "",
  poste: "Milieu",
  sexe: "Masculin",
  categorie: "ti toro",
  telephone: "",
  email: "",
  adresse: "",
  statut: "actif",
  cotisationMontant: 0,
  cotisationDevise: "US",
  cotisationStatut: "pending",

  programme: "FC Toro (6 ans et plus)",
  ecole: "",
  experienceSoccer: "",

  parentNomPrenom: "",
  parentEmail: "",
  parentTelephone: "",
  parentAdresse: "",

  urgenceNomPrenom: "",
  urgenceLien: "",
  urgenceTelephone: "",
  urgenceEmail: "",
  urgenceAdresse: "",

  tailleHaut: "M",
  tailleShort: "M",
  numerosPreferes: "",

  planPaiement: "PLAN #1 (Annuel)",
  modePaiementChoisi: "Transfert bancaire",
};

export default function PlayerForm({
  initialValues,
  categories = ["ti toro", "U8", "U10", "U12", "U14", "U16", "U18"],
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  highlightFields = [],
  draftKey,
}: PlayerFormProps) {
  const [formValues, setFormValues] = useState<PlayerFormValues>({
    ...defaultValues,
    ...initialValues,
  });

  useEffect(() => {
    let savedDraft = null;
    if (draftKey) {
      try {
        const stored = sessionStorage.getItem(`draft_${draftKey}`);
        if (stored) {
          savedDraft = JSON.parse(stored);
        }
      } catch (e) {}
    }
    
    const merged = {
      ...defaultValues,
      ...initialValues,
    };

    if (savedDraft) {
      Object.keys(savedDraft).forEach((key) => {
        const k = key as keyof PlayerFormValues;
        if (savedDraft[k] !== "" && savedDraft[k] !== null && savedDraft[k] !== undefined) {
          merged[k] = savedDraft[k] as never;
        }
      });
    }

    setFormValues(merged);
  }, [initialValues, draftKey]);

  useEffect(() => {
    if (draftKey) {
      sessionStorage.setItem(`draft_${draftKey}`, JSON.stringify(formValues));
    }
  }, [formValues, draftKey]);

  const getInputClass = (fieldName: string) => {
    if (highlightFields.includes(fieldName)) {
      return `${inputClassName} border-brand-500 ring-2 ring-brand-500/50 bg-brand-50/10 dark:bg-brand-900/10 relative`;
    }
    return inputClassName;
  };

  const updateField = <K extends keyof PlayerFormValues>(
    key: K,
    value: PlayerFormValues[K],
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(normalizePlayerFormValues(formValues));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-4">
      {/* PROGRAMME */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50">
        <label className="mb-2 block text-sm font-bold text-gray-900 dark:text-white">
          Choix du programme *
        </label>
        <p className="text-xs text-gray-500 mb-3">Sélectionnez le parcours souhaité pour le joueur.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className={`cursor-pointer rounded-xl border p-4 flex items-center gap-3 transition-all ${
            formValues.programme?.includes("Ti Toro") 
              ? "border-brand-500 bg-brand-50/20 ring-2 ring-brand-500/30" 
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}>
            <input
              type="radio"
              name="programme"
              value="Ti Toro (2 à 5 ans)"
              checked={formValues.programme?.includes("Ti Toro")}
              onChange={(e) => updateField("programme", e.target.value)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="block font-bold text-gray-900 dark:text-white text-sm">Ti Toro</span>
              <span className="block text-xs text-gray-500">2 à 5 ans</span>
            </div>
          </label>

          <label className={`cursor-pointer rounded-xl border p-4 flex items-center gap-3 transition-all ${
            !formValues.programme?.includes("Ti Toro") 
              ? "border-brand-500 bg-brand-50/20 ring-2 ring-brand-500/30" 
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}>
            <input
              type="radio"
              name="programme"
              value="FC Toro (6 ans et plus)"
              checked={!formValues.programme?.includes("Ti Toro")}
              onChange={(e) => updateField("programme", e.target.value)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="block font-bold text-gray-900 dark:text-white text-sm">FC Toro</span>
              <span className="block text-xs text-gray-500">6 ans et plus</span>
            </div>
          </label>
        </div>
      </div>

      {/* SECTION 01: IDENTITE DU JOUEUR */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-xs">01</span>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Identité du joueur</h4>
            <p className="text-xs text-gray-500">Informations personnelles de l'enfant.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Photo d'identité du joueur */}
          <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={formValues.photoIdentiteUrl || (formValues.photoUrl && !formValues.photoUrl.includes("user-01") ? formValues.photoUrl : "/images/user/silhouette.svg")}
                alt="Photo du joueur"
                className="h-20 w-20 rounded-full object-cover shadow-md border-2 border-brand-500 bg-gray-100 dark:bg-gray-800 p-1"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <h5 className="text-sm font-bold text-gray-900 dark:text-white">Photo d'identité du joueur</h5>
              <p className="text-xs text-gray-500">Format passeport (JPG ou PNG). Cliquez sur le bouton ci-dessous pour changer ou téléverser la photo.</p>
            </div>

            <label className="cursor-pointer shrink-0 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Changer la photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const dataUrl = reader.result as string;
                      updateField("photoIdentiteUrl", dataUrl);
                      updateField("photoUrl", dataUrl);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Nom de l'enfant *</label>
            <input required value={formValues.nom} onChange={(e) => updateField("nom", e.target.value)} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Prénom de l'enfant *</label>
            <input required value={formValues.prenom} onChange={(e) => updateField("prenom", e.target.value)} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Date de naissance *</label>
            <input required type="date" value={formValues.dateNaissance} onChange={(e) => updateField("dateNaissance", e.target.value)} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Genre *</label>
            <select value={formValues.sexe} onChange={(e) => updateField("sexe", e.target.value as "Féminin" | "Masculin")} className={selectClassName}>
              <option value="Masculin">Masculin</option>
              <option value="Féminin">Féminin</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Catégorie *</label>
            <select value={formValues.categorie} onChange={(e) => updateField("categorie", e.target.value)} className={selectClassName}>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Poste</label>
            <input value={formValues.poste} onChange={(e) => updateField("poste", e.target.value)} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Statut *</label>
            <select value={formValues.statut} onChange={(e) => updateField("statut", e.target.value as PlayerStatus)} className={selectClassName}>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="alumni">Alumni</option>
              <option value="abandonne">Abandonné</option>
              <option value="blesse">Blessé</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Adresse domicile *</label>
            <input required value={formValues.adresse} onChange={(e) => updateField("adresse", e.target.value)} placeholder="Rue, Quartier, Ville" className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">École fréquentée *</label>
            <input value={formValues.ecole} onChange={(e) => updateField("ecole", e.target.value)} placeholder="Nom de l'établissement" className={inputClassName} />
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Ancienne expérience soccer</label>
            <input value={formValues.experienceSoccer} onChange={(e) => updateField("experienceSoccer", e.target.value)} placeholder="Clubs précédents ou Nouveau" className={inputClassName} />
          </div>
        </div>
      </div>

      {/* SECTION 02: PARENTS / TUTEUR */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-xs">02</span>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Parents / Tuteur</h4>
            <p className="text-xs text-gray-500">Informations de contact pour les responsables légaux.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Nom & Prénom *</label>
            <input value={formValues.parentNomPrenom} onChange={(e) => updateField("parentNomPrenom", e.target.value)} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">E-mail *</label>
            <input type="email" value={formValues.email} onChange={(e) => { updateField("email", e.target.value); updateField("parentEmail", e.target.value); }} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Téléphone / WhatsApp *</label>
            <input value={formValues.telephone} onChange={(e) => { updateField("telephone", e.target.value); updateField("parentTelephone", e.target.value); }} placeholder="+509..." className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Adresse (si différente)</label>
            <input value={formValues.parentAdresse} onChange={(e) => updateField("parentAdresse", e.target.value)} className={inputClassName} />
          </div>
        </div>
      </div>

      {/* SECTION 03: CONTACT D'URGENCE */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs">03</span>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Contact d'urgence</h4>
            <p className="text-xs text-gray-500">En cas d'urgence si on ne trouve pas les parents/tuteurs.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Nom & Prénom *</label>
            <input value={formValues.urgenceNomPrenom} onChange={(e) => updateField("urgenceNomPrenom", e.target.value)} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Lien de parenté *</label>
            <input value={formValues.urgenceLien} onChange={(e) => updateField("urgenceLien", e.target.value)} placeholder="Ex: Oncle, Tante..." className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Téléphone *</label>
            <input value={formValues.urgenceTelephone} onChange={(e) => updateField("urgenceTelephone", e.target.value)} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">E-mail</label>
            <input type="email" value={formValues.urgenceEmail} onChange={(e) => updateField("urgenceEmail", e.target.value)} className={inputClassName} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Adresse physique</label>
            <input value={formValues.urgenceAdresse} onChange={(e) => updateField("urgenceAdresse", e.target.value)} className={inputClassName} />
          </div>
        </div>
      </div>

      {/* SECTION 04: UNIFORMES & TAILLES */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-xs">04</span>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Uniformes & Tailles</h4>
            <p className="text-xs text-gray-500">Sélectionnez les tailles pour l'équipement fourni par le club.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Taille du Haut (Top) *</label>
            <select value={formValues.tailleHaut} onChange={(e) => updateField("tailleHaut", e.target.value)} className={selectClassName}>
              <option value="4XS">4XS (4-5 ans)</option>
              <option value="3XS">3XS (6-7 ans)</option>
              <option value="2XS">2XS (8-9 ans)</option>
              <option value="XS">XS (10-11 ans)</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Taille du Short *</label>
            <select value={formValues.tailleShort} onChange={(e) => updateField("tailleShort", e.target.value)} className={selectClassName}>
              <option value="4XS">4XS (4-5 ans)</option>
              <option value="3XS">3XS (6-7 ans)</option>
              <option value="2XS">2XS (8-9 ans)</option>
              <option value="XS">XS (10-11 ans)</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Numéros préférés</label>
            <input value={formValues.numerosPreferes} onChange={(e) => updateField("numerosPreferes", e.target.value)} placeholder="Ex: 10, 7, 22" className={inputClassName} />
          </div>
        </div>
      </div>

      {/* SECTION 05 & 06: PLAN ET MODE DE PAIEMENT */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-xs">05</span>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Plan & Mode de Paiement</h4>
            <p className="text-xs text-gray-500">Sélectionnez le plan de paiement et le mode de règlement.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Choix du Plan de Paiement *</label>
            <select value={formValues.planPaiement} onChange={(e) => updateField("planPaiement", e.target.value)} className={selectClassName}>
              <option value="PLAN #1 (Annuel)">PLAN #1 (Annuel) - Versement unique à l'inscription ($1,215)</option>
              <option value="PLAN #2 (Semestriel)">PLAN #2 (Semestriel) - 2 versements égaux ($641.25 x 2)</option>
              <option value="PLAN #3 (Mensuel)">PLAN #3 (Mensuel) - 9 versements ($155 / mois)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Mode de règlement *</label>
            <select value={formValues.modePaiementChoisi} onChange={(e) => updateField("modePaiementChoisi", e.target.value)} className={selectClassName}>
              <option value="Cash/chèque">Cash / chèque</option>
              <option value="Carte bancaire">Carte bancaire</option>
              <option value="Transfert bancaire">Transfert bancaire</option>
            </select>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 shadow-md"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
