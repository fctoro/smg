"use client";

import React from "react";
import Image from "next/image";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import { Effectif } from "@/types/club";
import { fetchEffectifsByCoach, deleteEffectif } from "@/lib/club/effectifs";
import Link from "next/link";
import { GroupIcon } from "@/icons";
import Pagination from "@/components/tables/Pagination";

import { CardSkeleton } from "@/components/ui/skeleton/Skeleton";

export default function CoachDashboardPage() {
  const { players: allPlayers, hydrated } = useClubData();
  const { userCategories, userEmail } = useUserRole();
  const coachEmail = userEmail || "";
  const [recentMatches, setRecentMatches] = React.useState<Effectif[]>([]);
  const [loadingMatches, setLoadingMatches] = React.useState(true);
  const [unavailablePage, setUnavailablePage] = React.useState(1);
  const [unavailablePageSize, setUnavailablePageSize] = React.useState(10);

  const loadRecentMatches = React.useCallback(async () => {
    if (!coachEmail) return;
    setLoadingMatches(true);
    const data = await fetchEffectifsByCoach(coachEmail);
    // Sort by date_match descending and slice the top 5
    const sorted = [...data].sort((a, b) => {
      const dateA = new Date(a.date_match || a.created_at || 0).getTime();
      const dateB = new Date(b.date_match || b.created_at || 0).getTime();
      return dateB - dateA;
    });
    setRecentMatches(sorted.slice(0, 5));
    setLoadingMatches(false);
  }, [coachEmail]);

  React.useEffect(() => {
    loadRecentMatches();
  }, [loadRecentMatches]);

  const handleDeleteMatch = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet effectif de match ?")) {
      await deleteEffectif(id);
      loadRecentMatches();
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
  const countPosition = (posStr: string) => coachPlayers.filter((p) => {
    const pStr = (p.poste || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return pStr.includes(posStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  }).length;

  const countGK = coachPlayers.filter((p) => {
    const pStr = (p.poste || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return pStr.includes("gardien") || pStr === "gk";
  }).length;
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
        {/* Effectif Total */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-blue-600 dark:text-blue-400">
              <GroupIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Effectif Total</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{totalPlayers}</h4>
            </div>
          </div>
        </div>

        {/* Joueurs Actifs (Vert) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-emerald-500 dark:text-emerald-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Joueurs Actifs</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{activePlayers}</h4>
            </div>
          </div>
        </div>

        {/* Blessés (Jaune) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-amber-500 dark:text-amber-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Blessés</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{injuredPlayers}</h4>
            </div>
          </div>
        </div>

        {/* Suspendus (Rouge) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-rose-500 dark:text-rose-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Répartition par Poste
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Effectif tactique détaillé selon les postes sur le terrain
              </p>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {totalPlayers} joueurs au total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gardiens */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200/90 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Gardiens
                  </span>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
                    {countGK}
                  </p>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                    {countGK > 1 ? "Gardiens disponibles" : "Gardien disponible"}
                  </span>
                </div>
                <div className="relative h-13 w-13 sm:h-14 sm:w-14 shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src="/images/positions/gardien.png"
                    alt="Gardien"
                    fill
                    className="object-contain dark:invert"
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Défenseurs */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200/90 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Défenseurs
                  </span>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
                    {countDEF}
                  </p>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                    {countDEF > 1 ? "Défenseurs disponibles" : "Défenseur disponible"}
                  </span>
                </div>
                <div className="relative h-16 w-16 sm:h-18 sm:w-18 shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src="/images/positions/defenseur.png"
                    alt="Défenseur"
                    fill
                    className="object-contain dark:invert"
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Milieux */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200/90 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Milieux
                  </span>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
                    {countMID}
                  </p>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                    {countMID > 1 ? "Milieux disponibles" : "Milieu disponible"}
                  </span>
                </div>
                <div className="relative h-15 w-15 sm:h-16 sm:w-16 shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src="/images/positions/milieu.png"
                    alt="Milieu"
                    fill
                    className="object-contain dark:invert"
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Attaquants */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200/90 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Attaquants
                  </span>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
                    {countATT}
                  </p>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                    {countATT > 1 ? "Attaquants disponibles" : "Attaquant disponible"}
                  </span>
                </div>
                <div className="relative h-16 w-16 sm:h-18 sm:w-18 shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src="/images/positions/attaquant.png"
                    alt="Attaquant"
                    fill
                    className="object-contain dark:invert"
                    unoptimized
                  />
                </div>
              </div>
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

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-4">
            {unavailablePlayers.length > 0 ? (
              unavailablePlayers
                .slice((unavailablePage - 1) * unavailablePageSize, unavailablePage * unavailablePageSize)
                .map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {player.photoUrl && !player.photoUrl.includes("user-01") && !player.photoUrl.includes("silhouette") ? (
                      <Image
                        src={player.photoUrl}
                        alt={getPlayerFullName(player)}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover shadow-sm"
                        unoptimized
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-xs flex items-center justify-center shadow-xs border border-brand-400 shrink-0">
                        {player.prenom?.charAt(0)}{player.nom?.charAt(0)}
                      </div>
                    )}
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
          
          {unavailablePlayers.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <Pagination
                currentPage={unavailablePage}
                totalPages={Math.ceil(unavailablePlayers.length / unavailablePageSize)}
                onPageChange={setUnavailablePage}
                pageSize={unavailablePageSize}
                onPageSizeChange={(size) => {
                  setUnavailablePageSize(size);
                  setUnavailablePage(1);
                }}
                pageSizeOptions={[5, 10, 20]}
              />
            </div>
          )}
        </div>

        {/* Recent 5 Matches Table */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Historique des 5 Derniers Matchs
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aperçu de vos 5 dernières rencontres selon la date du match.
              </p>
            </div>
            <Link
              href="/coach?tab=effectifs"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
            >
              Voir tous les effectifs →
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Match</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Résultat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
                {loadingMatches ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      Chargement des matchs...
                    </td>
                  </tr>
                ) : recentMatches.length > 0 ? (
                  recentMatches.map((match) => {
                    const hasScore = match.score_toro !== null && match.score_toro !== undefined;
                    const scoreToro = match.score_toro ?? 0;
                    const scoreAdv = match.score_adversaire ?? 0;
                    const isWin = scoreToro > scoreAdv;
                    const isDraw = scoreToro === scoreAdv;

                    // Format date
                    const formattedDate = match.date_match 
                      ? new Date(match.date_match).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', year: 'numeric' })
                      : "-";

                    return (
                      <tr key={match.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {match.nom}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {match.categorie} • {(match.joueurs || []).length} joueurs
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {hasScore ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black border ${
                                isWin
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : isDraw
                                  ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              }`}>
                                {isWin ? "V" : isDraw ? "N" : "D"}
                              </span>
                              <span className="font-bold text-xs text-gray-900 dark:text-white">
                                {scoreToro} - {scoreAdv}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              Non saisi
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {formattedDate}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold">
                          <Link 
                            href={`/coach?tab=tactiques&effectifId=${match.id}${match.tactique_id ? `&planId=${match.tactique_id}` : ''}`} 
                            className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300 mr-3"
                          >
                            Tactique
                          </Link>
                          <button 
                            onClick={() => handleDeleteMatch(match.id)} 
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      Aucun match trouvé dans l'historique
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
