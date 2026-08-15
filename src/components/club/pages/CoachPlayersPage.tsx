"use client";

import React, { useState, useEffect } from "react";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { Player, Effectif } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { CoachPlayerStatusModal } from "../modals/CoachPlayerStatusModal";
import { PlayerViewModal } from "../modals/PlayerViewModal";
import { CoachPlayerEvaluationModal } from "../modals/CoachPlayerEvaluationModal";
import { RosterFormModal } from "../modals/RosterFormModal";
import { fetchEffectifsByCoach, deleteEffectif } from "@/lib/club/effectifs";
import { convertRostersToCSV, downloadCSV } from "@/lib/club/rosterExport";
import { useConfirm } from "@/hooks/useConfirm";
import Link from "next/link";

import { TableSkeleton, CardSkeleton } from "@/components/ui/skeleton/Skeleton";
import Pagination from "@/components/tables/Pagination";
import PlayerTable from "@/components/club/PlayerTable";
import { PencilIcon, TrashBinIcon } from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import { colorFromPlayerStatus, playerStatusLabel } from "@/lib/club/status";
import { generatePlayerMatricule } from "@/lib/club/season";

export default function CoachPlayersPage() {
  const { players: allPlayers, setPlayers, hydrated } = useClubData();
  const { userCategories, userEmail } = useUserRole();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedViewPlayer, setSelectedViewPlayer] = useState<Player | null>(null);
  const [selectedEvalPlayer, setSelectedEvalPlayer] = useState<Player | null>(null);
  
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
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PlayerTable
            players={coachPlayers}
            columns={["avatarNom", "poste", "sexe", "statut", "categorie", "saison", "actions"]}
            title="Effectif Joueurs"
            showToolbar={true}
            pageSize={10}
            availableCategories={userCategories}
            exportButton={
              coachPlayers.length > 0 ? (
                <button
                  onClick={handleExportPlayers}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent bg-emerald-500 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exporter Excel / CSV
                </button>
              ) : undefined
            }
            onViewPlayer={(player) => setSelectedViewPlayer(player)}
            onEditPlayer={(player) => setSelectedPlayer(player)}
            onEvaluatePlayer={(player) => setSelectedEvalPlayer(player)}
            emptyMessage="Aucun joueur trouvé pour vos catégories assignées."
          />
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
                    <div className="mb-4 text-sm flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      <Link href={`/coach?tab=tactiques&effectifId=${roster.id}`} className="hover:underline hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                        Ouvrir sur le terrain (sans tactique)
                      </Link>
                    </div>
                  )}


                  <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                    <button
                      onClick={() => handleExportRoster(roster)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
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
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 transition-colors shadow-xs"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-500" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteRoster(roster.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 transition-colors shadow-xs"
                    >
                      <TrashBinIcon className="w-4 h-4 text-red-500" />
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

      <PlayerViewModal
        isOpen={!!selectedViewPlayer}
        onClose={() => setSelectedViewPlayer(null)}
        player={selectedViewPlayer}
        hideParentsAndDocs={true}
      />

      <CoachPlayerEvaluationModal
        isOpen={!!selectedEvalPlayer}
        onClose={() => setSelectedEvalPlayer(null)}
        player={selectedEvalPlayer}
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
