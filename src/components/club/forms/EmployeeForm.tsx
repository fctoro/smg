"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmployeeFormValues } from "@/types/club";

interface EmployeeFormProps {
  initialValues?: Partial<EmployeeFormValues>;
  onSubmit: (values: EmployeeFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const defaultValues: EmployeeFormValues = {
  nom: "",
  prenom: "",
  sexe: "M",
  fonction: "Employé",
  salaire: null,
  dateEmbauche: "",
  telephone: "",
  email: "",
  adresse: "",
  niveauEtude: "",
  profession: "",
  desactive: false,
};

export default function EmployeeForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: EmployeeFormProps) {
  const [formValues, setFormValues] = useState<EmployeeFormValues>({
    ...defaultValues,
    ...initialValues,
    fonction: initialValues?.fonction || initialValues?.role || defaultValues.fonction,
    dateEmbauche: initialValues?.dateEmbauche || initialValues?.dateDebut || defaultValues.dateEmbauche,
  });

  useEffect(() => {
    setFormValues({
      ...defaultValues,
      ...initialValues,
      fonction: initialValues?.fonction || initialValues?.role || defaultValues.fonction,
      dateEmbauche: initialValues?.dateEmbauche || initialValues?.dateDebut || defaultValues.dateEmbauche,
    });
  }, [initialValues]);

  const updateField = <K extends keyof EmployeeFormValues>(
    key: K,
    value: EmployeeFormValues[K],
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      ...formValues,
      role: formValues.fonction,
      dateDebut: formValues.dateEmbauche,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Prénom
          </label>
          <input
            required
            value={formValues.prenom}
            onChange={(event) => updateField("prenom", event.target.value)}
            className={inputClassName}
            placeholder="Ex: Pascal"
          />
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
            placeholder="Ex: Bonnefil"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Sexe
          </label>
          <select
            value={formValues.sexe || "M"}
            onChange={(event) => updateField("sexe", event.target.value)}
            className={selectClassName}
          >
            <option value="M">Masculin (M)</option>
            <option value="F">Féminin (F)</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Fonction / Poste
          </label>
          <input
            required
            value={formValues.fonction}
            onChange={(event) => updateField("fonction", event.target.value)}
            className={inputClassName}
            placeholder="Ex: Directeur du Centre, Gardien, Chauffeur..."
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Téléphone
          </label>
          <input
            value={formValues.telephone}
            onChange={(event) => updateField("telephone", event.target.value)}
            className={inputClassName}
            placeholder="Ex: 3701-4830"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Email
          </label>
          <input
            type="email"
            value={formValues.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
            placeholder="Ex: pbonnefil@haytrac.com"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Date d'embauche
          </label>
          <input
            type="date"
            value={formValues.dateEmbauche}
            onChange={(event) => updateField("dateEmbauche", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Salaire (HTG / USD)
          </label>
          <input
            type="number"
            value={formValues.salaire ?? ""}
            onChange={(event) =>
              updateField("salaire", event.target.value ? parseFloat(event.target.value) : null)
            }
            className={inputClassName}
            placeholder="Ex: 25000"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Niveau d'étude
          </label>
          <input
            value={formValues.niveauEtude}
            onChange={(event) => updateField("niveauEtude", event.target.value)}
            className={inputClassName}
            placeholder="Ex: Universitaire"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Adresse
          </label>
          <input
            value={formValues.adresse}
            onChange={(event) => updateField("adresse", event.target.value)}
            className={inputClassName}
            placeholder="Ex: Delmas 75, Rue Fontenay #7"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Statut du compte
          </label>
          <select
            value={formValues.desactive ? "1" : "0"}
            onChange={(event) => updateField("desactive", event.target.value === "1")}
            className={selectClassName}
          >
            <option value="0">Actif</option>
            <option value="1">Inactif / Désactivé</option>
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
