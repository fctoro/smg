"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PaymentStatus, PlayerFormValues, PlayerStatus, ProgrammeMatch } from "@/types/club";
import { normalizePlayerFormValues } from "@/lib/club/player-form";
import { fetchProgrammes } from "@/lib/club/programmes";
import { getCurrentSeason, getDynamicSeasonOptions } from "@/lib/club/season";

interface PlayerFormProps {
  initialValues?: Partial<PlayerFormValues>;
  categories?: string[];
  onSubmit: (values: PlayerFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
  highlightFields?: string[];
  draftKey?: string;
  playerId?: string;
  isSubmitting?: boolean;
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
  postePrincipal: "",
  posteSecondaire: "",
  sexe: "Masculin",
  categorie: "ti toro",
  telephone: "",
  email: "",
  adresse: "",
  statut: "actif",
  cotisationMontant: 0,
  cotisationDevise: "US",
  cotisationStatut: "pending",

  programme: "Ti Toro (2 à 5 ans)",
  ecole: "",
  experienceSoccer: "",

  parentNomPrenom: "",
  parentLien: "",
  parentEmail: "",
  parentTelephone: "",
  parentAdresse: "",

  commentIdentifie: "",
  piedDominant: "",
  clubActuel: "",
  sourceDetection: false,
  statutJoueur: "Normal",

  photoIdentiteUrl: "",
  acteNaissanceUrl: "",
  carteIdentiteParentUrl: "",
  fiche9eUrl: "",
  carnetVaccinationUrl: "",

  urgenceNomPrenom: "",
  urgenceLien: "",
  urgenceTelephone: "",
  urgenceEmail: "",
  urgenceAdresse: "",

  tailleHaut: "Choisir",
  tailleShort: "Choisir",
  numerosPreferes: "",

  planPaiement: "PLAN #1 (Annuel)",
  modePaiementChoisi: "Transfert bancaire",
  programmesAssignesIds: [],
  saison: getCurrentSeason(),
};

export default function PlayerForm({
  initialValues,
  categories = ["ti toro", "U8", "U10", "U12", "U14", "U16", "U18"],
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  highlightFields = [],
  draftKey,
  playerId,
  isSubmitting = false,
}: PlayerFormProps) {
  const [formValues, setFormValues] = useState<PlayerFormValues>({
    ...defaultValues,
    ...initialValues,
  });

  const [allProgrammes, setAllProgrammes] = useState<ProgrammeMatch[]>([]);
  const [searchProgramme, setSearchProgramme] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProgrammes().then((data) => {
      setAllProgrammes(data);
      if (playerId) {
        const assignedIds = data.filter(p => p.joueurs?.includes(playerId)).map(p => p.id);
        setFormValues(prev => ({
          ...prev,
          programmesAssignesIds: prev.programmesAssignesIds && prev.programmesAssignesIds.length > 0 ? prev.programmesAssignesIds : assignedIds
        }));
      }
    });
  }, [playerId]);

  const handleAddProgramme = (id: string) => {
    const current = formValues.programmesAssignesIds || [];
    if (!current.includes(id)) {
      updateField("programmesAssignesIds", [...current, id]);
    }
    setSearchProgramme("");
    searchInputRef.current?.focus();
  };

  const handleRemoveProgramme = (id: string) => {
    const current = formValues.programmesAssignesIds || [];
    updateField("programmesAssignesIds", current.filter((pId) => pId !== id));
  };

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
      try {
        const cleanDraft: Record<string, any> = { ...formValues };
        // Strip large base64 Data URLs before saving draft to avoid sessionStorage QuotaExceededError
        Object.keys(cleanDraft).forEach((key) => {
          if (typeof cleanDraft[key] === "string" && cleanDraft[key].startsWith("data:")) {
            delete cleanDraft[key];
          }
        });
        sessionStorage.setItem(`draft_${draftKey}`, JSON.stringify(cleanDraft));
      } catch (e) {
        console.warn("Unable to save form draft to sessionStorage:", e);
      }
    }
  }, [formValues, draftKey]);

  useEffect(() => {
    if (!formValues.dateNaissance) return;
    const dob = new Date(formValues.dateNaissance);
    if (isNaN(dob.getTime())) return;
    
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    let autoCategory = "";
    if (age <= 5) autoCategory = "ti toro";
    else if (age <= 7) autoCategory = "U8";
    else if (age <= 9) autoCategory = "U10";
    else if (age <= 11) autoCategory = "U12";
    else if (age <= 13) autoCategory = "U14";
    else if (age <= 15) autoCategory = "U16";
    else if (age <= 17) autoCategory = "U18";
    else if (age === 18) autoCategory = "U19";
    else if (age >= 19) autoCategory = "U20";

    if (autoCategory && autoCategory !== formValues.categorie) {
      // Only set if the category exists in the available options or if it's one of the standard ones
      const hasCategory = categories.some((c) => c.toLowerCase() === autoCategory.toLowerCase());
      if (hasCategory) {
        const exactCat = categories.find((c) => c.toLowerCase() === autoCategory.toLowerCase()) || autoCategory;
        updateField("categorie", exactCat);
        
        // Also auto-assign program (ti toro vs FC toro) based on age
        const isTiToro = age <= 5;
        const currentProgramme = formValues.programme || "";
        if (isTiToro && !currentProgramme.includes("Ti Toro")) {
           updateField("programme", "Ti Toro (2 à 5 ans)");
        } else if (!isTiToro && !currentProgramme.includes("FC Toro")) {
           updateField("programme", "FC Toro (6 ans et plus)");
        }
      }
    }
  }, [formValues.dateNaissance, categories]);

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
      {!formValues.sourceDetection && (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
        <label className="mb-4 block text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
          Choix de la catégorie *
        </label>
        <p className="-mt-3 mb-4 text-xs text-gray-500 dark:text-gray-400">Sélectionnez la catégorie souhaitée pour le joueur.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all ${
            formValues.programme?.includes("Ti Toro") 
              ? "border-brand-500 bg-brand-50/10 ring-1 ring-brand-500" 
              : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
          }`}>
            <input
              type="radio"
              name="programme"
              value="Ti Toro (2 à 5 ans)"
              checked={formValues.programme?.includes("Ti Toro")}
              onChange={(e) => {
                updateField("programme", e.target.value);
                updateField("categorie", "ti toro");
              }}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="block font-bold text-gray-900 dark:text-white text-sm">Ti Toro</span>
              <span className="block text-xs text-gray-500">2 à 5 ans</span>
            </div>
          </label>

          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all ${
            !formValues.programme?.includes("Ti Toro") 
              ? "border-brand-500 bg-brand-50/10 ring-1 ring-brand-500" 
              : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
          }`}>
            <input
              type="radio"
              name="programme"
              value="FC Toro (6 ans et plus)"
              checked={!formValues.programme?.includes("Ti Toro")}
              onChange={(e) => {
                updateField("programme", e.target.value);
                if (formValues.categorie === "ti toro") {
                  updateField("categorie", "U8");
                }
              }}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="block font-bold text-gray-900 dark:text-white text-sm">FC Toro</span>
              <span className="block text-xs text-gray-500">6 ans et plus</span>
            </div>
          </label>
        </div>
      </div>
      )}

      {/* SAISON D'INSCRIPTION */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
        <label className="mb-4 block text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
          Saison d'inscription *
        </label>
        <p className="-mt-3 mb-4 text-xs text-gray-500 dark:text-gray-400">
          Sélectionnez la saison durant laquelle ce joueur a été inscrit. La saison courante est sélectionnée par défaut.
        </p>
        <div className="max-w-md">
          <select 
            value={formValues.saison || ""} 
            onChange={(e) => updateField("saison", e.target.value)} 
            className={selectClassName}
          >
            {getDynamicSeasonOptions(3, 0).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 01: IDENTITE DU JOUEUR */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            1
          </span>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">Identité du joueur</h4>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Informations personnelles de l'enfant.</p>
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

          {formValues.sourceDetection && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Poste principal</label>
                <input value={formValues.postePrincipal || ""} onChange={(e) => updateField("postePrincipal", e.target.value)} className={inputClassName} placeholder="Ex: Milieu de terrain" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Poste secondaire</label>
                <input value={formValues.posteSecondaire || ""} onChange={(e) => updateField("posteSecondaire", e.target.value)} className={inputClassName} placeholder="Ex: Attaquant" />
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Statut *</label>
            <select value={formValues.statut} onChange={(e) => updateField("statut", e.target.value as PlayerStatus)} className={selectClassName}>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Programmes assignés</label>
            <div className="relative">
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchProgramme}
                onChange={e => setSearchProgramme(e.target.value)}
                placeholder="Rechercher et ajouter un programme..."
                className={inputClassName}
              />
              {searchProgramme && (
                 <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {allProgrammes
                      .filter(p => p.nom?.toLowerCase().includes(searchProgramme.toLowerCase()) && !(formValues.programmesAssignesIds || []).includes(p.id))
                      .map(p => (
                       <button type="button" key={p.id} onClick={() => handleAddProgramme(p.id)} className="w-full text-left px-4 py-2 text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-700 dark:text-gray-300">
                         {p.nom} {p.saison ? `(${p.saison})` : ""}
                       </button>
                    ))}
                    {allProgrammes.filter(p => p.nom?.toLowerCase().includes(searchProgramme.toLowerCase()) && !(formValues.programmesAssignesIds || []).includes(p.id)).length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">Aucun autre programme trouvé.</div>
                    )}
                 </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(formValues.programmesAssignesIds || []).map(id => {
                const prog = allProgrammes.find(p => p.id === id);
                if (!prog) return null;
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
                    {prog.nom}
                    <button type="button" onClick={() => handleRemoveProgramme(id)} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-200">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </span>
                )
              })}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Adresse domicile *</label>
            <input required value={formValues.adresse} onChange={(e) => updateField("adresse", e.target.value)} placeholder="Rue, Quartier, Ville" className={inputClassName} />
          </div>

          {!formValues.sourceDetection && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">École fréquentée *</label>
              <input value={formValues.ecole} onChange={(e) => updateField("ecole", e.target.value)} placeholder="Nom de l'établissement" className={inputClassName} />
            </div>
          )}

          {/* DETECTION ONLY FIELDS */}
          {formValues.sourceDetection && (
            <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-3 block text-xs font-medium text-gray-700 dark:text-gray-300">PIED DOMINANT *</label>
                <div className="flex gap-4">
                  {["Droit", "Gauche", "Les deux"].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="piedDominant"
                        checked={formValues.piedDominant === option}
                        onChange={() => updateField("piedDominant", option)}
                        className="w-4 h-4 text-brand-500 bg-gray-100 border-gray-300 focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="sm:col-span-2 lg:col-span-3 mt-2">
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">CLUB / ACADÉMIE ACTUELLE</label>
                <input 
                  type="text" 
                  value={formValues.clubActuel || ""} 
                  onChange={(e) => updateField("clubActuel", e.target.value)} 
                  placeholder="Renseignez le club ou l'académie actuelle..." 
                  className={inputClassName} 
                />
              </div>
            </div>
          )}

          {/* EXPERIENCE (SHARED, BUT LABEL CHANGES) */}
          <div className="sm:col-span-2 lg:col-span-3 mt-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
              {formValues.sourceDetection ? "EXPÉRIENCE (SÉLECTIONS, TOURNOIS, DISTINCTIONS)" : "ANCIENNE EXPÉRIENCE SOCCER"}
            </label>
            <textarea 
              value={formValues.experienceSoccer || ""} 
              onChange={(e) => updateField("experienceSoccer", e.target.value)} 
              placeholder={formValues.sourceDetection ? "Renseignez l'expérience du joueur..." : "Clubs précédents ou Nouveau"} 
              className={`${inputClassName} min-h-[80px] resize-y`} 
            />
          </div>

          {formValues.sourceDetection && (
            <div className="sm:col-span-2 lg:col-span-3 pt-2">
              <label className="mb-3 block text-xs font-medium text-gray-700 dark:text-gray-300">COMMENT AVEZ-VOUS ÉTÉ IDENTIFIÉ ?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["Inscription libre", "Vertières Cup", "Recommandation d'un coach", "Watchlist FC TORO", "Flag Day Tournament", "Summer Camp FC TORO", "Sélection nationale"].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="commentIdentifie"
                      checked={formValues.commentIdentifie === option}
                      onChange={() => updateField("commentIdentifie", option)}
                      className="w-4 h-4 text-brand-500 bg-gray-100 border-gray-300 focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                  </label>
                ))}
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="commentIdentifie"
                    checked={formValues.commentIdentifie !== "" && !["Inscription libre", "Vertières Cup", "Recommandation d'un coach", "Watchlist FC TORO", "Flag Day Tournament", "Summer Camp FC TORO", "Sélection nationale"].includes(formValues.commentIdentifie || "")}
                    onChange={() => updateField("commentIdentifie", "Autre")}
                    className="w-4 h-4 text-brand-500 bg-gray-100 border-gray-300 focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Autre (préciser)"
                      value={!["Inscription libre", "Vertières Cup", "Recommandation d'un coach", "Watchlist FC TORO", "Flag Day Tournament", "Summer Camp FC TORO", "Sélection nationale"].includes(formValues.commentIdentifie || "") ? formValues.commentIdentifie || "" : ""}
                      onChange={(e) => updateField("commentIdentifie", e.target.value)}
                      onFocus={() => {
                        if (["Inscription libre", "Vertières Cup", "Recommandation d'un coach", "Watchlist FC TORO", "Flag Day Tournament", "Summer Camp FC TORO", "Sélection nationale"].includes(formValues.commentIdentifie || "")) {
                          updateField("commentIdentifie", "");
                        }
                      }}
                      className={`${inputClassName} text-sm py-1.5`}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION DOCUMENTS ADMINISTRATIFS (FACULTATIF) */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              📄
            </span>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Documents administratifs (Facultatif)
              </h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Téléversez l'acte de naissance et la pièce d'identité des parents (PDF, JPG, PNG).
              </p>
            </div>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Optionnel
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Acte de naissance */}
          <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Acte de naissance
                </h5>
                {formValues.acteNaissanceUrl && (
                  <a
                    href={formValues.acteNaissanceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    Voir le document ↗
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formValues.acteNaissanceUrl ? "Document joint." : "Copie de l'acte de naissance ou passeport (PDF/Image)."}
              </p>
            </div>

            <label className="cursor-pointer shrink-0 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-2 shadow-xs transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {formValues.acteNaissanceUrl ? "Remplacer l'acte de naissance" : "Ajouter l'acte de naissance"}
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      updateField("acteNaissanceUrl", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Carte d'identité parent / tuteur */}
          <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Pièce d'identité du parent / tuteur
                </h5>
                {formValues.carteIdentiteParentUrl && (
                  <a
                    href={formValues.carteIdentiteParentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    Voir le document ↗
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formValues.carteIdentiteParentUrl ? "Document joint." : "CIN, NIF ou Passeport du responsable légal."}
              </p>
            </div>

            <label className="cursor-pointer shrink-0 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-2 shadow-xs transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {formValues.carteIdentiteParentUrl ? "Remplacer la pièce d'identité" : "Ajouter la pièce d'identité du parent"}
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      updateField("carteIdentiteParentUrl", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Fiche 9ème (Detection uniquement) */}
          {formValues.sourceDetection && (
            <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Fiche 9ème
                  </h5>
                  {formValues.fiche9eUrl && (
                    <a
                      href={formValues.fiche9eUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      Voir le document ↗
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formValues.fiche9eUrl ? "Document joint." : "Copie de la fiche 9ème (PDF/Image)."}
                </p>
              </div>

              <label className="cursor-pointer shrink-0 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-2 shadow-xs transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {formValues.fiche9eUrl ? "Remplacer la fiche 9ème" : "Ajouter la fiche 9ème"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateField("fiche9eUrl", reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Carnet de Vaccination (Detection uniquement) */}
          {formValues.sourceDetection && (
            <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Carnet de Vaccination
                  </h5>
                  {formValues.carnetVaccinationUrl && (
                    <a
                      href={formValues.carnetVaccinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      Voir le document ↗
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formValues.carnetVaccinationUrl ? "Document joint." : "Copie du carnet de vaccination (PDF/Image)."}
                </p>
              </div>

              <label className="cursor-pointer shrink-0 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-2 shadow-xs transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {formValues.carnetVaccinationUrl ? "Remplacer le carnet de vaccination" : "Ajouter le carnet de vaccination"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateField("carnetVaccinationUrl", reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 02: PARENTS / TUTEUR */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            2
          </span>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">Parents / Tuteur</h4>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Informations de contact pour les responsables légaux.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Nom & Prénom *</label>
            <input value={formValues.parentNomPrenom} onChange={(e) => updateField("parentNomPrenom", e.target.value)} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Lien avec le joueur *</label>
            <input value={formValues.parentLien} onChange={(e) => updateField("parentLien", e.target.value)} placeholder="Ex: Père, Mère, Tuteur..." className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">E-mail *</label>
            <input type="email" value={formValues.email} onChange={(e) => { updateField("email", e.target.value); updateField("parentEmail", e.target.value); }} className={inputClassName} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Téléphone / WhatsApp *</label>
            <input value={formValues.telephone} onChange={(e) => { updateField("telephone", e.target.value); updateField("parentTelephone", e.target.value); }} placeholder="+509..." className={inputClassName} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Adresse (si différente)</label>
            <input value={formValues.parentAdresse} onChange={(e) => updateField("parentAdresse", e.target.value)} className={inputClassName} />
          </div>
        </div>
      </div>

      {/* SECTION 03: CONTACT D'URGENCE */}
      {!formValues.sourceDetection && (
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            3
          </span>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">Contact d'urgence</h4>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">En cas d'urgence si on ne trouve pas les parents/tuteurs.</p>
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
      )}

      {/* SECTION 04: UNIFORMES & TAILLES */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            4
          </span>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">Uniformes & Tailles</h4>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Sélectionnez les tailles pour l'équipement fourni par le club.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Taille du Haut (Top) *</label>
            <select value={formValues.tailleHaut} onChange={(e) => updateField("tailleHaut", e.target.value)} className={selectClassName}>
              <option value="Choisir">Choisir</option>
              <option value="YXS">YXS (Youth Extra Small)</option>
              <option value="YS">YS (Youth Small)</option>
              <option value="YM">YM (Youth Medium)</option>
              <option value="YL">YL (Youth Large)</option>
              <option value="YXL">YXL (Youth Extra Large)</option>
              <option value="AS">AS (Adult Small)</option>
              <option value="AM">AM (Adult Medium)</option>
              <option value="AL">AL (Adult Large)</option>
              <option value="AXL">AXL (Adult Extra Large)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Taille du Short *</label>
            <select value={formValues.tailleShort} onChange={(e) => updateField("tailleShort", e.target.value)} className={selectClassName}>
              <option value="Choisir">Choisir</option>
              <option value="YXS">YXS (Youth Extra Small)</option>
              <option value="YS">YS (Youth Small)</option>
              <option value="YM">YM (Youth Medium)</option>
              <option value="YL">YL (Youth Large)</option>
              <option value="YXL">YXL (Youth Extra Large)</option>
              <option value="AS">AS (Adult Small)</option>
              <option value="AM">AM (Adult Medium)</option>
              <option value="AL">AL (Adult Large)</option>
              <option value="AXL">AXL (Adult Extra Large)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Numéros préférés</label>
            <input value={formValues.numerosPreferes} onChange={(e) => updateField("numerosPreferes", e.target.value)} placeholder="Ex: 10, 7, 22" className={inputClassName} />
          </div>
        </div>
      </div>

      {/* SECTION 05 & 06: PLAN ET MODE DE PAIEMENT */}
      {!(formValues.sourceDetection || (formValues.statutJoueur && formValues.statutJoueur !== "Normal" && !formValues.statutJoueur.toLowerCase().includes("demi-bourse"))) ? (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              5
            </span>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">Plan & Mode de Paiement</h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Sélectionnez le plan de paiement et le mode de règlement.</p>
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
      ) : (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              5
            </span>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">Dossier Financier</h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Informations sur le statut financier particulier du joueur.</p>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Ce joueur bénéficie d'un statut financier particulier : <strong>{formValues.statutJoueur || (formValues.sourceDetection ? "Détection / Sponsorisé" : "Spécial")}</strong>. 
            Les champs de facturation standards sont désactivés pour ce profil.
          </div>
        </div>
      )}

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
          disabled={isSubmitting}
          className={`rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-md ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-600'}`}
        >
          {isSubmitting ? "En cours..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
