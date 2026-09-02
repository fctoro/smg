"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

import { useUserRole } from "@/context/UserRoleContext";

interface ClubSettingsForm {
  clubName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  categories: string;
  roles: string;
}

const defaultSettings: ClubSettingsForm = {
  clubName: "FC Toro",
  logoUrl: "/images/logo/fc-toro.png",
  primaryColor: "#D11829",
  secondaryColor: "#0D4EA6",
  categories: "ti toro, U8, U10, U12, U14, U16, U18",
  roles: "Coach, Assistant, Admin, Medical",
};

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function SettingsPage() {
  const { isSuperAdmin } = useUserRole();
  const [formValues, setFormValues] = useState<ClubSettingsForm>(defaultSettings);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const updateField = <K extends keyof ClubSettingsForm>(
    key: K,
    value: ClubSettingsForm[K],
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedAt(new Date().toLocaleTimeString("fr-FR"));
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Parametres" />

      {/* Superadmin Quick Access Banner */}
      {isSuperAdmin && (
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-brand-100/60 p-5 dark:border-brand-900/40 dark:bg-brand-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                🛡️ Espace Super Administrateur
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                Sauvegarde et Gestion de la Base de Données
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Téléchargez une sauvegarde intégrale du système sur votre Bureau ou gérez les comptes d'accès.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/parametres/sauvegarde"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
              >
                💾 Sauvegarde Système
              </Link>
              <Link
                href="/parametres/acces"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5 transition-colors"
              >
                🔒 Gestion des accès
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Parametres du club
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Logo, couleurs, categories et roles metier
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/parametres/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Config dashboard
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Nom du club
              </label>
              <input
                value={formValues.clubName}
                onChange={(event) => updateField("clubName", event.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Logo (URL)
              </label>
              <input
                value={formValues.logoUrl}
                onChange={(event) => updateField("logoUrl", event.target.value)}
                placeholder="https://..."
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Couleur primaire
              </label>
              <input
                type="color"
                value={formValues.primaryColor}
                onChange={(event) => updateField("primaryColor", event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Couleur secondaire
              </label>
              <input
                type="color"
                value={formValues.secondaryColor}
                onChange={(event) =>
                  updateField("secondaryColor", event.target.value)
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Categories (separees par virgule)
              </label>
              <input
                value={formValues.categories}
                onChange={(event) => updateField("categories", event.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Roles (separes par virgule)
              </label>
              <input
                value={formValues.roles}
                onChange={(event) => updateField("roles", event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {savedAt ? `Derniere sauvegarde: ${savedAt}` : "Modifications locales"}
            </p>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
