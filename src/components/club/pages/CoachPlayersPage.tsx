"use client";

import React, { useState, useEffect } from "react";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { Player, Effectif } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { CoachPlayerStatusModal } from "../modals/CoachPlayerStatusModal";
import { RosterFormModal } from "../modals/RosterFormModal";
import { fetchEffectifsByCoach, deleteEffectif } from "@/lib/club/effectifs";
import { convertRostersToCSV, downloadCSV } from "@/lib/club/rosterExport";
import { useConfirm } from "@/hooks/useConfirm";
import Link from "next/link";

import { TableSkeleton, CardSkeleton } from "@/components/ui/skeleton/Skeleton";
import Pagination from "@/components/tables/Pagination";

export default function CoachPlayersPage() {
  const { players: allPlayers, setPlayers, hydrated } = useClubData();
  const { userCategories, userEmail } = useUserRole();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<"liste" | "effectifs">("liste");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Rosters State
  const [rosters, setRosters] = useState<Effectif[]>([]);
  const [loadingRosters, setLoadingRosters] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<Effectif | null>(null);
  const [rosterPeriodFilter, setRosterPeriodFilter] = useState("all");

  // Pagination
  const [pagePerCategory, setPagePerCategory] = useState<Record<string, number>>({});
  const [playersPerPage, setPlayersPerPage] = useState(10);

  const handlePageChange = (category: string, newPage: number) => {
    setPagePerCategory(prev => ({ ...prev, [category]: newPage }));
  };

  const { confirm, ConfirmComponent } = useConfirm();

  const coachEmail = userEmail || "";

  useEffect(() => {
    if (activeTab === "effectifs" && coachEmail) {
      loadRosters();
    }
  }, [activeTab, coachEmail]);

  const loadRosters = async () => {
    setLoadingRosters(true);
    const data = await fetchEffectifsByCoach(coachEmail);
    setRosters(data);
    setLoadingRosters(false);
  };

  const categoriesToDisplay = userCategories || [];

  useEffect(() => {
    if (categoriesToDisplay.length > 0 && !selectedCategory) {
      setSelectedCategory(categoriesToDisplay[0]);
    }
  }, [categoriesToDisplay, selectedCategory]);

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-white rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900">
          <TableSkeleton rows={6} columns={4} />
        </div>
      </div>
    );
  }

  // Categories logic
  const coachPlayers = allPlayers.filter(
    (p) => userCategories && userCategories.includes(p.categorie)
  );

  const playersByCategory = coachPlayers.reduce((acc, player) => {
    const cat = player.categorie || "Sans Catégorie";
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

  const handleSuccessUpdate = (updatedPlayer: Player) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p))
    );
  };

  // Rosters logic
  const filteredRosters = rosterPeriodFilter === "all" 
    ? rosters 
    : rosters.filter(r => r.periode === rosterPeriodFilter);

  const uniquePeriods = Array.from(new Set(rosters.map(r => r.periode))).filter(Boolean);

  const handleRosterSuccess = (newRoster: Effectif) => {
    loadRosters();
  };

  const handleDeleteRoster = (id: string) => {
    confirm({
      title: "Supprimer l'effectif",
      message: "Êtes-vous sûr de vouloir supprimer cet effectif ?",
      onConfirm: async () => {
        await deleteEffectif(id);
        loadRosters();
      }
    });
  };

  const handleExportRoster = (roster: Effectif) => {
    const playersMap = coachPlayers.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Player>);
    const csvContent = convertRostersToCSV([roster], playersMap);
    downloadCSV(csvContent, `Effectif_${roster.nom}.csv`);
  };

  const handleExportAllRosters = () => {
    const playersMap = coachPlayers.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Player>);
    const csvContent = convertRostersToCSV(filteredRosters, playersMap);
    downloadCSV(csvContent, `Effectifs_${rosterPeriodFilter === "all" ? "ToutesPeriodes" : rosterPeriodFilter}.csv`);
  };

  const handleExportPlayers = () => {
    const playersToExport = selectedCategory && playersByCategory[selectedCategory] 
      ? playersByCategory[selectedCategory] 
      : coachPlayers;
      
    const headers = ["Nom", "Poste", "Statut", "Sexe", "Catégorie", "Date de naissance"];
    const rows = playersToExport.map(p => [
      getPlayerFullName(p),
      p.poste || "",
      p.statut || "",
      p.sexe || "",
      p.categorie || "",
      p.dateNaissance || ""
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    downloadCSV(csvContent, `Joueurs_${selectedCategory || 'Coach'}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Effectif Joueurs</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gérez vos joueurs et vos effectifs de match.
          </p>
        </div>
        
        {/* Controls when in effectifs tab */}
        {activeTab === "effectifs" && (
          <div className="flex items-center gap-3">
            <select
              value={rosterPeriodFilter}
              onChange={(e) => setRosterPeriodFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Toutes les Périodes</option>
              {uniquePeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            
            {filteredRosters.length > 0 && (
              <button
                onClick={handleExportAllRosters}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent bg-emerald-500 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            )}
            
            <button
              onClick={() => {
                setSelectedRoster(null);
                setIsRosterModalOpen(true);
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors"
            >
              + Nouvel Effectif
            </button>
          </div>
        )}

        {/* Controls when in liste tab */}
        {activeTab === "liste" && coachPlayers.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPlayers}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent bg-emerald-500 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter Excel / CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("liste")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "liste"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Liste Globale
          </button>
          <button
            onClick={() => setActiveTab("effectifs")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "effectifs"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Effectifs de Match
          </button>
        </nav>
      </div>

      {activeTab === "liste" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {categoriesToDisplay.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-500 dark:text-gray-400">
                Aucune Catégorie ne vous a été assignée. Veuillez contacter un administrateur.
              </p>
            </div>
          ) : (
            <>
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-3">
                {categoriesToDisplay.map((category) => {
                  const isActive = selectedCategory === category;
                  const count = (playersByCategory[category] || []).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold transition-all
                        ${isActive 
                          ? "bg-white text-brand-600 shadow-sm border border-brand-200 dark:bg-gray-800 dark:border-brand-500/30 dark:text-brand-400" 
                          : "bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:bg-gray-800"}`}
                    >
                      <span>{category}</span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white
                        ${isActive ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-700"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Single Table for Selected Category */}
              {(() => {
                const category = selectedCategory;
                const playersInCat = playersByCategory[category] || [];
                
                return (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                              Aucun joueur enregistré dans cette Catégorie.
                            </td>
                          </tr>
                        ) : (() => {
                          const currentPage = pagePerCategory[category] || 1;
                          const totalPages = Math.ceil(playersInCat.length / playersPerPage);
                          const startIndex = (currentPage - 1) * playersPerPage;
                          const paginatedPlayers = playersInCat.slice(startIndex, startIndex + playersPerPage);

                          return paginatedPlayers.map((player) => (
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
                                  Modifier
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination controls */}
                  {playersInCat.length > playersPerPage && (
                    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Affichage de <span className="font-medium">{((pagePerCategory[category] || 1) - 1) * playersPerPage + 1}</span> à <span className="font-medium">{Math.min((pagePerCategory[category] || 1) * playersPerPage, playersInCat.length)}</span> sur <span className="font-medium">{playersInCat.length}</span> joueurs
                      </p>
                      <Pagination
                        currentPage={pagePerCategory[category] || 1}
                        totalPages={Math.ceil(playersInCat.length / playersPerPage)}
                        onPageChange={(page) => handlePageChange(category, page)}
                        pageSize={playersPerPage}
                        onPageSizeChange={(size) => setPlayersPerPage(size)}
                      />
                    </div>
                  )}
                </div>
              );
              })()}
            </>
          )}
        </div>
      )}

      {activeTab === "effectifs" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {loadingRosters ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredRosters.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
              <p className="text-gray-500">Aucun effectif trouvé pour cette Période.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRosters.map((roster) => (
                <div key={roster.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{roster.nom}</h3>
                      <p className="text-xs text-gray-500">{roster.date_match} A* {roster.categorie}</p>
                    </div>
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium px-2 py-1 rounded-full shrink-0">
                      {(roster.joueurs || []).length} joueurs
                    </span>
                  </div>
                  
                  {roster.tactique_id ? (
                    <div className="mb-4 text-sm flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <Link href={`/coach?tab=tactiques&planId=${roster.tactique_id}&effectifId=${roster.id}`} className="hover:underline">
                        Voir Tactique
                      </Link>
                    </div>
                  ) : (
                    <div className="mb-4 text-sm text-gray-400 italic">Aucune tactique</div>
                  )}

                  <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                    <button
                      onClick={() => handleExportRoster(roster)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 border border-transparent rounded-lg hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export CSV
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRoster(roster);
                        setIsRosterModalOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteRoster(roster.id)}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-white bg-red-500 border border-transparent rounded-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors shadow-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CoachPlayerStatusModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
        onSuccess={handleSuccessUpdate}
      />

      <RosterFormModal
        isOpen={isRosterModalOpen}
        onClose={() => {
          setIsRosterModalOpen(false);
          setSelectedRoster(null);
        }}
        categories={categoriesToDisplay}
        players={coachPlayers}
        coachEmail={coachEmail}
        initialData={selectedRoster}
        onSuccess={handleRosterSuccess}
      />

      <ConfirmComponent />
    </div>
  );
}
