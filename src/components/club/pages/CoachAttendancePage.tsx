"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import {
  fetchAttendanceForDateAndCategory,
  saveBulkAttendance,
  AttendanceStatus,
  EventType
} from "@/lib/club/attendance";
import { getCurrentSeason } from "@/lib/club/season";
import { useConfirm } from "@/hooks/useConfirm";
import { CardSkeleton } from "@/components/ui/skeleton/Skeleton";
import { CalenderIcon } from "@/icons";

export default function CoachAttendancePage() {
  const { players: allPlayers, hydrated } = useClubData();
  const { userCategories, userEmail } = useUserRole();
  const { confirm, ConfirmComponent } = useConfirm();
  
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [eventType, setEventType] = useState<EventType>("Entraînement");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Attendances map: playerId -> array of selected statuses (e.g. ['Présent', 'Blessé'])
  const [attendances, setAttendances] = useState<Record<string, AttendanceStatus[]>>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter active players only
  const activePlayers = useMemo(
    () => allPlayers.filter(p => p.statut !== "alumni" && p.statut !== "inactif"),
    [allPlayers]
  );

  // Available categories for this coach
  const availableCategories = useMemo(() => {
    if (!userCategories || userCategories.length === 0) {
      const cats = new Set(activePlayers.map(p => p.categorie).filter(Boolean));
      return Array.from(cats).sort();
    }
    return userCategories;
  }, [userCategories, activePlayers]);

  useEffect(() => {
    if (availableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories, selectedCategory]);

  // Players in selected category (filtered by search)
  const playersInView = useMemo(() => {
    if (!selectedCategory) return [];
    let list = activePlayers.filter(
      p => p.categorie?.toLowerCase() === selectedCategory.toLowerCase()
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        (p.nom && p.nom.toLowerCase().includes(q)) ||
        (p.prenom && p.prenom.toLowerCase().includes(q)) ||
        (p.matricule && p.matricule.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activePlayers, selectedCategory, searchQuery]);

  // Fetch attendances for selected date & category
  useEffect(() => {
    if (!hydrated || !selectedCategory) return;
    
    const loadAttendances = async () => {
      setLoading(true);
      try {
        const data = await fetchAttendanceForDateAndCategory(selectedDate, getCurrentSeason());
        const attMap: Record<string, AttendanceStatus[]> = {};
        
        // Check if there are already records in the database for this category & date & eventType
        const categoryPlayerIds = new Set(
          activePlayers
            .filter(p => p.categorie?.toLowerCase() === selectedCategory.toLowerCase())
            .map(p => p.id)
        );

        let recordsFound = false;
        data.forEach(att => {
          if (att.event_type === eventType) {
            if (categoryPlayerIds.has(att.player_id)) {
              recordsFound = true;
            }
            if (!attMap[att.player_id]) {
              attMap[att.player_id] = [];
            }
            if (!attMap[att.player_id].includes(att.status)) {
              attMap[att.player_id].push(att.status);
            }
          }
        });
        
        setAttendances(attMap);
        setIsAlreadySubmitted(recordsFound);
      } catch (err) {
        console.error("Error loading attendances", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadAttendances();
  }, [selectedDate, eventType, hydrated, selectedCategory, activePlayers]);

  // Handle multi-status selection with auto-rules (disabled if already submitted)
  const handleToggleStatus = (playerId: string, clickedStatus: AttendanceStatus) => {
    if (isAlreadySubmitted) return;

    setAttendances(prev => {
      const current = prev[playerId] || [];
      let next: AttendanceStatus[] = [];

      if (eventType === "Match") {
        // MATCH MODE: single toggle for "A joué" (stored as 'Présent')
        if (current.includes("Présent")) {
          next = [];
        } else {
          next = ["Présent"];
        }
        return { ...prev, [playerId]: next };
      }

      // ENTRAÎNEMENT MODE:
      if (clickedStatus === "Présent") {
        if (current.includes("Présent")) {
          // Unchecking Présent -> also auto-unchecks Retard
          next = current.filter(s => s !== "Présent" && s !== "En retard");
        } else {
          // Checking Présent -> auto-unchecks Absent
          next = [...current.filter(s => s !== "Absent"), "Présent"];
        }
      } else if (clickedStatus === "En retard") {
        if (current.includes("En retard")) {
          // Unchecking Retard -> Présent remains checked
          next = current.filter(s => s !== "En retard");
        } else {
          // Checking Retard -> auto-checks Présent, auto-unchecks Absent
          const withoutAbsent = current.filter(s => s !== "Absent");
          next = Array.from(new Set([...withoutAbsent, "Présent", "En retard"]));
        }
      } else if (clickedStatus === "Absent") {
        if (current.includes("Absent")) {
          // Unchecking Absent
          next = [];
        } else {
          // Checking Absent -> sets pure Absent (removes Présent, Retard, Blessé)
          next = ["Absent"];
        }
      } else if (clickedStatus === "Blessé") {
        if (current.includes("Blessé")) {
          // Unchecking Blessé
          next = current.filter(s => s !== "Blessé");
        } else {
          // Checking Blessé -> add Blessé, remove pure Absent
          const withoutAbsent = current.filter(s => s !== "Absent");
          next = [...withoutAbsent, "Blessé"];
        }
      }

      return { ...prev, [playerId]: next };
    });
  };

  // Shortcut check
  const allPlayedInView = useMemo(() => {
    if (playersInView.length === 0) return false;
    return playersInView.every(p => attendances[p.id]?.includes("Présent"));
  }, [playersInView, attendances]);

  const handleShortcutAction = () => {
    if (isAlreadySubmitted) return;

    if (eventType === "Match") {
      if (allPlayedInView) {
        // Clear all
        setAttendances(prev => {
          const next = { ...prev };
          playersInView.forEach(p => {
            delete next[p.id];
          });
          return next;
        });
      } else {
        // Mark all as played
        const updates: Record<string, AttendanceStatus[]> = {};
        playersInView.forEach(p => {
          updates[p.id] = ["Présent"];
        });
        setAttendances(prev => ({ ...prev, ...updates }));
      }
    } else {
      // Entraînement: Mark unrecorded players as Présent
      const unrecorded = playersInView.filter(
        p => !attendances[p.id] || attendances[p.id].length === 0
      );
      if (unrecorded.length === 0) return;
      const updates: Record<string, AttendanceStatus[]> = {};
      unrecorded.forEach(p => {
        updates[p.id] = ["Présent"];
      });
      setAttendances(prev => ({ ...prev, ...updates }));
    }
  };

  // Request confirmation before submitting
  const handleRequestSubmit = () => {
    if (isAlreadySubmitted || isSubmitting) return;

    confirm({
      title: eventType === "Match" ? "Confirmer la feuille de match" : "Confirmer l'appel",
      message: eventType === "Match"
        ? `Attention : une fois la feuille de match soumise pour le ${selectedDate}, elle sera définitivement enregistrée et verrouillée pour cette date. Confirmer la soumission ?`
        : `Attention : une fois l'appel soumis pour le ${selectedDate}, les présences seront définitivement enregistrées et verrouillées pour cette date. Confirmer la soumission ?`,
      confirmText: "Oui, soumettre définitivement",
      cancelText: "Annuler",
      isDestructive: false,
      onConfirm: executeSubmit,
    });
  };

  // Execute Submit to DB
  const executeSubmit = async () => {
    setIsSubmitting(true);
    setSubmitFeedback(null);
    try {
      const playerStatuses = playersInView.map(p => ({
        playerId: p.id,
        statuses: attendances[p.id] || []
      }));

      await saveBulkAttendance(
        selectedDate,
        eventType,
        getCurrentSeason(),
        playerStatuses,
        userEmail || "coach"
      );

      setIsAlreadySubmitted(true);
      const successMsg = eventType === "Match"
        ? "Feuille de match enregistrée et verrouillée avec succès !"
        : "Appel de l'entraînement enregistré et verrouillé avec succès !";

      setSubmitFeedback({ type: "success", message: successMsg });
      setTimeout(() => setSubmitFeedback(null), 5000);
    } catch (err) {
      console.error("Error submitting attendance:", err);
      setSubmitFeedback({
        type: "error",
        message: "Une erreur est survenue lors de l'enregistrement."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary counts for bottom bar
  const summaryCounts = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let injuredCount = 0;
    let lateCount = 0;

    playersInView.forEach(p => {
      const statuses = attendances[p.id] || [];
      if (statuses.includes("Présent")) presentCount++;
      if (statuses.includes("Absent")) absentCount++;
      if (statuses.includes("Blessé")) injuredCount++;
      if (statuses.includes("En retard")) lateCount++;
    });

    return {
      present: presentCount,
      absent: absentCount,
      injured: injuredCount,
      late: lateCount,
      total: playersInView.length
    };
  }, [playersInView, attendances]);

  if (!hydrated) {
    return <div className="p-4 space-y-4"><CardSkeleton /><CardSkeleton /></div>;
  }

  return (
    <div className="space-y-6">
      <ConfirmComponent />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 flex items-center gap-2">
            <CalenderIcon /> {eventType === "Match" ? "Feuille de Match" : "Faire l'appel"}
          </h2>
          <p className="text-sm text-gray-500">
            {isAlreadySubmitted
              ? "Cette date a déjà été enregistrée dans la base de données (mode lecture seule / verrouillé)."
              : eventType === "Match"
              ? "Cochez les joueurs ayant disputé la rencontre puis soumettez définitivement."
              : "Suivi des présences, retards et blessures • Soumission définitive avec confirmation."}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-xs border border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Recherche Joueur */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rechercher un joueur</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nom, prénom, matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-8 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
              />
              <svg className="size-4 text-gray-400 absolute left-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Type d'événement */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type d'événement</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 font-semibold text-gray-800 dark:text-white"
            >
              <option value="Entraînement">Entraînement</option>
              <option value="Match">Match</option>
            </select>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 font-semibold"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : playersInView.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? "Aucun joueur ne correspond à votre recherche." : "Aucun joueur dans cette catégorie."}
          </div>
        ) : (
          <div>
            {/* Action Bar Above Table */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Effectif affiché :
                </span>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {playersInView.length} joueur(s)
                </span>
                {eventType === "Match" && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-gray-900 shadow-xs">
                    {summaryCounts.present} joueur(s) sélectionné(s)
                  </span>
                )}
                {isAlreadySubmitted && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Déjà enregistré pour le {selectedDate} (Verrouillé)</span>
                  </span>
                )}
              </div>

              {/* Shortcut Button (disabled if already submitted) */}
              {!isAlreadySubmitted && (
                <button
                  type="button"
                  onClick={handleShortcutAction}
                  className="group flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 dark:hover:text-emerald-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95"
                >
                  <svg className="size-4 text-gray-400 group-hover:text-emerald-600 dark:text-gray-500 dark:group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {eventType === "Match"
                    ? allPlayedInView ? "Tout désélectionner" : "Sélectionner tout l'effectif"
                    : "Marquer le reste comme Présent"}
                </button>
              )}
            </div>

            {/* Players Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                      Joueur
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                      {eventType === "Match" ? "A joué le match" : "Statut de présence"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {playersInView.map((player) => {
                    const statuses = attendances[player.id] || [];
                    const isPresent = statuses.includes("Présent");
                    const isAbsent = statuses.includes("Absent");
                    const isInjured = statuses.includes("Blessé");
                    const isLate = statuses.includes("En retard");

                    return (
                      <tr 
                        key={player.id} 
                        onClick={() => {
                          if (!isAlreadySubmitted && eventType === "Match") {
                            handleToggleStatus(player.id, "Présent");
                          }
                        }}
                        className={`transition-colors ${
                          eventType === "Match"
                            ? isPresent
                              ? isAlreadySubmitted
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                                : "bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50 cursor-pointer"
                              : isAlreadySubmitted
                              ? "opacity-60"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            {/* Checkbox indicator in Match mode */}
                            {eventType === "Match" && (
                              <div className="mr-3 flex items-center">
                                <span className={`size-5 rounded-md flex items-center justify-center border transition-all ${
                                  isPresent
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                }`}>
                                  {isPresent && (
                                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-sm">
                              {player.prenom?.charAt(0) || ""}{player.nom?.charAt(0) || ""}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {getPlayerFullName(player)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {player.matricule}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {/* CASE 1: MATCH EVENT -> SIMPLE SELECTION */}
                          {eventType === "Match" ? (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                disabled={isAlreadySubmitted}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isAlreadySubmitted) {
                                    handleToggleStatus(player.id, "Présent");
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  isPresent
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500"
                                } ${isAlreadySubmitted ? "cursor-default" : "hover:border-emerald-500 hover:text-emerald-600"}`}
                              >
                                {isPresent ? (
                                  <>
                                    <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>A joué</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="size-3.5 rounded border border-gray-400 dark:border-gray-500 flex items-center justify-center"></span>
                                    <span>Sélectionner</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            /* CASE 2: ENTRAÎNEMENT EVENT -> MULTI-STATUS BUTTONS */
                            <div className="flex justify-end items-center gap-1.5 sm:gap-2">
                              {/* Présent */}
                              <button
                                type="button"
                                disabled={isAlreadySubmitted}
                                onClick={() => handleToggleStatus(player.id, "Présent")}
                                className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 ${
                                  isPresent
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-400/20"
                                    : "bg-transparent border-transparent text-gray-500"
                                } ${isAlreadySubmitted ? "cursor-default" : "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"}`}
                                title="Présent à l'entraînement"
                              >
                                <svg className={`size-3.5 ${isPresent ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 group-hover:text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Présent</span>
                              </button>
                              
                              {/* Absent */}
                              <button
                                type="button"
                                disabled={isAlreadySubmitted}
                                onClick={() => handleToggleStatus(player.id, "Absent")}
                                className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 ${
                                  isAbsent
                                    ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-400 shadow-xs ring-1 ring-red-400/20"
                                    : "bg-transparent border-transparent text-gray-500"
                                } ${isAlreadySubmitted ? "cursor-default" : "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"}`}
                                title="Absent (injustifié)"
                              >
                                <svg className={`size-3.5 ${isAbsent ? "text-red-600 dark:text-red-400" : "text-gray-400 group-hover:text-red-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Absent</span>
                              </button>
                              
                              {/* Blessé */}
                              <button
                                type="button"
                                disabled={isAlreadySubmitted}
                                onClick={() => handleToggleStatus(player.id, "Blessé")}
                                className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 ${
                                  isInjured
                                    ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400 shadow-xs ring-1 ring-amber-400/20"
                                    : "bg-transparent border-transparent text-gray-500"
                                } ${isAlreadySubmitted ? "cursor-default" : "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"}`}
                                title={isPresent ? "Présent et blessé pendant l'entraînement" : "Absent pour motif de blessure"}
                              >
                                <svg className={`size-3.5 ${isInjured ? "text-amber-600 dark:text-amber-400" : "text-gray-400 group-hover:text-amber-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Blessé</span>
                              </button>
                              
                              {/* Retard */}
                              <button
                                type="button"
                                disabled={isAlreadySubmitted}
                                onClick={() => handleToggleStatus(player.id, "En retard")}
                                className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 ${
                                  isLate
                                    ? "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-500/15 dark:border-orange-500/30 dark:text-orange-400 shadow-xs ring-1 ring-orange-400/20"
                                    : "bg-transparent border-transparent text-gray-500"
                                } ${isAlreadySubmitted ? "cursor-default" : "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"}`}
                                title="Présent mais arrivé en retard"
                              >
                                <svg className={`size-3.5 ${isLate ? "text-orange-600 dark:text-orange-400" : "text-gray-400 group-hover:text-orange-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Retard</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Submit Bar */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 shadow-xs">
              {/* Summary counters */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                {eventType === "Match" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-black dark:bg-white"></span>
                    <strong className="text-gray-900 dark:text-white font-extrabold">{summaryCounts.present}</strong>
                    sur {summaryCounts.total} joueur(s) ont joué ce match
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-500"></span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">{summaryCounts.present}</strong> Présent(s)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-red-500"></span>
                      <strong className="text-red-700 dark:text-red-400 font-extrabold">{summaryCounts.absent}</strong> Absent(s)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-amber-500"></span>
                      <strong className="text-amber-700 dark:text-amber-400 font-extrabold">{summaryCounts.injured}</strong> Blessé(s)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-orange-500"></span>
                      <strong className="text-orange-700 dark:text-orange-400 font-extrabold">{summaryCounts.late}</strong> En retard
                    </span>
                  </>
                )}
              </div>

              {/* Submit Button & Feedback */}
              <div className="flex items-center gap-3">
                {submitFeedback && (
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                      submitFeedback.type === "success"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    {submitFeedback.message}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleRequestSubmit}
                  disabled={isAlreadySubmitted || isSubmitting}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    isAlreadySubmitted
                      ? "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed border border-gray-300 dark:border-gray-700 shadow-none"
                      : "bg-[#0a2347] hover:bg-[#0d2d62] text-white shadow-md active:scale-95 disabled:opacity-50"
                  }`}
                >
                  {isAlreadySubmitted ? (
                    <>
                      <svg className="size-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>
                        {eventType === "Match" ? "Match déjà soumis (Verrouillé)" : "Appel déjà soumis (Verrouillé)"}
                      </span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>
                        {eventType === "Match" ? "Soumettre les matchs joués" : "Soumettre l'appel"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
