"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import { fetchAttendanceForDateAndCategory, savePlayerAttendance, deletePlayerAttendance, AttendanceStatus, EventType } from "@/lib/club/attendance";
import { getCurrentSeason } from "@/lib/club/season";
import { useConfirm } from "@/hooks/useConfirm";

import { CardSkeleton } from "@/components/ui/skeleton/Skeleton";
import { CalenderIcon, CheckCircleIcon } from "@/icons";

export default function CoachAttendancePage() {
  const { players: allPlayers, hydrated } = useClubData();
  const { userCategories, userEmail } = useUserRole();
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState<EventType>("Entraînement");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { confirm, ConfirmComponent } = useConfirm();
  
  const [attendances, setAttendances] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);

  // Filter active players only
  const activePlayers = useMemo(() => allPlayers.filter(p => p.statut !== "alumni" && p.statut !== "inactif"), [allPlayers]);

  // Available categories for this coach
  const availableCategories = useMemo(() => {
    if (!userCategories || userCategories.length === 0) {
      // Fallback if coach has no specific categories assigned
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

  // Players in selected category
  const playersInView = useMemo(() => {
    if (!selectedCategory) return [];
    return activePlayers.filter(p => p.categorie?.toLowerCase() === selectedCategory.toLowerCase());
  }, [activePlayers, selectedCategory]);

  // Fetch attendances for selected date
  useEffect(() => {
    if (!hydrated || !selectedCategory) return;
    
    const loadAttendances = async () => {
      setLoading(true);
      try {
        const data = await fetchAttendanceForDateAndCategory(selectedDate, getCurrentSeason());
        const attMap: Record<string, AttendanceStatus> = {};
        
        // Only care about this eventType
        data.forEach(att => {
          if (att.event_type === eventType) {
            attMap[att.player_id] = att.status;
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
  }, [selectedDate, eventType, hydrated, selectedCategory]);

  const handleMarkAttendance = async (playerId: string, status: AttendanceStatus) => {
    const currentStatus = attendances[playerId];
    
    if (currentStatus === status) {
      // Toggle off -> delete the attendance record to make it neutral
      const executeDelete = async () => {
        setAttendances(prev => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
        
        try {
          await deletePlayerAttendance(
            playerId,
            selectedDate,
            eventType,
            getCurrentSeason()
          );
        } catch (err) {
          console.error("Error deleting attendance", err);
          alert("Erreur lors de la suppression de la présence.");
          setAttendances(prev => ({ ...prev, [playerId]: currentStatus }));
        }
      };
      
      await executeDelete();
      return;
    }

    const executeStatusUpdate = async () => {
      // Optimistic UI update
      setAttendances(prev => ({ ...prev, [playerId]: status }));
      
      try {
        await savePlayerAttendance(
          playerId,
          selectedDate,
          eventType,
          status,
          getCurrentSeason(),
          userEmail || "coach"
        );
      } catch (err) {
        console.error("Error saving attendance", err);
        alert("Erreur lors de la sauvegarde de la présence.");
        // Revert on error (optional, but good practice)
        setAttendances(prev => ({ ...prev, [playerId]: currentStatus }));
      }
    };

    if (currentStatus) {
      // Player already has a status, ask for confirmation to change
      confirm({
        title: "Changer le statut",
        message: `Ce joueur est actuellement marqué comme "${currentStatus}". Êtes-vous sûr de vouloir le changer en "${status}" ?`,
        confirmText: "Oui, changer",
        cancelText: "Annuler",
        onConfirm: executeStatusUpdate
      });
    } else {
      // First time setting the status for this session, no confirmation needed
      await executeStatusUpdate();
    }
  };

  const handleMarkAllPresent = () => {
    const unrecordedPlayers = playersInView.filter(p => !attendances[p.id]);
    if (unrecordedPlayers.length === 0) return;
    
    confirm({
      title: "Marquer tout le reste comme Présent",
      message: `Vous êtes sur le point de marquer ${unrecordedPlayers.length} joueur(s) restant(s) comme "Présent". Continuer ?`,
      confirmText: "Oui, tout marquer",
      cancelText: "Annuler",
      onConfirm: async () => {
        // Optimistic UI
        const updates: Record<string, AttendanceStatus> = {};
        unrecordedPlayers.forEach(p => updates[p.id] = "Présent");
        setAttendances(prev => ({ ...prev, ...updates }));
        
        // Save to DB sequentially
        try {
          for (const p of unrecordedPlayers) {
            await savePlayerAttendance(
              p.id,
              selectedDate,
              eventType,
              "Présent",
              getCurrentSeason(),
              userEmail || "coach"
            );
          }
        } catch (err) {
          console.error("Error saving all attendances", err);
        }
      }
    });
  };

  if (!hydrated) {
    return <div className="p-4 space-y-4"><CardSkeleton /><CardSkeleton /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 flex items-center gap-2">
            <CalenderIcon /> Faire l'appel
          </h2>
          <p className="text-sm text-gray-500">Sauvegarde automatique à chaque clic.</p>
        </div>
      </div>
      <ConfirmComponent />

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type d'événement</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="Entraînement">Entraînement</option>
              <option value="Match">Match</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>
        ) : playersInView.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Aucun joueur dans cette catégorie.</div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleMarkAllPresent}
                className="group flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 dark:hover:text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95"
              >
                <svg className="size-4 text-gray-400 group-hover:text-emerald-600 dark:text-gray-500 dark:group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Marquer le reste comme Présent
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joueur</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Présence</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {playersInView.map((player) => {
                    const status = attendances[player.id];
                    return (
                      <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                              {player.prenom?.charAt(0) || ""}{player.nom?.charAt(0) || ""}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {getPlayerFullName(player)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {player.matricule}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex justify-end items-center gap-1.5 sm:gap-2">
                            {/* Présent */}
                            <button
                              onClick={() => handleMarkAttendance(player.id, "Présent")}
                              className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                                status === "Présent" 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 shadow-sm" 
                                : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                              }`}
                            >
                              <svg className={`size-4 ${status === "Présent" ? "text-emerald-500 dark:text-emerald-400" : "text-gray-400 group-hover:text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="hidden sm:inline">Présent</span>
                            </button>
                            
                            {/* Absent */}
                            <button
                              onClick={() => handleMarkAttendance(player.id, "Absent")}
                              className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                                status === "Absent" 
                                ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 shadow-sm" 
                                : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                              }`}
                            >
                              <svg className={`size-4 ${status === "Absent" ? "text-red-500 dark:text-red-400" : "text-gray-400 group-hover:text-red-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="hidden sm:inline">Absent</span>
                            </button>
                            
                            {/* Blessé */}
                            <button
                              onClick={() => handleMarkAttendance(player.id, "Blessé")}
                              className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                                status === "Blessé" 
                                ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 shadow-sm" 
                                : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                              }`}
                            >
                              <svg className={`size-4 ${status === "Blessé" ? "text-amber-500 dark:text-amber-400" : "text-gray-400 group-hover:text-amber-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span className="hidden sm:inline">Blessé</span>
                            </button>
                            
                            {/* Retard */}
                            <button
                              onClick={() => handleMarkAttendance(player.id, "En retard")}
                              className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                                status === "En retard" 
                                ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400 shadow-sm" 
                                : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                              }`}
                              title="En retard"
                            >
                              <svg className={`size-4 ${status === "En retard" ? "text-orange-500 dark:text-orange-400" : "text-gray-400 group-hover:text-orange-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="hidden sm:inline">Retard</span>
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
    </div>
  );
}
