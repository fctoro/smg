"use client";

import React from "react";
import Image from "next/image";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import { getSavedPlans, SavedTacticalPlan, deletePlan } from "@/lib/club/tactics";
import Link from "next/link";
import { GroupIcon } from "@/icons";

import { CardSkeleton } from "@/components/ui/skeleton/Skeleton";

export default function CoachDashboardPage() {
  const { players: allPlayers, hydrated } = useClubData();
  const { userCategories } = useUserRole();
  const [savedPlans, setSavedPlans] = React.useState<SavedTacticalPlan[]>([]);

  React.useEffect(() => {
    setSavedPlans(getSavedPlans());
  }, []);

  const handleDeletePlan = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce plan tactique ?")) {
      deletePlan(id);
      setSavedPlans(getSavedPlans());
    }
  };

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // Filter players for coach's assigned categories
  const coachPlayers = allPlayers.filter(
    (p) => userCategories && userCategories.includes(p.categorie)
  );

  // Compute metrics
  const totalPlayers = coachPlayers.length;
  const activePlayers = coachPlayers.filter(
    (p) => !p.statut || p.statut === "actif"
  ).length;
  const injuredPlayers = coachPlayers.filter((p) => p.statut === "blesse").length;
  const suspendedPlayers = coachPlayers.filter((p) => p.statut === "suspendu").length;

  const unavailablePlayers = coachPlayers.filter(
    (p) => p.statut === "blesse" || p.statut === "suspendu"
  );

  // Calculate position counts
  const countPosition = (posStr: string) => coachPlayers.filter(
    (p) => p.poste?.toLowerCase().includes(posStr.toLowerCase())
  ).length;

  const countGK = coachPlayers.filter((p) => p.poste === "GK" || p.poste === "Gardien").length;
  const countDEF = countPosition("def") + countPosition("cb") + countPosition("lb") + countPosition("rb");
  const countMID = countPosition("mil") + countPosition("md") + countPosition("mc") + countPosition("mo") + countPosition("cdm") + countPosition("cm") + countPosition("cam");
  const countATT = countPosition("att") + countPosition("av") + countPosition("st") + countPosition("rw") + countPosition("lw");


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Tableau de Bord Coach
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Aperçu global de votre effectif et des indisponibilités.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <GroupIcon />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Effectif Total</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{totalPlayers}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Joueurs Actifs</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{activePlayers}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Blessés</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{injuredPlayers}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Suspendus</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{suspendedPlayers}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Position Breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Répartition par Poste
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">Gardiens</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{countGK}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">Défenseurs</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{countDEF}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">Milieux</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{countMID}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">Attaquants</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{countATT}</p>
            </div>
          </div>
        </div>

        {/* Unavailable Players */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Joueurs Indisponibles
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Blessés ou suspendus, ces joueurs ne peuvent pas participer au prochain match.
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {unavailablePlayers.length > 0 ? (
              unavailablePlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Image
                      src={player.photoUrl || "/images/user/user-01.jpg"}
                      alt={getPlayerFullName(player)}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover shadow-sm"
                      unoptimized
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {getPlayerFullName(player)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {player.poste || "Poste inconnu"} • {player.categorie}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      player.statut === "blesse"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                    }`}
                  >
                    {player.statut}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 dark:border-gray-800">
                <svg className="mb-2 h-8 w-8 text-green-500 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Aucun joueur indisponible
                </p>
                <p className="text-xs text-gray-500">Tout l'effectif est prêt à jouer !</p>
              </div>
            )}
          </div>
        </div>

        {/* Saved Plans Table */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Historique des Plans Tactiques
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Aperçu de vos tactiques sous forme de tableau.
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Nom du plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Formation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
                {savedPlans.length > 0 ? (
                  savedPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{plan.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{plan.formationId}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(plan.createdAt).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/coach?tab=tactiques&planId=${plan.id}`} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300 mr-4">
                          Ouvrir
                        </Link>
                        <button onClick={() => handleDeletePlan(plan.id)} className="text-error-600 hover:text-error-900 dark:text-error-400 dark:hover:text-error-300">
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      Aucun plan sauvegardé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
