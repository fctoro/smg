"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import {
  fetchAttendanceForDateAndCategory,
  fetchAllAttendance,
  saveBulkAttendance,
  deleteAttendanceSession,
  AttendanceStatus,
  EventType,
  PlayerAttendance,
} from "@/lib/club/attendance";
import { getCurrentSeason } from "@/lib/club/season";
import { CardSkeleton } from "@/components/ui/skeleton/Skeleton";
import { CalenderIcon } from "@/icons";
import { PasswordConfirmModal } from "../modals/PasswordConfirmModal";

export interface AttendanceSession {
  id: string; // key: `${date}___${eventType}___${categorie}`
  date: string;
  eventType: EventType;
  categorie: string;
  saison: string;
  totalPlayers: number;
  presentCount: number;
  absentCount: number;
  injuredCount: number;
  lateCount: number;
  playerIds: string[];
  coachId?: string;
  createdAt?: string;
}

export default function CoachAttendancePage() {
  const { players: allPlayers, hydrated } = useClubData();
  const { userCategories, userEmail } = useUserRole();

  // Mode: "history" (default view with past calls) or "form" (new / edit call)
  const [viewMode, setViewMode] = useState<"history" | "form">("history");
  const [isEditingSession, setIsEditingSession] = useState(false);

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [eventType, setEventType] = useState<EventType>("Entraînement");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [attendances, setAttendances] = useState<Record<string, AttendanceStatus[]>>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History State
  const [allAttendanceRows, setAllAttendanceRows] = useState<PlayerAttendance[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>("all");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all");
  const [sessionToDelete, setSessionToDelete] = useState<AttendanceSession | null>(null);

  // Feedback Notifications
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter active players
  const activePlayers = useMemo(
    () => allPlayers.filter((p) => p.statut !== "alumni" && p.statut !== "inactif"),
    [allPlayers]
  );

  // Map category -> total active players in that category
  const categoryTotalMap = useMemo(() => {
    const map = new Map<string, number>();
    activePlayers.forEach((p) => {
      if (p.categorie) {
        const cat = p.categorie.toLowerCase().trim();
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    });
    return map;
  }, [activePlayers]);

  // Map player ID -> Player
  const playerMap = useMemo(() => {
    const map = new Map<string, (typeof allPlayers)[0]>();
    allPlayers.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPlayers]);

  // Available categories for this coach
  const availableCategories = useMemo(() => {
    if (!userCategories || userCategories.length === 0) {
      const cats = new Set(activePlayers.map((p) => p.categorie).filter(Boolean));
      return Array.from(cats).sort();
    }
    return userCategories;
  }, [userCategories, activePlayers]);

  useEffect(() => {
    if (availableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories, selectedCategory]);

  // Load All Attendance History
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchAllAttendance(getCurrentSeason());
      setAllAttendanceRows(data);
    } catch (err) {
      console.error("Error loading attendance history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      loadHistory();
    }
  }, [hydrated, loadHistory]);

  // Group attendance records into sessions
  const sessions: AttendanceSession[] = useMemo(() => {
    const allowedCats = new Set(availableCategories.map((c) => c.toLowerCase()));
    const grouped = new Map<
      string,
      {
        date: string;
        eventType: EventType;
        categorie: string;
        saison: string;
        playerIds: Set<string>;
        presentPlayers: Set<string>;
        absentPlayers: Set<string>;
        injuredPlayers: Set<string>;
        latePlayers: Set<string>;
        coachId?: string;
        createdAt?: string;
      }
    >();

    allAttendanceRows.forEach((row) => {
      const player = playerMap.get(row.player_id);
      if (!player || !player.categorie) return;

      const playerCatLower = player.categorie.toLowerCase();
      if (!allowedCats.has(playerCatLower)) return;

      const key = `${row.date}___${row.event_type}___${player.categorie}`;
      let session = grouped.get(key);
      if (!session) {
        session = {
          date: row.date,
          eventType: row.event_type,
          categorie: player.categorie,
          saison: row.saison,
          playerIds: new Set<string>(),
          presentPlayers: new Set<string>(),
          absentPlayers: new Set<string>(),
          injuredPlayers: new Set<string>(),
          latePlayers: new Set<string>(),
          coachId: row.coach_id,
          createdAt: row.created_at,
        };
        grouped.set(key, session);
      }

      session.playerIds.add(row.player_id);
      if (row.status === "Présent") session.presentPlayers.add(row.player_id);
      if (row.status === "Absent") session.absentPlayers.add(row.player_id);
      if (row.status === "Blessé") session.injuredPlayers.add(row.player_id);
      if (row.status === "En retard") session.latePlayers.add(row.player_id);
    });

    const list: AttendanceSession[] = [];
    grouped.forEach((item, key) => {
      const catKey = item.categorie.toLowerCase().trim();
      const totalInCat = categoryTotalMap.get(catKey) || 0;
      const totalPlayers = Math.max(totalInCat, item.playerIds.size, 1);

      // Unrecorded players in the category are counted as absent
      const unrecordedCount = Math.max(0, totalPlayers - item.playerIds.size);
      const absentCount = item.absentPlayers.size + unrecordedCount;

      list.push({
        id: key,
        date: item.date,
        eventType: item.eventType,
        categorie: item.categorie,
        saison: item.saison,
        totalPlayers,
        presentCount: item.presentPlayers.size,
        absentCount,
        injuredCount: item.injuredPlayers.size,
        lateCount: item.latePlayers.size,
        playerIds: Array.from(item.playerIds),
        coachId: item.coachId,
        createdAt: item.createdAt,
      });
    });

    // Sort descending by date
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [allAttendanceRows, playerMap, availableCategories, categoryTotalMap]);

  // Filtered Sessions for the table
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (historyCategoryFilter !== "all" && s.categorie.toLowerCase() !== historyCategoryFilter.toLowerCase()) {
        return false;
      }
      if (historyTypeFilter !== "all" && s.eventType !== historyTypeFilter) {
        return false;
      }
      return true;
    });
  }, [sessions, historyCategoryFilter, historyTypeFilter]);

  // Check if an attendance already exists for this date, category, and event type
  const existingSessionForCurrentSelection = useMemo(() => {
    if (!selectedDate || !selectedCategory || !eventType) return null;
    return sessions.find(
      (s) =>
        s.date === selectedDate &&
        s.categorie.toLowerCase().trim() === selectedCategory.toLowerCase().trim() &&
        s.eventType === eventType
    );
  }, [sessions, selectedDate, selectedCategory, eventType]);

  const isDuplicateDate = Boolean(existingSessionForCurrentSelection && !isEditingSession);

  // Players in view for form mode
  const playersInView = useMemo(() => {
    if (!selectedCategory) return [];
    let list = activePlayers.filter(
      (p) => p.categorie?.toLowerCase() === selectedCategory.toLowerCase()
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.nom && p.nom.toLowerCase().includes(q)) ||
          (p.prenom && p.prenom.toLowerCase().includes(q)) ||
          (p.matricule && p.matricule.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activePlayers, selectedCategory, searchQuery]);

  // Load existing attendances when opening form for date & category & eventType
  useEffect(() => {
    if (!hydrated || !selectedCategory || viewMode !== "form") return;

    const loadAttendances = async () => {
      setLoading(true);
      try {
        const data = await fetchAttendanceForDateAndCategory(selectedDate, getCurrentSeason());
        const attMap: Record<string, AttendanceStatus[]> = {};

        const categoryPlayerIds = new Set(
          activePlayers
            .filter((p) => p.categorie?.toLowerCase() === selectedCategory.toLowerCase())
            .map((p) => p.id)
        );

        data.forEach((att) => {
          if (att.event_type === eventType && categoryPlayerIds.has(att.player_id)) {
            if (!attMap[att.player_id]) {
              attMap[att.player_id] = [];
            }
            if (!attMap[att.player_id].includes(att.status)) {
              attMap[att.player_id].push(att.status);
            }
          }
        });

        setAttendances(attMap);
      } catch (err) {
        console.error("Error loading attendances", err);
      } finally {
        setLoading(false);
      }
    };

    loadAttendances();
  }, [selectedDate, eventType, hydrated, selectedCategory, activePlayers, viewMode]);

  // Handle multi-status selection with auto-rules
  const handleToggleStatus = (playerId: string, clickedStatus: AttendanceStatus) => {
    if (isDuplicateDate) return;
    setAttendances((prev) => {
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
          next = current.filter((s) => s !== "Présent" && s !== "En retard");
        } else {
          next = [...current.filter((s) => s !== "Absent"), "Présent"];
        }
      } else if (clickedStatus === "En retard") {
        if (current.includes("En retard")) {
          next = current.filter((s) => s !== "En retard");
        } else {
          const withoutAbsent = current.filter((s) => s !== "Absent");
          next = Array.from(new Set([...withoutAbsent, "Présent", "En retard"]));
        }
      } else if (clickedStatus === "Absent") {
        if (current.includes("Absent")) {
          next = [];
        } else {
          next = ["Absent"];
        }
      } else if (clickedStatus === "Blessé") {
        if (current.includes("Blessé")) {
          next = current.filter((s) => s !== "Blessé");
        } else {
          const withoutAbsent = current.filter((s) => s !== "Absent");
          next = [...withoutAbsent, "Blessé"];
        }
      }

      return { ...prev, [playerId]: next };
    });
  };

  // Shortcut check
  const allPlayedInView = useMemo(() => {
    if (playersInView.length === 0) return false;
    return playersInView.every((p) => attendances[p.id]?.includes("Présent"));
  }, [playersInView, attendances]);

  const handleShortcutAction = () => {
    if (isDuplicateDate) return;
    if (eventType === "Match") {
      if (allPlayedInView) {
        setAttendances((prev) => {
          const next = { ...prev };
          playersInView.forEach((p) => {
            delete next[p.id];
          });
          return next;
        });
      } else {
        const updates: Record<string, AttendanceStatus[]> = {};
        playersInView.forEach((p) => {
          updates[p.id] = ["Présent"];
        });
        setAttendances((prev) => ({ ...prev, ...updates }));
      }
    } else {
      const unrecorded = playersInView.filter(
        (p) => !attendances[p.id] || attendances[p.id].length === 0
      );
      if (unrecorded.length === 0) return;
      const updates: Record<string, AttendanceStatus[]> = {};
      unrecorded.forEach((p) => {
        updates[p.id] = ["Présent"];
      });
      setAttendances((prev) => ({ ...prev, ...updates }));
    }
  };

  // Execute Submit to DB
  const executeSubmit = async () => {
    if (isDuplicateDate) return;
    setIsSubmitting(true);
    setSubmitFeedback(null);
    try {
      const playerStatuses = playersInView.map((p) => ({
        playerId: p.id,
        statuses: attendances[p.id] || [],
      }));

      await saveBulkAttendance(
        selectedDate,
        eventType,
        getCurrentSeason(),
        playerStatuses,
        userEmail || "coach"
      );

      const successMsg = isEditingSession
        ? "Appel mis à jour avec succès !"
        : "Appel enregistré avec succès !";

      setSubmitFeedback({ type: "success", message: successMsg });
      await loadHistory();
      setViewMode("history");
      setIsEditingSession(false);

      setTimeout(() => setSubmitFeedback(null), 5000);
    } catch (err) {
      console.error("Error submitting attendance:", err);
      setSubmitFeedback({
        type: "error",
        message: "Une erreur est survenue lors de l'enregistrement.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start new call
  const handleStartNewCall = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setEventType("Entraînement");
    if (availableCategories.length > 0) {
      setSelectedCategory(availableCategories[0]);
    }
    setAttendances({});
    setIsEditingSession(false);
    setViewMode("form");
  };

  // Edit existing session
  const handleEditSession = (session: AttendanceSession) => {
    setSelectedDate(session.date);
    setEventType(session.eventType);
    setSelectedCategory(session.categorie);
    setIsEditingSession(true);
    setViewMode("form");
  };

  // Confirm delete session with password
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteAttendanceSession(
        sessionToDelete.date,
        sessionToDelete.eventType,
        sessionToDelete.saison,
        sessionToDelete.playerIds
      );
      setSubmitFeedback({
        type: "success",
        message: `L'appel du ${sessionToDelete.date} (${sessionToDelete.categorie}) a été supprimé avec succès. Vous pouvez désormais le refaire si vous le souhaitez.`,
      });
      await loadHistory();
      setSessionToDelete(null);
      setTimeout(() => setSubmitFeedback(null), 5000);
    } catch (err: any) {
      console.error("Error deleting attendance session:", err);
      setSubmitFeedback({
        type: "error",
        message: "Erreur lors de la suppression de la séance d'appel.",
      });
    }
  };

  // Summary counts for bottom bar
  const summaryCounts = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let injuredCount = 0;
    let lateCount = 0;

    playersInView.forEach((p) => {
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
      total: playersInView.length,
    };
  }, [playersInView, attendances]);

  if (!hydrated) {
    return (
      <div className="p-4 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {submitFeedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-sm font-semibold transition-all ${
            submitFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {submitFeedback.type === "success" ? (
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{submitFeedback.message}</span>
          </div>
          <button
            onClick={() => setSubmitFeedback(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: HISTORIQUE DES APPELS */}
      {viewMode === "history" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2.5">
                <CalenderIcon />
                <span>Historique des Appels</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Consultez, modifiez ou enregistrez les feuilles de présence de vos catégories.
              </p>
            </div>

            <button
              onClick={handleStartNewCall}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-5 text-sm font-semibold text-white shadow-theme-xs transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nouvel Appel</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-full sm:w-auto">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">
                  Filtrer par Catégorie :
                </span>
                <select
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                  className="w-full sm:w-48 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white font-medium focus:border-brand-500 focus:outline-none"
                >
                  <option value="all">Toutes les Catégories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">
                  Filtrer par Type :
                </span>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="w-full sm:w-44 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white font-medium focus:border-brand-500 focus:outline-none"
                >
                  <option value="all">Tous les Types</option>
                  <option value="Entraînement">Entraînement</option>
                  <option value="Match">Match</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span className="font-bold text-gray-800 dark:text-gray-200">{filteredSessions.length}</span> séance(s) enregistrée(s)
            </div>
          </div>

          {/* Sessions List / Table */}
          {loadingHistory ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 p-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center mb-3">
                <CalenderIcon />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Aucun appel enregistré pour l'instant
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-5">
                Cliquez sur le bouton ci-dessous pour faire l'appel d'une séance d'entraînement ou d'un match.
              </p>
              <button
                onClick={handleStartNewCall}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-5 text-sm font-semibold text-white shadow-theme-xs transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Faire le premier appel</span>
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Catégorie</th>
                      <th className="px-4 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Assiduité & Présences</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredSessions.map((session) => {
                      const rate =
                        session.totalPlayers > 0
                          ? Math.round((session.presentCount / session.totalPlayers) * 100)
                          : 0;

                      return (
                        <tr
                          key={session.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          {/* Date */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {session.date}
                            </div>
                            <div className="text-xs text-gray-400">
                              Saison {session.saison}
                            </div>
                          </td>

                          {/* Catégorie */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                              {session.categorie}
                            </span>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {session.eventType}
                            </span>
                          </td>

                          {/* Assiduité */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5 min-w-[200px]">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {session.presentCount} / {session.totalPlayers} {session.eventType === "Match" ? "ont joué" : "Présents"}
                                </span>
                                <span className="font-semibold text-gray-500">
                                  {rate}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    rate >= 80
                                      ? "bg-emerald-500"
                                      : rate >= 60
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                                {session.lateCount > 0 && (
                                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                                    • {session.lateCount} retard(s)
                                  </span>
                                )}
                                {session.injuredCount > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    • {session.injuredCount} blessé(s)
                                  </span>
                                )}
                                {session.absentCount > 0 && (
                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                    • {session.absentCount} absent(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditSession(session)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 transition-colors shadow-xs"
                                title="Modifier cette feuille d'appel"
                              >
                                <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Modifier</span>
                              </button>

                              <button
                                onClick={() => setSessionToDelete(session)}
                                className="inline-flex items-center justify-center h-8 w-8 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 transition-colors shadow-xs"
                                title="Supprimer cet appel"
                              >
                                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: FORMULAIRE D'APPEL (NOUVEL APPEL OU MODIFICATION) */}
      {viewMode === "form" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Header with Back button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setViewMode("history");
                  setIsEditingSession(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Retour à l'historique</span>
              </button>

              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 flex items-center gap-2">
                  <CalenderIcon />
                  <span>{isEditingSession ? "Modifier la feuille d'appel" : "Faire l'appel"}</span>
                </h2>
                <p className="text-xs text-gray-500">
                  {isEditingSession
                    ? `Modification de l'appel du ${selectedDate} (${selectedCategory} - ${eventType}).`
                    : eventType === "Match"
                    ? "Cochez les joueurs ayant disputé la rencontre puis validez."
                    : "Suivi des présences, retards et blessures • Enregistrement en direct."}
                </p>
              </div>
            </div>
          </div>

          {/* Form Filter Bar */}
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
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
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
                {/* Duplicate Date Alert Banner */}
                {isDuplicateDate && existingSessionForCurrentSelection && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 mb-5 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">
                          Un appel a déjà été enregistré pour cette date
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                          La séance du <strong>{selectedDate}</strong> en <strong>{selectedCategory}</strong> ({eventType}) existe déjà dans la base.
                          Pour la modifier, cliquez sur le bouton ci-contre.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditSession(existingSessionForCurrentSelection)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Passer en mode modification</span>
                    </button>
                  </div>
                )}

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
                  </div>

                  {/* Shortcut Button */}
                  <button
                    type="button"
                    onClick={handleShortcutAction}
                    disabled={isDuplicateDate}
                    className="group flex items-center gap-2 bg-white disabled:opacity-40 disabled:cursor-not-allowed border border-gray-300 text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 dark:hover:text-emerald-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    <svg className="size-4 text-gray-400 group-hover:text-emerald-600 dark:text-gray-500 dark:group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {eventType === "Match"
                      ? allPlayedInView
                        ? "Tout désélectionner"
                        : "Sélectionner tout l'effectif"
                      : "Marquer le reste comme Présent"}
                  </button>
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
                              if (!isDuplicateDate && eventType === "Match") {
                                handleToggleStatus(player.id, "Présent");
                              }
                            }}
                            className={`transition-colors ${
                              eventType === "Match"
                                ? isPresent
                                  ? "bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50 cursor-pointer"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                {eventType === "Match" && (
                                  <div className="mr-3 flex items-center">
                                    <span
                                      className={`size-5 rounded-md flex items-center justify-center border transition-all ${
                                        isPresent
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                      }`}
                                    >
                                      {isPresent && (
                                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-sm">
                                  {player.prenom?.charAt(0) || ""}
                                  {player.nom?.charAt(0) || ""}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                                    {getPlayerFullName(player)}
                                  </div>
                                  <div className="text-xs text-gray-500">{player.matricule}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              {eventType === "Match" ? (
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDuplicateDate) handleToggleStatus(player.id, "Présent");
                                    }}
                                    disabled={isDuplicateDate}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      isPresent
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 hover:border-emerald-500 hover:text-emerald-600"
                                    }`}
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
                                <div className="flex justify-end items-center gap-1.5 sm:gap-2">
                                  {/* Présent */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(player.id, "Présent")}
                                    disabled={isDuplicateDate}
                                    className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 ${
                                      isPresent
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-400/20"
                                        : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                                    }`}
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
                                    onClick={() => handleToggleStatus(player.id, "Absent")}
                                    disabled={isDuplicateDate}
                                    className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 ${
                                      isAbsent
                                        ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-400 shadow-xs ring-1 ring-red-400/20"
                                        : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                                    }`}
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
                                    onClick={() => handleToggleStatus(player.id, "Blessé")}
                                    disabled={isDuplicateDate}
                                    className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 ${
                                      isInjured
                                        ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400 shadow-xs ring-1 ring-amber-400/20"
                                        : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                                    }`}
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
                                    onClick={() => handleToggleStatus(player.id, "En retard")}
                                    disabled={isDuplicateDate}
                                    className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 ${
                                      isLate
                                        ? "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-500/15 dark:border-orange-500/30 dark:text-orange-400 shadow-xs ring-1 ring-orange-400/20"
                                        : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                                    }`}
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

                  {/* Submit Button & Cancel */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("history");
                        setIsEditingSession(false);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>

                    <button
                      type="button"
                      onClick={executeSubmit}
                      disabled={isSubmitting || isDuplicateDate}
                      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        isDuplicateDate
                          ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700 shadow-none"
                          : "bg-brand-500 hover:bg-brand-600 text-white shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                      }`}
                      title={isDuplicateDate ? "Un appel a déjà été enregistré pour cette date. Utilisez le mode modification." : ""}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Enregistrement...</span>
                        </>
                      ) : isDuplicateDate ? (
                        <>
                          <svg className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Déjà enregistré pour le {selectedDate} (Verrouillé)</span>
                        </>
                      ) : (
                        <>
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>
                            {isEditingSession
                              ? "Mettre à jour l'appel"
                              : eventType === "Match"
                              ? "Enregistrer la feuille de match"
                              : "Enregistrer l'appel"}
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
      )}

      {/* Password Confirm Modal for Attendance Deletion */}
      <PasswordConfirmModal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        onConfirm={confirmDeleteSession}
        title={`Supprimer l'appel du ${sessionToDelete?.date || ""}`}
        message={`Attention : la suppression de cette feuille d'appel (${sessionToDelete?.categorie || ""} - ${sessionToDelete?.eventType || ""}) supprimera définitivement les présences, absences et retards enregistrés pour ces ${sessionToDelete?.totalPlayers || 0} joueurs. Vous pourrez ensuite refaire un nouvel appel à cette date si vous le souhaitez.`}
        userEmail={userEmail}
        confirmText="Supprimer définitivement"
      />
    </div>
  );
}
