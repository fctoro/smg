"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PaymentStatus, AlumniFormValues, PlayerStatus } from "@/types/club";
import { normalizePlayerFormValues } from "@/lib/club/player-form";

interface AlumniFormProps {
  initialValues?: Partial<AlumniFormValues>;
  categories?: string[];
  onSubmit: (values: AlumniFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const defaultValues: AlumniFormValues = {
  photoUrl: "",
  nom: "",
  prenom: "",
  dateNaissance: "",
  poste: "",
  sexe: "Masculin",
  categorie: "ti toro",
  telephone: "",
  email: "",
  adresse: "",
  statut: "alumni",
  cotisationMontant: 0,
  cotisationDevise: "US",
  cotisationStatut: "pending",
};

export default function AlumniForm({
  initialValues,
  categories = ["ti toro", "U8", "U10", "U12", "U14", "U16", "U18"],
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: AlumniFormProps) {
  const [formValues, setFormValues] = useState<AlumniFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [selectedFileName, setSelectedFileName] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormValues({
      ...defaultValues,
      ...initialValues,
    });
    setSelectedFileName("");
    setPhotoError(null);
  }, [initialValues]);

  const fullNameSeed = useMemo(
    () => `${formValues.prenom} ${formValues.nom}`.trim() || "Nouveau Alumni",
    [formValues.nom, formValues.prenom],
  );

  const updateField = <K extends keyof AlumniFormValues>(
    key: K,
    value: AlumniFormValues[K],
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(normalizePlayerFormValues(formValues as any));
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-800 pb-6 mb-2">
          {/* Photo d'identité */}
          <div className="flex flex-col">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Photo d'identité
            </label>
            <div className="flex items-center gap-4">
              <label className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-brand-500/60">
                {formValues.photoIdentiteUrl && formValues.photoIdentiteUrl.startsWith('data:image') ? (
                  <img
                    src={formValues.photoIdentiteUrl}
                    alt="Photo"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/user/user-01.jpg";
                    }}
                  />
                ) : formValues.photoIdentiteUrl && !formValues.photoIdentiteUrl.startsWith('data:application/pdf') ? (
                  <img
                    src={formValues.photoIdentiteUrl}
                    alt="Photo"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/user/user-01.jpg";
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-500 shadow-theme-xs dark:bg-gray-900">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <span className="text-[11px] font-medium">Ajouter</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateField("photoIdentiteUrl", reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
              <div className="text-xs text-gray-500">
                <p>Format JPG, PNG</p>
                <p>Taille max: 5MB</p>
              </div>
            </div>
          </div>
          
          {/* Acte de naissance */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Acte de naissance
            </label>
            {formValues.acteNaissanceUrl && formValues.acteNaissanceUrl.startsWith('http') ? (
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-4 py-2.5 rounded-lg border border-green-100 dark:border-green-900/50">
                  <a href={formValues.acteNaissanceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-500 hover:underline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Document uploadé (voir)
                  </a>
                  <label className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700 bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
                    Remplacer
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
              </div>
            ) : (
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
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-gray-800 dark:file:text-gray-300"
              />
            )}
          </div>

          {/* Carte d'identité du parent */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Carte d'identité du parent
            </label>
            {formValues.carteIdentiteParentUrl && formValues.carteIdentiteParentUrl.startsWith('http') ? (
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-4 py-2.5 rounded-lg border border-green-100 dark:border-green-900/50">
                  <a href={formValues.carteIdentiteParentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-500 hover:underline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Document uploadé (voir)
                  </a>
                  <label className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700 bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
                    Remplacer
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
              </div>
            ) : (
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
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-gray-800 dark:file:text-gray-300"
              />
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Nom
          </label>
          <input
            required
            value={formValues.nom}
            onChange={(event) => updateField("nom", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Prenom
          </label>
          <input
            required
            value={formValues.prenom}
            onChange={(event) => updateField("prenom", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Date de naissance
          </label>
          <input
            required
            type="date"
            value={formValues.dateNaissance}
            onChange={(event) => updateField("dateNaissance", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Poste
          </label>
          <input
            required
            value={formValues.poste}
            onChange={(event) => updateField("poste", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Sexe
          </label>
          <select
            value={formValues.sexe}
            onChange={(event) => updateField("sexe", event.target.value as "Féminin" | "Masculin")}
            className={selectClassName}
          >
            <option value="Masculin">Masculin</option>
            <option value="Féminin">Féminin</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Categorie
          </label>
          <select
            value={formValues.categorie}
            onChange={(event) => updateField("categorie", event.target.value)}
            className={selectClassName}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Telephone
          </label>
          <input
            value={formValues.telephone}
            onChange={(event) => updateField("telephone", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Email
          </label>
          <input
            required
            type="email"
            value={formValues.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="md:col-span-2 xl:col-span-3">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Adresse
          </label>
          <input
            value={formValues.adresse}
            onChange={(event) => updateField("adresse", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Statut
          </label>
          <select
            value={formValues.statut}
            onChange={(event) =>
              updateField("statut", event.target.value as PlayerStatus)
            }
            className={selectClassName}
          >
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="alumni">Alumni</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Devise
          </label>
          <select
            value={formValues.cotisationDevise}
            onChange={(event) =>
              updateField("cotisationDevise", event.target.value as "US" | "HTG")
            }
            className={selectClassName}
          >
            <option value="US">US</option>
            <option value="HTG">GOURDES</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Montant cotisation
          </label>
          <input
            type="number"
            min={0}
            value={formValues.cotisationMontant}
            onChange={(event) =>
              updateField("cotisationMontant", Number(event.target.value))
            }
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Statut paiement
          </label>
          <select
            value={formValues.cotisationStatut}
            onChange={(event) =>
              updateField("cotisationStatut", event.target.value as PaymentStatus)
            }
            className={selectClassName}
          >
            <option value="paid">Paye</option>
            <option value="pending">En attente</option>
            <option value="late">En retard</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
