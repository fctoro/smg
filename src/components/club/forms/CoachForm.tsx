"use client";

import { getCurrentSeason, getDynamicSeasonOptions } from "@/lib/club/season";

import React, { useState } from "react";
import { Coach } from "@/types/club";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { useClubData } from "@/context/ClubDataContext";

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
  const { employees } = useClubData();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const [formData, setFormData] = useState<CoachFormValues>({
    nom: initialValues.nom || "",
    prenom: initialValues.prenom || "",
    email: initialValues.email || "",
    telephone: initialValues.telephone || "",
    sexe: initialValues.sexe || "Masculin",
    categories: initialValues.categories || [],
    saison: initialValues.saison || getCurrentSeason(),
  });

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) return;
    const emp = employees.find((e) => e.id === empId || String(e.employeId) === empId);
    if (emp) {
      setFormData((prev) => ({
        ...prev,
        nom: emp.nom || prev.nom,
        prenom: emp.prenom || prev.prenom,
        email: emp.email || prev.email,
        telephone: emp.telephone || prev.telephone,
        sexe: emp.sexe === "F" ? "Féminin" : emp.sexe === "M" ? "Masculin" : emp.sexe || prev.sexe,
      }));
    }
  };

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
      {/* Sélecteur d'employé existant pour préremplir les données du coach */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
        <label className="mb-1.5 block text-sm font-semibold text-brand-900 dark:text-brand-200">
          Sélectionner un employé existant pour préremplir (Optionnel)
        </label>
        <select
          value={selectedEmployeeId}
          onChange={(e) => handleSelectEmployee(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">-- Choisir un employé existant --</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.prenom} {emp.nom} {emp.fonction ? `(${emp.fonction})` : ""}
            </option>
          ))}
        </select>
        {selectedEmployeeId && (
          <p className="mt-2 text-xs font-medium text-brand-700 dark:text-brand-300">
            ✓ Informations pré-remplies automatiquement depuis la fiche employé.
          </p>
        )}
      </div>

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
