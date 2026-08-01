"use client";

import { getCurrentSeason, getDynamicSeasonOptions } from "@/lib/club/season";

import React, { useState } from "react";
import { Coach } from "@/types/club";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";

export interface CoachFormValues {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sexe: string;
  categories: string[];
  saison: string;
}

interface CoachFormProps {
  initialValues?: Partial<CoachFormValues>;
  onSubmit: (values: CoachFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export default function CoachForm({
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  isSubmitting = false,
}: CoachFormProps) {
  const [formData, setFormData] = useState<CoachFormValues>({
    nom: initialValues.nom || "",
    prenom: initialValues.prenom || "",
    email: initialValues.email || "",
    telephone: initialValues.telephone || "",
    sexe: initialValues.sexe || "Masculin",
    categories: initialValues.categories || [],
    saison: initialValues.saison || getCurrentSeason(),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => {
      if (prev.categories.includes(category)) {
        return { ...prev, categories: prev.categories.filter((c) => c !== category) };
      } else {
        return { ...prev, categories: [...prev.categories, category] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nom <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Prénom <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            name="prenom"
            value={formData.prenom}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email <span className="text-error-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Téléphone
          </label>
          <input
            type="text"
            name="telephone"
            value={formData.telephone}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Sexe
          </label>
          <select
            name="sexe"
            value={formData.sexe}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
          >
            <option value="Masculin">Masculin</option>
            <option value="Féminin">Féminin</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Saison
          </label>
          <select
            name="saison"
            value={formData.saison}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
          >
            {getDynamicSeasonOptions().map((opt) => (
              <option key={opt} value={opt}>
                Saison {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Catégories gérées <span className="text-error-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                formData.categories.includes(cat)
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting || formData.categories.length === 0}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:opacity-50"
        >
          {isSubmitting ? "Enregistrement..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
