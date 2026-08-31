"use client";

import React, { useState, useMemo } from "react";
import { Coach } from "@/types/club";
import Link from "next/link";
import { EyeIcon, PencilIcon, TrashBinIcon } from "@/icons";

import { getDynamicSeasonOptions } from "@/lib/club/season";

interface CoachTableProps {
  coaches: Coach[];
  onDelete: (coach: Coach) => void;
  actionButton?: React.ReactNode;
}

export default function CoachTable({ coaches, onDelete, actionButton }: CoachTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");

  const categories = useMemo(() => {
    const customCats = coaches.flatMap((c) => c.categories || []);
    const unique = Array.from(new Set(customCats));
    return unique.sort();
  }, [coaches]);

  const seasons = useMemo(() => {
    const customSeasons = coaches.map((c) => c.saison).filter(Boolean) as string[];
    const allOptions = Array.from(new Set([...getDynamicSeasonOptions(), ...customSeasons]));
    return allOptions.sort((a, b) => b.localeCompare(a));
  }, [coaches]);

  const filteredCoaches = useMemo(() => {
    return coaches
      .filter((c) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          (c.nom || "").toLowerCase().includes(q) ||
          (c.prenom || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q);

        const matchesCat =
          selectedCategory === "all" ||
          (c.categories && c.categories.includes(selectedCategory));

        const matchesSeason =
          selectedSeason === "all" || c.saison === selectedSeason;

        return matchesSearch && matchesCat && matchesSeason;
      })
      .sort((a, b) => {
        const nomA = (a.nom || "").trim();
        const nomB = (b.nom || "").trim();
        const nomCompare = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
        if (nomCompare !== 0) return nomCompare;
        const prenomA = (a.prenom || "").trim();
        const prenomB = (b.prenom || "").trim();
        return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
      });
  }, [coaches, searchQuery, selectedCategory, selectedSeason]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* En-tête avec Titre et Action */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Liste des Coachs
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filteredCoaches.length} coach(s)
          </p>
        </div>

        {actionButton ? (
          <div className="shrink-0 flex items-center">{actionButton}</div>
        ) : null}
      </div>

      {/* Barre d'outils de filtres */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
        <div className="min-w-0">
          <input
            type="text"
            placeholder="Rechercher (nom, email)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div className="min-w-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">Toutes les saisons</option>
            {seasons.map((saison) => (
              <option key={saison} value={saison}>
                {String(saison).toLowerCase().startsWith('saison') ? saison : `Saison ${saison}`}
              </option>
            ))}
          </select>
        </div>
      </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th scope="col" className="px-6 py-4">Nom Complet</th>
              <th scope="col" className="px-6 py-4">Saison</th>
              <th scope="col" className="px-6 py-4">Catégories</th>
              <th scope="col" className="px-6 py-4">Email / Contact</th>
              <th scope="col" className="px-6 py-4">Sexe</th>
              <th scope="col" className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-transparent">
            {filteredCoaches.length > 0 ? (
              filteredCoaches.map((coach) => (
                <tr key={coach.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {coach.nom} {coach.prenom}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {coach.saison || "-"}
                  </td>
                  <td className="px-6 py-4">
                    {coach.categories?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {coach.categories.map((cat, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                            {cat}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">Aucune</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p>{coach.email}</p>
                    <p className="text-xs text-gray-400">{coach.telephone}</p>
                  </td>
                  <td className="px-6 py-4">{coach.sexe || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/coachs/${coach.id}/modifier`}
                        className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                        aria-label="Modifier"
                        title="Modifier"
                      >
                        <PencilIcon className="size-5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(coach)}
                        className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                        aria-label="Supprimer"
                        title="Supprimer"
                      >
                        <TrashBinIcon className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  Aucun coach trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
