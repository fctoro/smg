import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Effectif, Player } from "@/types/club";
import { updateEffectif } from "@/lib/club/effectifs";
import { getPlayerFullName } from "@/lib/club/metrics";
import Image from "next/image";

interface MatchEvent {
  id: string;
  type: "goal" | "yellow_card" | "red_card";
  scorerId: string; // Player who scored or got carded
  assistId?: string;
  minute?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  effectif: Effectif;
  players: Player[];
  onSuccess: (updatedEffectif: Effectif) => void;
}

export default function CoachMatchReportModal({ isOpen, onClose, effectif, players, onSuccess }: Props) {
  const [scoreToro, setScoreToro] = useState<number | "">(effectif.score_toro ?? 0);
  const [scoreAdv, setScoreAdv] = useState<number | "">(effectif.score_adversaire ?? 0);
  const [events, setEvents] = useState<MatchEvent[]>(effectif.match_events || []);
  const [strengths, setStrengths] = useState(effectif.coach_notes_strengths || "");
  const [weaknesses, setWeaknesses] = useState(effectif.coach_notes_weaknesses || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Home / Away toggle state
  const [isToroHome, setIsToroHome] = useState(true);

  // Editable Opponent Name state
  const [opponentName, setOpponentName] = useState("ADVERSAIRE");

  // New Event creation popup state
  const [activeModalType, setActiveModalType] = useState<"goal" | "yellow_card" | "red_card" | null>(null);
  const [newScorerId, setNewScorerId] = useState("");
  const [newAssistId, setNewAssistId] = useState("");

  // Extract initial Opponent Name & Home/Away
  const extractOpponent = (title: string) => {
    if (!title) return { name: "ADVERSAIRE", isHome: true };
    const lower = title.toLowerCase();
    if (lower.startsWith("fc toro vs") || lower.startsWith("fc toro -")) {
      const match = title.match(/(?:vs\.?|contre|-)\s*(.*)/i);
      return { name: match && match[1]?.trim() ? match[1].trim() : "ADVERSAIRE", isHome: true };
    } else if (lower.includes("vs fc toro") || lower.includes("contre fc toro")) {
      const parts = title.split(/(?:vs\.?|contre)\s*fc toro/i);
      return { name: parts[0]?.trim() || "ADVERSAIRE", isHome: false };
    }
    const match = title.match(/(?:vs\.?|contre)\s*(.*)/i);
    if (match && match[1]?.trim()) {
      return { name: match[1].trim(), isHome: true };
    }
    const cleaned = title.replace(/^FC Toro\s*/i, "").trim();
    return { name: cleaned || "ADVERSAIRE", isHome: true };
  };

  // Reset form when effectif changes
  useEffect(() => {
    if (isOpen) {
      setScoreToro(effectif.score_toro ?? 0);
      setScoreAdv(effectif.score_adversaire ?? 0);
      setEvents(effectif.match_events || []);
      setStrengths(effectif.coach_notes_strengths || "");
      setWeaknesses(effectif.coach_notes_weaknesses || "");
      setError(null);
      setActiveModalType(null);

      const parsed = extractOpponent(effectif.nom);
      setOpponentName(parsed.name);
      setIsToroHome(parsed.isHome);
    }
  }, [isOpen, effectif]);

  // Filter players in roster
  const rosterPlayers = useMemo(() => {
    return players.filter(p => effectif.joueurs?.includes(p.id));
  }, [players, effectif.joueurs]);

  // Grouped Scorers
  const scorersList = useMemo(() => {
    const goalEvents = events.filter(e => e.type === "goal");
    const map = new Map<string, { player: Player; count: number; assists: string[]; eventIds: string[] }>();
    
    goalEvents.forEach(ev => {
      const p = players.find(player => player.id === ev.scorerId);
      if (!p) return;
      if (!map.has(p.id)) {
        map.set(p.id, { player: p, count: 0, assists: [], eventIds: [] });
      }
      const entry = map.get(p.id)!;
      entry.count += 1;
      entry.eventIds.push(ev.id);
      if (ev.assistId) {
        const assister = players.find(player => player.id === ev.assistId);
        if (assister) {
          entry.assists.push(getPlayerFullName(assister));
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [events, players]);

  // Grouped Assists
  const assistsList = useMemo(() => {
    const goalEvents = events.filter(e => e.type === "goal" && e.assistId);
    const map = new Map<string, { player: Player; count: number; eventIds: string[] }>();

    goalEvents.forEach(ev => {
      if (!ev.assistId) return;
      const p = players.find(player => player.id === ev.assistId);
      if (!p) return;
      if (!map.has(p.id)) {
        map.set(p.id, { player: p, count: 0, eventIds: [] });
      }
      const entry = map.get(p.id)!;
      entry.count += 1;
      entry.eventIds.push(ev.id);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [events, players]);

  // Grouped Yellow Cards
  const yellowCardsList = useMemo(() => {
    return events.filter(e => e.type === "yellow_card").map(ev => ({
      ...ev,
      player: players.find(p => p.id === ev.scorerId)
    })).filter(ev => ev.player);
  }, [events, players]);

  // Grouped Red Cards
  const redCardsList = useMemo(() => {
    return events.filter(e => e.type === "red_card").map(ev => ({
      ...ev,
      player: players.find(p => p.id === ev.scorerId)
    })).filter(ev => ev.player);
  }, [events, players]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalType || !newScorerId) return;

    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substring(7),
      type: activeModalType,
      scorerId: newScorerId,
      assistId: activeModalType === "goal" && newAssistId ? newAssistId : undefined
    };

    const nextEvents = [...events, newEvent];
    setEvents(nextEvents);

    // If goal added, auto-increment Toro score if it matches
    if (activeModalType === "goal") {
      setScoreToro(prev => (typeof prev === "number" ? prev + 1 : 1));
    }

    // Reset & close mini form
    setNewScorerId("");
    setNewAssistId("");
    setActiveModalType(null);
  };

  const removeEvent = (id: string) => {
    const target = events.find(e => e.id === id);
    if (target && target.type === "goal") {
      setScoreToro(prev => Math.max(0, (typeof prev === "number" ? prev - 1 : 0)));
    }
    setEvents(events.filter(e => e.id !== id));
  };

  const removeScorerLastGoal = (eventIds: string[]) => {
    if (eventIds.length === 0) return;
    const lastId = eventIds[eventIds.length - 1];
    removeEvent(lastId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const updatedNom = isToroHome 
      ? `FC Toro vs ${opponentName || "Adversaire"}` 
      : `${opponentName || "Adversaire"} vs FC Toro`;

    const updates = {
      nom: updatedNom,
      score_toro: scoreToro === "" ? 0 : Number(scoreToro),
      score_adversaire: scoreAdv === "" ? 0 : Number(scoreAdv),
      match_events: events,
      coach_notes_strengths: strengths,
      coach_notes_weaknesses: weaknesses
    };

    try {
      const { data, error } = await updateEffectif(effectif.id, updates);
      if (error) throw new Error(error);
      
      onSuccess({ ...effectif, ...updates });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Erreur de sauvegarde. Avez-vous exécuté la commande SQL dans Supabase pour tblEffectifs ?");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="max-w-5xl w-full p-0 overflow-hidden rounded-3xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
        {/* --- 1. PRO SCOREBOARD HEADER --- */}
        <div className="bg-slate-950 text-white border-b border-gray-800">
          {/* Top metadata strip */}
          <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase tracking-wider text-[10px] border border-red-500/30">
                Rapport de Match
              </span>
              <span className="text-gray-600">•</span>
              <span className="font-semibold text-gray-200">{effectif.categorie}</span>
              <span className="text-gray-600">•</span>
              <span>{effectif.date_match}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main Scoreboard Arena */}
          <div className="px-6 py-6 sm:px-8">
            <div className="grid grid-cols-12 items-center gap-4">
              {/* Left Team */}
              <div className="col-span-5 min-w-0">
                {isToroHome ? (
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                      FC TORO
                    </h3>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Domicile
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={opponentName}
                      onChange={(e) => setOpponentName(e.target.value)}
                      placeholder="Nom de l'adversaire..."
                      className="w-full text-2xl sm:text-3xl font-black tracking-tight text-white bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-gray-500 placeholder:font-normal transition-all"
                    />
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-gray-300 border border-white/10">
                      Domicile
                    </span>
                  </div>
                )}
              </div>

              {/* Center Score & Switch */}
              <div className="col-span-2 flex flex-col items-center justify-center shrink-0">
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={isToroHome ? scoreToro : scoreAdv}
                    onChange={e => {
                      const val = e.target.value === "" ? "" : Math.max(0, Number(e.target.value));
                      if (isToroHome) setScoreToro(val);
                      else setScoreAdv(val);
                    }}
                    className="w-10 sm:w-12 text-center text-3xl sm:text-4xl font-black bg-transparent text-white focus:outline-none"
                  />
                  <span className="text-2xl font-black text-gray-500">-</span>
                  <input
                    type="number"
                    min="0"
                    value={isToroHome ? scoreAdv : scoreToro}
                    onChange={e => {
                      const val = e.target.value === "" ? "" : Math.max(0, Number(e.target.value));
                      if (isToroHome) setScoreAdv(val);
                      else setScoreToro(val);
                    }}
                    className="w-10 sm:w-12 text-center text-3xl sm:text-4xl font-black bg-transparent text-white focus:outline-none"
                  />
                </div>

                {/* Inverser Button */}
                <button
                  type="button"
                  onClick={() => setIsToroHome(!isToroHome)}
                  title="Inverser Domicile / Extérieur"
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-gray-300 bg-white/5 hover:bg-white/15 border border-white/10 hover:text-white transition-all shadow-xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Inverser</span>
                </button>
              </div>

              {/* Right Team */}
              <div className="col-span-5 text-right min-w-0">
                {isToroHome ? (
                  <div>
                    <input
                      type="text"
                      value={opponentName}
                      onChange={(e) => setOpponentName(e.target.value)}
                      placeholder="Nom de l'adversaire..."
                      className="w-full text-right text-2xl sm:text-3xl font-black tracking-tight text-white bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-gray-500 placeholder:font-normal transition-all"
                    />
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-gray-300 border border-white/10">
                      Extérieur
                    </span>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                      FC TORO
                    </h3>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Extérieur
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sub-bar: Events Actions Toolbar */}
          <div className="px-6 py-3 bg-slate-900/90 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-gray-300">
              Faits de jeu (FC Toro) :
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModalType("goal")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all shadow-xs"
              >
                <span>⚽</span> + But
              </button>
              <button
                type="button"
                onClick={() => setActiveModalType("yellow_card")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all shadow-xs"
              >
                <span className="h-3.5 w-2.5 bg-amber-400 rounded-xs inline-block" /> + Carton jaune
              </button>
              <button
                type="button"
                onClick={() => setActiveModalType("red_card")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all shadow-xs"
              >
                <span className="h-3.5 w-2.5 bg-red-600 rounded-xs inline-block" /> + Carton rouge
              </button>
            </div>
          </div>
        </div>

        {/* --- INLINE EVENT CREATION POPOVER --- */}
        {activeModalType && (
          <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {activeModalType === "goal" ? "⚽ Ajouter un But" : activeModalType === "yellow_card" ? "🟨 Ajouter un Carton jaune" : "🟥 Ajouter un Carton rouge"}
                </h4>
                <button type="button" onClick={() => setActiveModalType(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {activeModalType === "goal" ? "Buteur FC Toro *" : "Joueur sanctionné *"}
                  </label>
                  <select
                    value={newScorerId}
                    onChange={e => setNewScorerId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs p-2 font-medium dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">-- Choisir le joueur --</option>
                    {rosterPlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {getPlayerFullName(p)} ({p.poste || "Poste inconnu"})
                      </option>
                    ))}
                  </select>
                </div>

                {activeModalType === "goal" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Passeur décisif (Optionnel)
                    </label>
                    <select
                      value={newAssistId}
                      onChange={e => setNewAssistId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs p-2 font-medium dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="">-- Aucun (action individuelle) --</option>
                      {rosterPlayers.filter(p => p.id !== newScorerId).map(p => (
                        <option key={p.id} value={p.id}>
                          {getPlayerFullName(p)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateEvent}
                  disabled={!newScorerId}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-gray-900 rounded-lg disabled:opacity-50"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. MAIN DASHBOARD CONTENT AREA --- */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50 dark:bg-gray-950">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-xs font-medium border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* ROW 1: Buteurs & Passeurs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Buts Card */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Buteurs FC Toro
                </h4>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {scorersList.reduce((acc, s) => acc + s.count, 0)} {scorersList.reduce((acc, s) => acc + s.count, 0) > 1 ? "buts au total" : "but au total"}
                </span>
              </div>

              {scorersList.length === 0 ? (
                <div className="p-6 text-center border border-dashed rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Aucun but enregistré pour FC Toro.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-gray-100 dark:divide-gray-800">
                  {scorersList.map(({ player, count, assists, eventIds }) => (
                    <div key={player.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {player.photoUrl && !player.photoUrl.includes("silhouette") && !player.photoUrl.includes("user-01") ? (
                          <Image
                            src={player.photoUrl}
                            alt={getPlayerFullName(player)}
                            width={38}
                            height={38}
                            className="h-9.5 w-9.5 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                            unoptimized
                          />
                        ) : (
                          <div className="h-9.5 w-9.5 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {player.numeroMaillot || `${player.prenom?.charAt(0)}${player.nom?.charAt(0)}`}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {getPlayerFullName(player)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {assists.length > 0 ? (
                              <span>Passeurs : {assists.join(", ")}</span>
                            ) : (
                              <span className="italic text-gray-400">Action individuelle</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                          {count} {count > 1 ? "buts" : "but"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeScorerLastGoal(eventIds)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Supprimer un but de ce joueur"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Passeurs Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Passeurs décisifs
                </h4>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {assistsList.reduce((acc, a) => acc + a.count, 0)} {assistsList.reduce((acc, a) => acc + a.count, 0) > 1 ? "passes" : "passe"}
                </span>
              </div>

              {assistsList.length === 0 ? (
                <div className="p-6 text-center border border-dashed rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Aucune passe décisive enregistrée.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-gray-100 dark:divide-gray-800">
                  {assistsList.map(({ player, count }) => (
                    <div key={player.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {player.numeroMaillot || `${player.prenom?.charAt(0)}${player.nom?.charAt(0)}`}
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {getPlayerFullName(player)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        {count} {count > 1 ? "passes" : "passe"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ROW 2: Cartons Jaunes & Cartons Rouges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Cartons Jaunes */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-3 bg-amber-400 rounded-xs inline-block" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Cartons jaunes
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {yellowCardsList.length}
                </span>
              </div>

              {yellowCardsList.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 italic">Aucun carton jaune pour ce match.</p>
              ) : (
                <div className="space-y-2">
                  {yellowCardsList.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {getPlayerFullName(ev.player!)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEvent(ev.id)}
                        className="text-gray-400 hover:text-red-500 text-xs px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cartons Rouges */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-3 bg-red-600 rounded-xs inline-block" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Cartons rouges
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {redCardsList.length}
                </span>
              </div>

              {redCardsList.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 italic">Aucun carton rouge pour ce match.</p>
              ) : (
                <div className="space-y-2">
                  {redCardsList.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {getPlayerFullName(ev.player!)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEvent(ev.id)}
                        className="text-gray-400 hover:text-red-500 text-xs px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ROW 3: Analyse du Coach */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Analyse du coach
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Points Forts */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Points forts
                </label>
                <textarea
                  rows={4}
                  value={strengths}
                  onChange={e => setStrengths(e.target.value)}
                  placeholder="Ce qui a bien fonctionné pendant le match..."
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs p-3 text-gray-900 dark:text-white focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
              </div>

              {/* Points à travailler */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Points à travailler
                </label>
                <textarea
                  rows={4}
                  value={weaknesses}
                  onChange={e => setWeaknesses(e.target.value)}
                  placeholder="Ce qui n'a pas fonctionné et doit être corrigé..."
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs p-3 text-gray-900 dark:text-white focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. MODAL FOOTER BAR --- */}
        <div className="p-4 sm:px-7 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 shadow-md transition-all"
          >
            {isSubmitting ? "Enregistrement..." : "Enregistrer le rapport"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

