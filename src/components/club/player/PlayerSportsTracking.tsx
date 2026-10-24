"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentSeason } from "@/lib/club/season";
import { useClubData } from "@/context/ClubDataContext";
import { Modal } from "@/components/ui/modal";
import { U8EvaluationData, parseEvaluationComments } from "@/types/evaluation";
import { OfficialEvaluationSheet } from "@/components/club/evaluations/OfficialEvaluationSheet";

interface PlayerSportsTrackingProps {
  playerId: string;
  playerCategory?: string;
}

export const PlayerSportsTracking: React.FC<PlayerSportsTrackingProps> = ({
  playerId,
  playerCategory: propCategory,
}) => {
  const { players: allPlayers } = useClubData();
  const [rawAttendances, setRawAttendances] = useState<any[]>([]);
  const [teamMatchAttendances, setTeamMatchAttendances] = useState<any[]>([]);
  const [matchReports, setMatchReports] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<U8EvaluationData | null>(null);
  const [isAllDrawerOpen, setIsAllDrawerOpen] = useState(false);
  const [filterSeason, setFilterSeason] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const effectiveCategory = React.useMemo(() => {
    if (propCategory) return propCategory;
    const p = allPlayers.find((item) => item.id === playerId);
    return p?.categorie || "";
  }, [propCategory, allPlayers, playerId]);

  const categoryPlayerIds = React.useMemo(() => {
    if (!effectiveCategory) return [playerId];
    const ids = allPlayers
      .filter(
        (p) => p.categorie && p.categorie.toLowerCase() === effectiveCategory.toLowerCase()
      )
      .map((p) => p.id);
    return ids.length > 0 ? ids : [playerId];
  }, [allPlayers, effectiveCategory, playerId]);

  const availableEvaluationSeasons = React.useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (e.saison) set.add(e.saison);
    });
    return Array.from(set);
  }, [evaluations]);

  const availableAttendanceSeasons = React.useMemo(() => {
    const set = new Set<string>();
    const cur = getCurrentSeason();
    if (cur) set.add(cur);
    rawAttendances.forEach((a) => {
      if (a.saison) set.add(a.saison);
    });
    teamMatchAttendances.forEach((a) => {
      if (a.saison) set.add(a.saison);
    });
    return Array.from(set).sort().reverse();
  }, [rawAttendances, teamMatchAttendances]);

  const filteredEvaluations = React.useMemo(() => {
    return evaluations.filter((ev) => {
      if (filterSeason && ev.saison !== filterSeason) return false;
      if (filterDate && ev.evaluation_date !== filterDate) return false;
      return true;
    });
  }, [evaluations, filterSeason, filterDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAllDrawerOpen) {
        setIsAllDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAllDrawerOpen]);

  useEffect(() => {
    let isMounted = true;
    const fetchTracking = async () => {
      setLoading(true);
      try {
        // 1. Fetch player's individual attendances
        const { data: attendanceData } = await supabase
          .from('player_attendance')
          .select('event_type, status, saison, date')
          .eq('player_id', playerId);

        // 2. Fetch matches played by the team/category to know the total matches held
        let matchQuery = supabase
          .from('player_attendance')
          .select('date, saison, player_id')
          .eq('event_type', 'Match');

        if (categoryPlayerIds.length > 0) {
          matchQuery = matchQuery.in('player_id', categoryPlayerIds);
        }

        const { data: teamMatches } = await matchQuery;

        // 3. Fetch evaluations
        const { data: evals } = await supabase
          .from('player_evaluations')
          .select('*')
          .eq('player_id', playerId)
          .order('evaluation_date', { ascending: false });

        // 4. Fetch match reports for cards (cartons) and goals
        const { data: effectifsData } = await supabase
          .from('tblEffectifs')
          .select('id, nom, date_match, periode, categorie, match_events');

        if (!isMounted) return;

        if (attendanceData) {
          setRawAttendances(attendanceData);
        }
        if (teamMatches) {
          setTeamMatchAttendances(teamMatches);
        }
        if (evals) {
          setEvaluations(evals);
        }
        if (effectifsData) {
          setMatchReports(effectifsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTracking();

    return () => {
      isMounted = false;
    };
  }, [playerId, categoryPlayerIds.join(",")]);

  // Statistics for Entraînements (Filtered by selectedSeason)
  const trainingStats = React.useMemo(() => {
    let trainingAtts = rawAttendances.filter(
      (a) => a.event_type === "Entraînement"
    );

    // Filter by season if not "all"
    if (selectedSeason !== "all") {
      trainingAtts = trainingAtts.filter((a) => a.saison === selectedSeason);
    }

    let present = 0;
    let late = 0;
    let absent = 0;
    let injured = 0;
    const dates = new Set<string>();

    trainingAtts.forEach((a) => {
      if (a.date) dates.add(a.date);
      if (a.status === "Présent") present++;
      else if (a.status === "En retard") late++;
      else if (a.status === "Absent") absent++;
      else if (a.status === "Blessé") injured++;
    });

    return {
      present,
      late,
      absent,
      injured,
      total: dates.size,
    };
  }, [rawAttendances, selectedSeason]);

  // Statistics for Matchs (Filtered by selectedSeason)
  const matchStats = React.useMemo(() => {
    // 1. Matches played by this specific player
    const playerMatches = rawAttendances.filter(
      (a) => a.event_type === "Match" && a.status === "Présent"
    );

    const careerPlayerDates = new Set(playerMatches.map((a) => a.date));
    const careerTeamDates = new Set(teamMatchAttendances.map((a) => a.date));
    const careerPlayedCount = careerPlayerDates.size;
    const careerTotalMatches = Math.max(careerPlayedCount, careerTeamDates.size);

    let filteredPlayerMatches = playerMatches;
    let filteredTeamMatches = teamMatchAttendances;

    if (selectedSeason !== "all") {
      filteredPlayerMatches = playerMatches.filter((a) => a.saison === selectedSeason);
      filteredTeamMatches = teamMatchAttendances.filter((a) => a.saison === selectedSeason);
    }

    const seasonPlayerDates = new Set(filteredPlayerMatches.map((a) => a.date));
    const seasonTeamDates = new Set(filteredTeamMatches.map((a) => a.date));

    const playedCount = seasonPlayerDates.size;
    const totalMatches = Math.max(playedCount, seasonTeamDates.size);

    // 2. Events (Yellow cards, Red cards, Goals, Assists) for this player from tblEffectifs
    let yellowCards = 0;
    let redCards = 0;
    let goals = 0;
    let assists = 0;

    matchReports.forEach((eff) => {
      const effSeason = eff.periode || (eff.date_match ? getCurrentSeason(new Date(eff.date_match)) : "");
      if (selectedSeason !== "all" && effSeason && effSeason !== selectedSeason) {
        return;
      }

      const events: any[] = Array.isArray(eff.match_events) ? eff.match_events : [];
      events.forEach((ev) => {
        if (ev.scorerId === playerId) {
          if (ev.type === "yellow_card") yellowCards++;
          else if (ev.type === "red_card") redCards++;
          else if (ev.type === "goal") goals++;
        }
        if (ev.assistId === playerId) {
          assists++;
        }
      });
    });

    return {
      playedCount,
      totalMatches,
      careerPlayedCount,
      careerTotalMatches,
      yellowCards,
      redCards,
      goals,
      assists,
    };
  }, [rawAttendances, teamMatchAttendances, matchReports, selectedSeason, playerId]);

  return (
    <div className="space-y-6">
      {/* Contrôle global de la saison pour Assiduité & Matchs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/40 p-3 sm:px-4 sm:py-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Statistiques sportives
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
            (Entraînements & Matchs)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sports-season-filter" className="text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">
            Filtrer par saison :
          </label>
          <select
            id="sports-season-filter"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-bold rounded-lg px-3 py-1.5 outline-none shadow-xs cursor-pointer focus:border-brand-500 transition-colors"
          >
            <option value="all">Toutes les saisons</option>
            {availableAttendanceSeasons.map((s) => (
              <option key={s} value={s}>
                Saison {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Entraînements Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-white shadow-lg">
          <div className="absolute -right-6 -bottom-6 size-36 rounded-full bg-white/10 blur-xl"></div>
          <div className="relative z-10 flex flex-col justify-between h-full gap-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Entraînements
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-emerald-100 font-medium tracking-wide">
                  {selectedSeason === "all" ? "Total carrière au club" : `Saison ${selectedSeason}`}
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-extrabold">{trainingStats.present}</span>
                  <span className="text-xl text-emerald-200 font-semibold">/{trainingStats.total}</span>
                </div>
              </div>
              
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 text-xs font-medium space-y-1.5 border border-white/10">
                <div className="flex justify-between gap-4"><span className="text-emerald-200">En retard</span> <span className="font-bold text-white">{trainingStats.late}</span></div>
                <div className="flex justify-between gap-4"><span className="text-emerald-200">Absences</span> <span className="font-bold text-white">{trainingStats.absent}</span></div>
                <div className="flex justify-between gap-4"><span className="text-emerald-200">Blessures</span> <span className="font-bold text-white">{trainingStats.injured}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Matchs Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 p-6 text-white shadow-lg">
          <div className="absolute -right-6 -bottom-6 size-36 rounded-full bg-white/10 blur-xl"></div>
          <div className="relative z-10 flex flex-col justify-between h-full gap-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Matchs
              </span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-indigo-100 font-medium tracking-wide">
                  {selectedSeason === "all" ? "Total carrière au club" : `Saison ${selectedSeason}`}
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight">{matchStats.playedCount}</span>
                  <span className="text-xl sm:text-2xl text-indigo-200 font-bold">/{matchStats.totalMatches}</span>
                  <span className="text-sm sm:text-base text-indigo-100 font-bold ml-1.5">
                    {matchStats.playedCount > 1 ? "matchs joués" : "match joué"}
                  </span>
                </div>
              </div>

              {/* Statistics details for Matchs: Buts, Passes D., Cartons jaunes, Cartons rouges */}
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 text-xs font-medium space-y-1.5 border border-white/10 shrink-0">
                <div className="flex justify-between gap-4">
                  <span className="text-indigo-200 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Buts marqués
                  </span>
                  <span className="font-bold text-white">{matchStats.goals}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-indigo-200 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Passes D.
                  </span>
                  <span className="font-bold text-indigo-100">{matchStats.assists}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-indigo-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-3.5 rounded-xs bg-amber-400 inline-block shadow-xs"></span>
                    Cartons jaunes
                  </span>
                  <span className="font-bold text-amber-300">{matchStats.yellowCards}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-indigo-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-3.5 rounded-xs bg-red-500 inline-block shadow-xs"></span>
                    Cartons rouges
                  </span>
                  <span className="font-bold text-red-400">{matchStats.redCards}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Formulaires d'évaluation soumis Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
            <svg className="size-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Formulaires d'évaluation soumis
            {evaluations.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {evaluations.length}
              </span>
            )}
          </h5>
          {evaluations.length > 0 && (
            <button
              type="button"
              onClick={() => setIsAllDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0a2347] hover:bg-[#0d2d62] rounded-lg transition-colors shadow-xs"
            >
              <span>Afficher tout</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {evaluations.length}
              </span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {evaluations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 font-medium">Aucun formulaire d'évaluation enregistré pour ce joueur.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Display max 3 cards on page */}
            <div className="grid gap-4">
              {evaluations.slice(0, 3).map(ev => {
                const parsed = parseEvaluationComments(ev.comments);
                const dateFormatted = new Date(ev.evaluation_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });

                return (
                  <div key={ev.id} className="relative bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs hover:border-brand-500/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0a2347] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                          {parsed?.category || "U8"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h6 className="text-sm font-bold text-gray-900 dark:text-white">
                              {parsed ? `Fiche d'Évaluation ${parsed.category}` : "Observation du Coach"}
                            </h6>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Saison {ev.saison}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            Évalué le {dateFormatted} • Par : <strong className="text-gray-700 dark:text-gray-300">{parsed?.evaluator_name || ev.coach_id}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {parsed && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedEvaluation(parsed)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a2347] text-white text-xs font-bold hover:bg-[#0d2d62] transition-colors shadow-xs"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ouvrir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Button if > 3 evaluations */}
            {evaluations.length > 3 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsAllDrawerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#0a2347] dark:text-blue-400 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-xs"
                >
                  <span>Afficher tout ({evaluations.length} fiches)</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right-Side Slide-Over Focus Modal */}
      {isAllDrawerOpen && (
        <div className="fixed inset-0 z-[99998] flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsAllDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl h-full flex flex-col z-10 border-l border-gray-200 dark:border-gray-800 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0a2347] text-white flex items-center justify-center font-bold shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Toutes les fiches d'évaluation
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {evaluations.length} fiche{evaluations.length > 1 ? "s" : ""} au total
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAllDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Fermer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Season Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Filtrer par saison
                  </label>
                  <select
                    value={filterSeason}
                    onChange={(e) => setFilterSeason(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                  >
                    <option value="">Toutes les saisons</option>
                    {availableEvaluationSeasons.map((s: string) => (
                      <option key={s} value={s}>
                        Saison {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Filtrer par date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                    />
                    {filterDate && (
                      <button
                        type="button"
                        onClick={() => setFilterDate("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                        title="Effacer la date"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter feedback / reset */}
              {(filterSeason || filterDate) && (
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>
                    {filteredEvaluations.length} fiche{filteredEvaluations.length > 1 ? "s" : ""} trouvée{filteredEvaluations.length > 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSeason("");
                      setFilterDate("");
                    }}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>

            {/* Fiches List in Drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {filteredEvaluations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Aucune fiche correspondante
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Modifiez ou réinitialisez vos filtres de saison ou de date.
                  </p>
                </div>
              ) : (
                filteredEvaluations.map((ev) => {
                  const parsed = parseEvaluationComments(ev.comments);
                  const dateFormatted = new Date(ev.evaluation_date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={ev.id}
                      className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs hover:border-brand-500/40 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0a2347] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                          {parsed?.category || "U8"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h6 className="text-sm font-bold text-gray-900 dark:text-white">
                              {parsed ? `Fiche d'Évaluation ${parsed.category}` : "Observation"}
                            </h6>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Saison {ev.saison}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {dateFormatted} • Par : <strong className="text-gray-700 dark:text-gray-300">{parsed?.evaluator_name || ev.coach_id}</strong>
                          </p>
                        </div>
                      </div>

                      {parsed && (
                        <button
                          type="button"
                          onClick={() => setSelectedEvaluation(parsed)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a2347] text-white text-xs font-bold hover:bg-[#0d2d62] transition-colors shadow-xs shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ouvrir
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SuperAdmin Full Official Sheet Modal with PDG signature visible */}
      {selectedEvaluation && (
        <Modal
          isOpen={!!selectedEvaluation}
          onClose={() => setSelectedEvaluation(null)}
          className="max-w-4xl mx-auto w-full"
        >
          <div className="p-6 max-h-[90vh] overflow-y-auto">
            <OfficialEvaluationSheet
              data={selectedEvaluation}
              showPdgSignature={true} // Visible for SuperAdmin & Print!
              onClose={() => setSelectedEvaluation(null)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
