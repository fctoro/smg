"use client";

import React, { useState } from "react";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { CoachPlayerStatusModal } from "../modals/CoachPlayerStatusModal";

export default function CoachPlayersPage() {
  const { players: allPlayers, setPlayers, hydrated } = useClubData();
  const { userCategories } = useUserRole();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Chargement de l'effectif...</p>
      </div>
    );
  }

  // Filter players that belong to the coach's assigned categories
  const coachPlayers = allPlayers.filter(
    (p) => userCategories && userCategories.includes(p.categorie)
  );

  // Group by category
  const playersByCategory = coachPlayers.reduce((acc, player) => {
    const cat = player.categorie || "Sans catégorie";
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

  // Determine categories to display (even empty ones if assigned)
  const categoriesToDisplay = userCategories || [];

  const handleSuccessUpdate = (updatedPlayer: Player) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p))
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Effectif Joueurs</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Gérez le statut de vos joueurs par catégorie.
        </p>
      </div>

      {categoriesToDisplay.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            Aucune catégorie ne vous a été assignée. Veuillez contacter un administrateur.
          </p>
        </div>
      ) : (
        categoriesToDisplay.map((category) => {
          const playersInCat = playersByCategory[category] || [];

          return (
            <div key={category} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Catégorie {category}
                </h2>
                <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {playersInCat.length} joueur(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                  <thead className="bg-gray-50/50 text-xs uppercase text-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Nom du Joueur</th>
                      <th className="px-6 py-4 font-medium">Poste</th>
                      <th className="px-6 py-4 font-medium">Statut</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {playersInCat.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Aucun joueur enregistré dans cette catégorie.
                        </td>
                      </tr>
                    ) : (
                      playersInCat.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {getPlayerFullName(player)}
                          </td>
                          <td className="px-6 py-4">
                            {player.poste || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                player.statut === "actif"
                                  ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                  : player.statut === "blesse"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                  : player.statut === "suspendu"
                                  ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {player.statut || "Non défini"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedPlayer(player)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Modifier
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      <CoachPlayerStatusModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
        onSuccess={handleSuccessUpdate}
      />
    </div>
  );
}
