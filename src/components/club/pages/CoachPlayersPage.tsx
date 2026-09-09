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
import CoachMatchReportModal from "../modals/CoachMatchReportModal";
import { fetchEffectifsByCoach, deleteEffectif } from "@/lib/club/effectifs";
import { convertRostersToCSV, downloadCSV } from "@/lib/club/rosterExport";
import { useConfirm } from "@/hooks/useConfirm";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { TableSkeleton, CardSkeleton } from "@/components/ui/skeleton/Skeleton";
import Pagination from "@/components/tables/Pagination";
import PlayerTable from "@/components/club/PlayerTable";
import { PencilIcon, TrashBinIcon } from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import { colorFromPlayerStatus, playerStatusLabel } from "@/lib/club/status";
import { generatePlayerMatricule } from "@/lib/club/season";

interface CoachPlayersPageProps {
  initialTab?: "liste" | "effectifs";
}

export default function CoachPlayersPage({ initialTab }: CoachPlayersPageProps = {}) {
  const { players: allPlayers, setPlayers, hydrated } = useClubData();
  const { userCategories, userEmail } = useUserRole();
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get("tab") || searchParams?.get("subtab");
  const defaultTab = initialTab || (queryTab === "effectifs" ? "effectifs" : "liste");

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedViewPlayer, setSelectedViewPlayer] = useState<Player | null>(null);
  const [selectedEvalPlayer, setSelectedEvalPlayer] = useState<Player | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<"liste" | "effectifs">(defaultTab);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    const qTab = searchParams?.get("tab") || searchParams?.get("subtab");
    if (qTab === "effectifs" || initialTab === "effectifs") {
      setActiveTab("effectifs");
    } else if (qTab === "effectif" || qTab === "liste") {
      setActiveTab("liste");
    }
  }, [searchParams, initialTab]);

  // Rosters State
  const [rosters, setRosters] = useState<Effectif[]>([]);
  const [loadingRosters, setLoadingRosters] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<Effectif | null>(null);
  const [selectedReportRoster, setSelectedReportRoster] = useState<Effectif | null>(null);
  const [rosterPeriodFilter, setRosterPeriodFilter] = useState("all");

  // Pagination
  const [pagePerCategory, setPagePerCategory] = useState<Record<string, number>>({});
  const [playersPerPage, setPlayersPerPage] = useState(100);

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

  const parseTeams = (nom: string) => {
    const clean = nom || "";
    const parts = clean.split(/\s+vs\.?\s+/i);
    if (parts.length === 2) {
      return {
        team1: parts[0].trim(),
        team2: parts[1].trim(),
        isToroHome: parts[0].toLowerCase().includes("toro"),
      };
    }
    return {
      team1: "FC Toro",
      team2: clean.replace(/^FC Toro\s*/i, "").trim() || "Adversaire",
      isToroHome: true,
    };
  };

  const getScorers = (roster: Effectif) => {
    const events = (roster as any).match_events || [];
    const goalEvents = events.filter((e: any) => e.type === "goal");
    const scorersMap = new Map<string, { name: string; count: number }>();
    goalEvents.forEach((ev: any) => {
      const p = coachPlayers.find(pl => pl.id === ev.scorerId) || allPlayers.find(pl => pl.id === ev.scorerId);
      const name = p ? (p.nom ? `${p.prenom ? p.prenom.charAt(0) + '. ' : ''}${p.nom}` : p.prenom || "Joueur") : "Joueur";
      const cur = scorersMap.get(ev.scorerId) || { name, count: 0 };
      cur.count += 1;
      scorersMap.set(ev.scorerId, cur);
    });
    return Array.from(scorersMap.values());
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
              {filteredRosters.map((roster) => {
                const { team1, team2, isToroHome } = parseTeams(roster.nom);
                const scorers = getScorers(roster);
                const hasScore = roster.score_toro !== null && roster.score_toro !== undefined;
                const scoreLeft = isToroHome ? roster.score_toro : roster.score_adversaire;
                const scoreRight = isToroHome ? roster.score_adversaire : roster.score_toro;

                return (
                  <div key={roster.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    {/* Top Date / Cat pill centered */}
                    <div className="flex justify-center mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {roster.date_match} • {roster.categorie} • {(roster.joueurs || []).length} joueurs
                      </span>
                    </div>

                    {/* Match Scoreboard Row */}
                    <div className="grid grid-cols-12 items-center gap-2 my-2">
                      <div className="col-span-5 text-center">
                        <span className="font-bold text-gray-900 dark:text-white text-base block truncate">
                          {team1}
                        </span>
                      </div>

                      <div className="col-span-2 text-center">
                        {hasScore ? (
                          <span className="font-black text-xl text-gray-900 dark:text-white tracking-tight">
                            {scoreLeft ?? 0} - {scoreRight ?? 0}
                          </span>
                        ) : (
                          <span className="font-bold text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            VS
                          </span>
                        )}
                      </div>

                      <div className="col-span-5 text-center">
                        <span className="font-bold text-gray-900 dark:text-white text-base block truncate">
                          {team2}
                        </span>
                      </div>
                    </div>

                    {/* Scorers Section */}
                    {scorers.length > 0 && (
                      <div className="grid grid-cols-12 items-start gap-2 pt-1 pb-2 text-xs text-gray-700 dark:text-gray-300">
                        {isToroHome ? (
                          <>
                            <div className="col-span-5 text-right space-y-0.5">
                              {scorers.map(s => (
                                <div key={s.name} className="font-medium">
                                  {s.name} {s.count > 1 ? `(${s.count})` : ""}
                                </div>
                              ))}
                            </div>
                            <div className="col-span-2 flex justify-center pt-0.5">
                              <span className="text-sm leading-none">⚽</span>
                            </div>
                            <div className="col-span-5" />
                          </>
                        ) : (
                          <>
                            <div className="col-span-5" />
                            <div className="col-span-2 flex justify-center pt-0.5">
                              <span className="text-sm leading-none">⚽</span>
                            </div>
                            <div className="col-span-5 text-left space-y-0.5">
                              {scorers.map(s => (
                                <div key={s.name} className="font-medium">
                                  {s.name} {s.count > 1 ? `(${s.count})` : ""}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {roster.tactique_id ? (
                      <div className="mt-2 mb-3 text-xs flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <Link href={`/coach?tab=tactiques&planId=${roster.tactique_id}&effectifId=${roster.id}`} className="hover:underline font-medium">
                          Voir Tactique
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-2 mb-3 text-xs flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        <Link href={`/coach?tab=tactiques&effectifId=${roster.id}`} className="hover:underline hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                          Ouvrir sur le terrain (sans tactique)
                        </Link>
                      </div>
                    )}

                    <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
                      <button
                        onClick={() => setSelectedReportRoster(roster)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors shadow-xs"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{hasScore ? "Rapport" : "Saisir Score"}</span>
                      </button>
                      
                      <button
                        onClick={() => handleExportRoster(roster)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                        title="Exporter CSV"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>CSV</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRoster(roster);
                          setIsRosterModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center h-7 w-7 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 transition-colors shadow-xs shrink-0"
                        title="Modifier l'effectif"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteRoster(roster.id)}
                        className="inline-flex items-center justify-center h-7 w-7 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 transition-colors shadow-xs shrink-0"
                        title="Supprimer l'effectif"
                      >
                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
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

      {selectedReportRoster && (
        <CoachMatchReportModal
          isOpen={!!selectedReportRoster}
          onClose={() => setSelectedReportRoster(null)}
          effectif={selectedReportRoster}
          players={coachPlayers}
          onSuccess={(updatedRoster) => {
            setRosters(prev => prev.map(r => r.id === updatedRoster.id ? updatedRoster : r));
          }}
        />
      )}
    </div>
  );
}
