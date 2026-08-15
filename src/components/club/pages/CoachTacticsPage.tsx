"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import { useClubData } from "@/context/ClubDataContext";
import {
  defaultFifaFormationId,
  fifaFormations,
  TacticalFormation,
  TacticalRole,
} from "@/data/club/coach-formations";
import { getPlayerFullName } from "@/lib/club/metrics";
import { getTacticalPlan } from "@/lib/club/tactics";
import { fetchEffectifById, updateEffectif, fetchEffectifsByCoach } from "@/lib/club/effectifs";
import { Player, Effectif } from "@/types/club";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/context/UserRoleContext";

type SlotRole = TacticalRole | "GK";

type FormationSlot = {
  id: string;
  role: SlotRole;
  label: string;
  x: number;
  y: number;
};

const fallbackFormation = fifaFormations[0];

if (!fallbackFormation) {
  throw new Error("fifaFormations must not be empty.");
}

const lineXLayouts: Record<number, number[]> = {
  1: [50],
  2: [34, 66],
  3: [20, 50, 80],
  4: [14, 38, 62, 86],
  5: [10, 30, 50, 70, 90],
  6: [8, 24, 40, 60, 76, 92],
};

const roleChipStyles: Record<SlotRole, string> = {
  GK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  DEF: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  MID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  ATT: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const markerStyles: Record<SlotRole, string> = {
  GK: "border-amber-200 bg-amber-500",
  DEF: "border-sky-200 bg-sky-500",
  MID: "border-emerald-200 bg-emerald-500",
  ATT: "border-rose-200 bg-rose-500",
};

const roleLabel: Record<SlotRole, string> = {
  GK: "Gardien",
  DEF: "Defense",
  MID: "Milieu",
  ATT: "Attaque",
};

const SwapArrowsIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M5 7h11.5m0 0-3-3m3 3-3 3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 17H7.5m0 0 3 3m-3-3 3-3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const byPlayerName = (a: Player, b: Player) =>
  getPlayerFullName(a).localeCompare(getPlayerFullName(b), "fr");

const normalizePlayerRole = (poste: string): SlotRole => {
  const normalizedPoste = poste.toLowerCase();

  if (normalizedPoste.includes("gard")) {
    return "GK";
  }
  if (normalizedPoste.includes("def")) {
    return "DEF";
  }
  if (normalizedPoste.includes("mil")) {
    return "MID";
  }
  if (normalizedPoste.includes("attaq")) {
    return "ATT";
  }

  return "MID";
};

const getLineXPositions = (count: number) => {
  const preset = lineXLayouts[count];
  if (preset) {
    return preset;
  }

  if (count <= 1) {
    return [50];
  }

  const step = 80 / (count - 1);
  return Array.from({ length: count }, (_, index) => 10 + index * step);
};

const getDefenderLabels = (count: number) => {
  if (count === 1) {
    return ["CB"];
  }
  if (count === 2) {
    return ["LCB", "RCB"];
  }
  if (count === 3) {
    return ["LCB", "CB", "RCB"];
  }
  if (count === 4) {
    return ["LB", "LCB", "RCB", "RB"];
  }
  if (count === 5) {
    return ["LWB", "LCB", "CB", "RCB", "RWB"];
  }
  return Array.from({ length: count }, (_, index) => `D${index + 1}`);
};

const getMidfieldLabels = (count: number, y: number) => {
  const zone = y >= 60 ? "DM" : y >= 42 ? "CM" : "AM";

  if (count === 1) {
    return [`${zone}`];
  }
  if (count === 2) {
    return [`L${zone}`, `R${zone}`];
  }
  if (count === 3) {
    return [`L${zone}`, `${zone}`, `R${zone}`];
  }
  if (count === 4) {
    return [`L${zone}`, `LC${zone}`, `RC${zone}`, `R${zone}`];
  }
  if (count === 5) {
    return [`L${zone}`, `LC${zone}`, `${zone}`, `RC${zone}`, `R${zone}`];
  }
  return Array.from({ length: count }, (_, index) => `M${index + 1}`);
};

const getAttackerLabels = (count: number) => {
  if (count === 1) {
    return ["ST"];
  }
  if (count === 2) {
    return ["LS", "RS"];
  }
  if (count === 3) {
    return ["LW", "ST", "RW"];
  }
  if (count === 4) {
    return ["LW", "LS", "RS", "RW"];
  }
  return Array.from({ length: count }, (_, index) => `A${index + 1}`);
};

const getLineLabels = (role: TacticalRole, count: number, y: number) => {
  if (role === "DEF") {
    return getDefenderLabels(count);
  }
  if (role === "MID") {
    return getMidfieldLabels(count, y);
  }
  return getAttackerLabels(count);
};

const createFormationSlots = (formation: TacticalFormation): FormationSlot[] => {
  const defensiveLineY = 76;
  const attackingLineY = 22;
  const totalLines = formation.lines.length;

  const slots: FormationSlot[] = [
    {
      id: "slot-gk",
      role: "GK",
      label: "GK",
      x: 50,
      y: 90,
    },
  ];

  formation.lines.forEach((line, lineIndex) => {
    const progression = totalLines === 1 ? 0.5 : lineIndex / (totalLines - 1);
    const y = defensiveLineY - progression * (defensiveLineY - attackingLineY);
    const lineXPositions = getLineXPositions(line.count);
    const lineLabels = getLineLabels(line.role, line.count, y);

    lineXPositions.forEach((x, index) => {
      slots.push({
        id: `slot-${line.role}-${lineIndex}-${index}`,
        role: line.role,
        label: lineLabels[index] ?? `${line.role}${index + 1}`,
        x,
        y,
      });
    });
  });

  return slots;
};

const buildAutoAssignments = (slots: FormationSlot[], players: Player[]) => {
  const availablePlayers = [...players]
    .filter((player) => player.statut === "actif")
    .sort(byPlayerName);

  const pools: Record<SlotRole, Player[]> = {
    GK: [],
    DEF: [],
    MID: [],
    ATT: [],
  };

  availablePlayers.forEach((player) => {
    pools[normalizePlayerRole(player.poste)].push(player);
  });

  const usedPlayerIds = new Set<string>();
  const assignments: Record<string, string> = {};

  const pickFallback = () =>
    availablePlayers.find((player) => !usedPlayerIds.has(player.id));

  slots.forEach((slot) => {
    const preferred = pools[slot.role].find(
      (player) => !usedPlayerIds.has(player.id),
    );
    const selectedPlayer = preferred ?? pickFallback();

    if (!selectedPlayer) {
      return;
    }

    assignments[slot.id] = selectedPlayer.id;
    usedPlayerIds.add(selectedPlayer.id);
  });

  return assignments;
};

export default function CoachTacticsPage({ planId, effectifId }: { planId?: string | null, effectifId?: string | null }) {
  const router = useRouter();
  const { players, hydrated } = useClubData();
  const [formationId, setFormationId] = useState(
    defaultFifaFormationId || fallbackFormation.id,
  );
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [squadIds, setSquadIds] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchRemainingQuery, setSearchRemainingQuery] = useState("");
  const [searchBenchQuery, setSearchBenchQuery] = useState("");
  const [selectedStarterSlotId, setSelectedStarterSlotId] = useState<string | null>(
    null,
  );
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<string | null>(
    null,
  );
  const [pendingSwap, setPendingSwap] = useState<{
    slotId: string;
    benchPlayerId: string;
  } | null>(null);

  // Effectif state
  const [effectif, setEffectif] = useState<Effectif | null>(null);
  const [isEffectifModified, setIsEffectifModified] = useState(false);
  const [isSavingEffectif, setIsSavingEffectif] = useState(false);

  const [isPlanLoaded, setIsPlanLoaded] = useState(false);
  const { userEmail } = useUserRole();
  const [coachRosters, setCoachRosters] = useState<Effectif[]>([]);
  const [loadingCoachRosters, setLoadingCoachRosters] = useState(false);

  useEffect(() => {
    if (userEmail) {
      setLoadingCoachRosters(true);
      fetchEffectifsByCoach(userEmail).then(data => {
        setCoachRosters(data || []);
        setLoadingCoachRosters(false);
      });
    }
  }, [userEmail, effectif]);

  useEffect(() => {
    if (effectifId) {
      fetchEffectifById(effectifId).then(data => {
        if (data) {
          setEffectif(data);
          // Initialize squadIds with all roster players
          setSquadIds(data.joueurs || []);
          
          // Try to load saved plan from localStorage using tactique_id or effectifId
          const planKey = data.tactique_id || effectifId;
          const plan = getTacticalPlan(planKey);
          if (plan) {
            setFormationId(plan.formationId);
            setAssignments(plan.assignments);
          }
          setIsPlanLoaded(true);
        }
      });
    } else if (planId) {
      const plan = getTacticalPlan(planId);
      if (plan) {
        setFormationId(plan.formationId);
        setAssignments(plan.assignments);
        // Restore squadIds from plan
        const starterIds = Object.values(plan.assignments);
        const savedBenchIds = (plan as any).benchIds || [];
        setSquadIds([...new Set([...starterIds, ...savedBenchIds])]);
      }
      setIsPlanLoaded(true);
    } else {
      setIsPlanLoaded(true);
    }
  }, [planId, effectifId]);

  const availablePlayers = useMemo(
    () => {
      // Allow players that are either active OR part of the current effectif roster
      const rosterIds = new Set(effectif?.joueurs || []);
      const validPlayers = [...players].filter((player) => player.statut === "actif" || rosterIds.has(player.id));
      const uniquePlayers = [];
      const seen = new Set();
      for (const p of validPlayers) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          uniquePlayers.push(p);
        }
      }
      return uniquePlayers.sort(byPlayerName);
    },
    [players, effectif],
  );

  const unavailablePlayers = useMemo(
    () => {
      const rosterIds = new Set(effectif?.joueurs || []);
      return [...players]
        .filter((player) => player.statut !== "actif" && !rosterIds.has(player.id))
        .sort(byPlayerName);
    },
    [players, effectif],
  );

  const selectedFormation = useMemo(
    () =>
      fifaFormations.find((formation) => formation.id === formationId) ??
      fallbackFormation,
    [formationId],
  );

  const slots = useMemo(
    () => createFormationSlots(selectedFormation),
    [selectedFormation],
  );

  const hasAutoAssigned = useRef(false);

  useEffect(() => {
    // Only auto-assign ONCE when plan is loaded
    if (!isPlanLoaded || hasAutoAssigned.current) return;

    if (effectif) {
      // Auto-assign starters from effectif players only if no assignments exist yet
      if (Object.keys(assignments).length === 0) {
        const rosterPlayerIds = effectif.joueurs || [];
        const newAssignments: Record<string, string> = {};
        const starters = rosterPlayerIds.slice(0, 11);
        
        starters.forEach((pid, index) => {
          if (slots[index]) {
            newAssignments[slots[index].id] = pid;
          }
        });
        setAssignments(newAssignments);
      }
      hasAutoAssigned.current = true;
    } else {
      // General tactics page with no effectif (no action taking place):
      // Keep all positions as "Libre" (assignments = {}), do not auto-populate.
      hasAutoAssigned.current = true;
    }
  }, [slots, players, effectif, planId, isPlanLoaded]);

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const starters = useMemo(
    () =>
      slots.map((slot) => ({
        slot,
        player: playerById.get(assignments[slot.id]) ?? null,
      })),
    [slots, playerById, assignments],
  );

  const selectedPlayerIds = useMemo(
    () => new Set(Object.values(assignments)),
    [assignments],
  );

  const benchPlayers = useMemo(() => {
    let bench = players.filter(p => squadIds.includes(p.id) && !selectedPlayerIds.has(p.id));
    if (searchBenchQuery) {
      const lower = searchBenchQuery.toLowerCase();
      bench = bench.filter(
        (p) =>
          p.nom.toLowerCase().includes(lower) ||
          p.prenom.toLowerCase().includes(lower) ||
          (p.poste && p.poste.toLowerCase().includes(lower))
      );
    }
    return bench.sort(byPlayerName);
  }, [players, squadIds, selectedPlayerIds, searchBenchQuery]);

  const remainingPlayers = useMemo(() => {
    let pool = players.filter(p => p.statut === "actif" && !squadIds.includes(p.id));
    if (effectif) {
      const targetCat = (effectif.categorie || "").trim().toLowerCase();
      pool = pool.filter(p => (p.categorie || "").trim().toLowerCase() === targetCat);
    }
    if (searchRemainingQuery) {
      const lower = searchRemainingQuery.toLowerCase();
      pool = pool.filter(p =>
        p.nom.toLowerCase().includes(lower) ||
        p.prenom.toLowerCase().includes(lower) ||
        (p.poste && p.poste.toLowerCase().includes(lower))
      );
    }
    return pool.sort(byPlayerName);
  }, [players, squadIds, effectif, searchRemainingQuery]);

  // --- Squad Management ---

  const addToBench = (playerId: string) => {
    if (squadIds.length >= 25) { alert("Limite de 25 joueurs au total."); return; }
    if (!squadIds.includes(playerId)) {
      setSquadIds(prev => [...prev, playerId]);
      setHasUnsavedChanges(true);
      if (effectif) setIsEffectifModified(true);
    }
  };

  const removeFromSquad = (playerId: string) => {
    setSquadIds(prev => prev.filter(id => id !== playerId));
    setAssignments(prev => {
      const next = { ...prev };
      Object.entries(next).forEach(([slotId, pId]) => { if (pId === playerId) delete next[slotId]; });
      return next;
    });
    setHasUnsavedChanges(true);
    if (effectif) setIsEffectifModified(true);
  };

  const clearField = () => {
    if (Object.keys(assignments).length === 0) return;
    if (window.confirm("Voulez-vous vraiment retirer tous les joueurs du terrain ?")) {
      setAssignments({});
      setHasUnsavedChanges(true);
      if (effectif) setIsEffectifModified(true);
    }
  };

  const autoBenchRemaining = () => {
    if (remainingPlayers.length === 0) return;
    const currentCount = squadIds.length;
    const spaceLeft = 25 - currentCount;
    if (spaceLeft <= 0) {
      alert("Limite de 25 joueurs déjà atteinte.");
      return;
    }
    const playersToAdd = remainingPlayers.slice(0, spaceLeft).map(p => p.id);
    setSquadIds(prev => [...prev, ...playersToAdd]);
    setHasUnsavedChanges(true);
    if (effectif) setIsEffectifModified(true);
  };

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnBench = (e: React.DragEvent) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;
    setAssignments(prev => {
      const next = { ...prev };
      Object.entries(next).forEach(([sId, pId]) => { if (pId === playerId) delete next[sId]; });
      return next;
    });
    if (!squadIds.includes(playerId)) addToBench(playerId);
    else { setHasUnsavedChanges(true); if (effectif) setIsEffectifModified(true); }
  };

  const handleDropOnSlot = (e: React.DragEvent, targetSlotId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;
    if (squadIds.length >= 25 && !squadIds.includes(playerId)) { alert("Limite de 25 joueurs."); return; }
    setAssignments(prev => {
      const next = { ...prev };
      Object.entries(next).forEach(([sId, pId]) => { if (pId === playerId) delete next[sId]; });
      next[targetSlotId] = playerId;
      return next;
    });
    if (!squadIds.includes(playerId)) setSquadIds(prev => [...prev, playerId]);
    setHasUnsavedChanges(true);
    if (effectif) setIsEffectifModified(true);
  };

  const handleDropOnRemaining = (e: React.DragEvent) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;
    removeFromSquad(playerId);
  };

  const selectedStarterEntry = useMemo(
    () =>
      starters.find((entry) => entry.slot.id === selectedStarterSlotId) ?? null,
    [starters, selectedStarterSlotId],
  );

  const selectedBenchPlayer = useMemo(
    () =>
      selectedBenchPlayerId ? playerById.get(selectedBenchPlayerId) ?? null : null,
    [selectedBenchPlayerId, playerById],
  );

  const pendingSwapStarter = useMemo(
    () =>
      pendingSwap
        ? playerById.get(assignments[pendingSwap.slotId]) ?? null
        : null,
    [pendingSwap, playerById, assignments],
  );

  const pendingSwapBench = useMemo(
    () =>
      pendingSwap ? playerById.get(pendingSwap.benchPlayerId) ?? null : null,
    [pendingSwap, playerById],
  );

  const pendingSwapSlot = useMemo(
    () =>
      pendingSwap ? slots.find((slot) => slot.id === pendingSwap.slotId) ?? null : null,
    [pendingSwap, slots],
  );

  useEffect(() => {
    if (!selectedStarterSlotId) {
      return;
    }

    const slotStillExists = slots.some((slot) => slot.id === selectedStarterSlotId);
    if (!slotStillExists) {
      setSelectedStarterSlotId(null);
    }
  }, [selectedStarterSlotId, slots]);

  useEffect(() => {
    if (!selectedBenchPlayerId) {
      return;
    }

    if (selectedPlayerIds.has(selectedBenchPlayerId)) {
      setSelectedBenchPlayerId(null);
    }
  }, [selectedBenchPlayerId, selectedPlayerIds]);

  const filledSlots = starters.filter((entry) => entry.player !== null).length;
  const roleFitCount = starters.filter((entry) => {
    if (!entry.player) {
      return false;
    }
    return normalizePlayerRole(entry.player.poste) === entry.slot.role;
  }).length;

  const totalSlots = slots.length || 1;
  const coverageRate = Math.round((filledSlots / totalSlots) * 100);
  const chemistryRate = Math.round((roleFitCount / totalSlots) * 100);

  const resetAutoAssignments = () => {
    setAssignments(buildAutoAssignments(slots, players));
    setSelectedStarterSlotId(null);
    setSelectedBenchPlayerId(null);
  };

  const saveEffectifMatch = async () => {
    if (!effectif) return;
    setIsSavingEffectif(true);

    // Save ALL squad members (terrain + bench), max 25
    const newJoueurs: string[] = [...new Set(squadIds)].slice(0, 25);

    // 1. Save tactical plan to localStorage under effectif.id
    const stored = localStorage.getItem("fctoro_coach_plans");
    let plans = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) plans = parsed;
      } catch (e) {}
    }
    plans = plans.filter((p: any) => p.id !== effectif.id);
    plans.push({
      id: effectif.id,
      name: effectif.nom,
      formationId: formationId,
      assignments: assignments,
      benchIds: benchPlayers.map(p => p.id),
      createdAt: new Date().toISOString()
    });
    localStorage.setItem("fctoro_coach_plans", JSON.stringify(plans));

    // 2. Save roster players and plan reference to Supabase
    const { error } = await updateEffectif(effectif.id, { 
      joueurs: newJoueurs,
      tactique_id: effectif.id
    });

    setIsSavingEffectif(false);
    if (!error) {
      setIsEffectifModified(false);
      setHasUnsavedChanges(false);
      setEffectif({ ...effectif, joueurs: newJoueurs, tactique_id: effectif.id });
      alert("Effectif et plan tactique sauvegardés avec succès !");
    } else {
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const applySwap = (slotId: string, benchPlayerId: string) => {
    setAssignments((previous) => {
      const nextAssignments = { ...previous };
      const currentStarterId = nextAssignments[slotId];

      if (currentStarterId === benchPlayerId) {
        return nextAssignments;
      }

      Object.keys(nextAssignments).forEach((key) => {
        if (key !== slotId && nextAssignments[key] === benchPlayerId) {
          delete nextAssignments[key];
        }
      });

      nextAssignments[slotId] = benchPlayerId;
      return nextAssignments;
    });
    setSelectedStarterSlotId(null);
    setSelectedBenchPlayerId(null);
    setPendingSwap(null);
    if (effectif) setIsEffectifModified(true);
  };

  const swapStarterPositions = (firstSlotId: string, secondSlotId: string) => {
    if (firstSlotId === secondSlotId) {
      return;
    }

    setAssignments((previous) => {
      const nextAssignments = { ...previous };
      const firstPlayerId = nextAssignments[firstSlotId];
      const secondPlayerId = nextAssignments[secondSlotId];

      if (secondPlayerId) {
        nextAssignments[firstSlotId] = secondPlayerId;
      } else {
        delete nextAssignments[firstSlotId];
      }

      if (firstPlayerId) {
        nextAssignments[secondSlotId] = firstPlayerId;
      } else {
        delete nextAssignments[secondSlotId];
      }

      return nextAssignments;
    });
    setSelectedStarterSlotId(null);
    setPendingSwap(null);
    if (effectif) setIsEffectifModified(true);
  };

  const openSwapModal = (slotId: string, benchPlayerId: string) => {
    setPendingSwap({ slotId, benchPlayerId });
  };

  const closeSwapModal = () => {
    setPendingSwap(null);
    setSelectedStarterSlotId(null);
    setSelectedBenchPlayerId(null);
  };

  const requestSwapWithStarter = (slot: FormationSlot) => {
    if (!selectedBenchPlayerId) {
      if (!selectedStarterSlotId) {
        setSelectedStarterSlotId(slot.id);
        return;
      }

      if (selectedStarterSlotId === slot.id) {
        setSelectedStarterSlotId(null);
        return;
      }

      swapStarterPositions(selectedStarterSlotId, slot.id);
      return;
    }

    setSelectedStarterSlotId(slot.id);

    const benchPlayer = playerById.get(selectedBenchPlayerId);
    if (!benchPlayer) {
      return;
    }

    openSwapModal(slot.id, benchPlayer.id);
  };

  const requestSwapWithBenchPlayer = (benchPlayerId: string) => {
    if (!selectedStarterSlotId) {
      setSelectedBenchPlayerId((previous) =>
        previous === benchPlayerId ? null : benchPlayerId,
      );
      setPendingSwap(null);
      return;
    }

    setSelectedBenchPlayerId(benchPlayerId);
    openSwapModal(selectedStarterSlotId, benchPlayerId);
  };

  const handleSwapButtonClick = () => {
    if (!selectedBenchPlayer || !selectedStarterEntry) {
      return;
    }

    openSwapModal(selectedStarterEntry.slot.id, selectedBenchPlayer.id);
  };

  const confirmPendingSwap = () => {
    if (!pendingSwap) {
      return;
    }
    applySwap(pendingSwap.slotId, pendingSwap.benchPlayerId);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Tactiques & Terrain" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,760px)_360px] xl:items-start xl:justify-start xl:gap-5">
        <div className="order-2 xl:order-2 space-y-5">
          {/* BANC DES REMPLACANTS */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-700 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Banc <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{benchPlayers.length}</span>
              </h3>
              <div className="flex items-center gap-3">
                {Object.keys(assignments).length > 0 && (
                  <button type="button" onClick={clearField} className="text-xs font-semibold text-error-500 hover:text-error-600 transition-colors">
                    Vider le terrain
                  </button>
                )}
                <span className="text-xs text-gray-400">{squadIds.length}/25</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Cliquez pour sélectionner puis cliquer un poste sur le terrain. Glissez vers les restants.</p>
            <div className="relative mb-3">
              <input type="text" placeholder="Rechercher..." value={searchBenchQuery}
                onChange={(e) => setSearchBenchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-9 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <div className="min-h-[80px] max-h-[280px] overflow-y-auto space-y-1.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-2 hover:border-brand-300 transition-all"
              onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnBench}
            >
              {benchPlayers.length > 0 ? benchPlayers.map((player) => (
                <div key={player.id} draggable
                  onDragStart={(e) => handleDragStart(e, player.id)}
                  onClick={() => requestSwapWithBenchPlayer(player.id)}
                  className={`group flex items-center justify-between rounded-xl border p-2 pl-2.5 cursor-pointer transition-all ${
                    selectedBenchPlayerId === player.id
                      ? "border-brand-400 bg-brand-50 shadow-sm ring-2 ring-brand-300 dark:border-brand-500 dark:bg-brand-500/15 dark:ring-brand-500/40"
                      : "border-gray-100 bg-white hover:border-brand-200 hover:bg-brand-50/30 dark:border-gray-800 dark:bg-gray-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-br text-white font-bold text-[11px] flex items-center justify-center transition-all ${
                      selectedBenchPlayerId === player.id
                        ? "from-brand-600 to-brand-800 ring-2 ring-brand-400 ring-offset-1"
                        : "from-brand-500 to-brand-700"
                    }`}>
                      {player.prenom?.charAt(0)}{player.nom?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">{getPlayerFullName(player)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{player.poste || "—"}</p>
                    </div>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeFromSquad(player.id); }} title="Retirer du banc"
                    className="opacity-0 group-hover:opacity-100 ml-2 shrink-0 h-7 w-7 rounded-full bg-error-50 hover:bg-error-100 text-error-500 flex items-center justify-center transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4"/></svg>
                  </button>
                </div>
              )) : (
                <p className="text-center text-sm text-gray-400 py-5">Banc vide — glissez un joueur ici</p>
              )}
            </div>
          </div>

          {/* JOUEURS RESTANTS */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-700 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Restants <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{remainingPlayers.length}</span>
              </h3>
              {remainingPlayers.length > 0 && squadIds.length < 25 && (
                <button type="button" onClick={autoBenchRemaining} className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors">
                  Banc auto
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Cliquez + pour ajouter au banc, ou glissez sur le terrain.</p>
            <div className="relative mb-3">
              <input type="text" placeholder="Rechercher..." value={searchRemainingQuery}
                onChange={(e) => setSearchRemainingQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-9 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <div className="min-h-[80px] max-h-[280px] overflow-y-auto space-y-1.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-2 hover:border-brand-300 transition-all"
              onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnRemaining}
            >
              {remainingPlayers.length > 0 ? remainingPlayers.map((player) => (
                <div key={player.id} draggable onDragStart={(e) => handleDragStart(e, player.id)}
                  className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-2 pl-2.5 cursor-grab opacity-70 hover:opacity-100 hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-white font-bold text-[11px] flex items-center justify-center">
                      {player.prenom?.charAt(0)}{player.nom?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white/90 transition-colors">{getPlayerFullName(player)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{player.poste || "—"}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => addToBench(player.id)} title="Ajouter au banc"
                    className="opacity-0 group-hover:opacity-100 ml-2 shrink-0 h-7 w-7 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-600 flex items-center justify-center transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                  </button>
                </div>
              )) : (
                <p className="text-center text-sm text-gray-400 py-5">Aucun joueur disponible</p>
              )}
            </div>
          </div>

          {/* VOS EFFECTIFS */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-700 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Vos Effectifs
                </h3>
              </div>
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                {coachRosters.length}
              </span>
            </div>
            
            <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loadingCoachRosters ? (
                <div className="flex items-center justify-center py-6">
                  <svg className="animate-spin h-5 w-5 text-brand-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                </div>
              ) : coachRosters.length > 0 ? (
                coachRosters.map((r) => {
                  const isActive = effectif?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        const isDirty = hasUnsavedChanges || isEffectifModified;
                        if (isDirty && !window.confirm("Vous avez des modifications non sauvegardées. Continuer ?")) return;
                        
                        hasAutoAssigned.current = false;
                        router.push(`/coach?tab=tactiques&effectifId=${r.id}`);
                      }}
                      className={`w-full group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 text-left ${
                        isActive
                          ? "border-brand-500 bg-brand-500/[0.04] shadow-xs pl-4 border-l-4 border-l-brand-500 dark:border-brand-500 dark:bg-brand-500/10"
                          : "border-gray-100 bg-white hover:border-brand-300 hover:shadow-sm hover:translate-x-0.5 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-brand-500/40"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className={`text-sm font-semibold truncate ${
                          isActive ? "text-brand-700 dark:text-brand-400" : "text-gray-800 dark:text-white/90 group-hover:text-brand-600 dark:group-hover:text-brand-400"
                        }`}>
                          {r.nom}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isActive
                              ? "bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {r.categorie}
                          </span>
                          {r.date_match && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(r.date_match).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive ? (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                          </span>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <p className="text-xs text-gray-400">Aucun effectif créé</p>
                </div>
              )}
            </div>
          </div>
        </div>

                <div className="order-1 xl:order-1">
          <div className="p-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Formation active
                </label>
                <select
                  value={formationId}
                  onChange={(event) => {
                    setFormationId(event.target.value);
                    if (effectif) setIsEffectifModified(true);
                  }}
                  className="h-11 min-w-[200px] rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  {fifaFormations.map((formation) => (
                    <option key={formation.id} value={formation.id}>
                      {formation.label} - {formation.family}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const isDirty = hasUnsavedChanges || isEffectifModified;
                    if (isDirty && !window.confirm("Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?")) return;
                    router.push('/coach?tab=effectifs');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
                >
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Quitter
                </button>
                {effectif && (
                  <button
                    type="button"
                    onClick={saveEffectifMatch}
                    disabled={isSavingEffectif}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 shadow-sm transition-all"
                  >
                    {isSavingEffectif ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                )}
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {selectedFormation.label} - {selectedFormation.style}
            </p>

            <div className="mt-5">
              <div className="relative mr-auto aspect-[3/4] w-full overflow-hidden rounded-3xl border-2 border-emerald-300/80 shadow-2xl dark:border-emerald-500/40">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-800" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),transparent_58%)]" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_54px,rgba(255,255,255,0.12)_55px,transparent_56px)]" />

                <div className="absolute left-0 right-0 top-1/2 border-t border-white/70" />
                <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70" />
                <div className="absolute left-1/2 top-0 h-20 w-44 -translate-x-1/2 border-x border-b border-white/70" />
                <div className="absolute left-1/2 top-0 h-9 w-20 -translate-x-1/2 border-x border-b border-white/70" />
                <div className="absolute left-1/2 bottom-0 h-20 w-44 -translate-x-1/2 border-x border-t border-white/70" />
                <div className="absolute left-1/2 bottom-0 h-9 w-20 -translate-x-1/2 border-x border-t border-white/70" />

                {starters.map(({ slot, player }) => (
                  <div
                    key={slot.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  >
                    <button
                      type="button"
                      onClick={() => requestSwapWithStarter(slot)}
                      className={`mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 text-[10px] font-semibold text-white shadow-lg transition ${markerStyles[slot.role]} ${
                        selectedStarterSlotId === slot.id
                          ? "ring-2 ring-white ring-offset-2 ring-offset-emerald-700"
                          : ""
                      }`}
                      title={`${slot.label} - ${player ? getPlayerFullName(player) : "Libre"}`}
                    >
                      {player ? (
                        <Image
                          src={player.photoUrl}
                          alt={getPlayerFullName(player)}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span>{slot.label}</span>
                      )}
                    </button>
                    <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                      {slot.label}
                    </p>
                    <p className="max-w-[84px] truncate text-center text-[10px] text-white/90">
                      {player ? player.prenom : "Libre"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>


      <Modal
        isOpen={Boolean(pendingSwap)}
        onClose={closeSwapModal}
        className="mx-4 max-w-[560px]"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 p-6 sm:p-7">
          <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-error-500/20 blur-3xl" />

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">
            Confirmation d&apos;echange
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Valider le changement ?
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            Cette action remplacera le titulaire selectionne sur le terrain.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="rounded-2xl border border-white/15 bg-white/8 p-3">
              {pendingSwapBench ? (
                <div className="flex items-center gap-3">
                  <Image
                    src={pendingSwapBench.photoUrl}
                    alt={getPlayerFullName(pendingSwapBench)}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full border border-white/30 object-cover"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {getPlayerFullName(pendingSwapBench)}
                    </p>
                    <p className="text-xs text-slate-300">
                      Remplacant - {pendingSwapBench.poste}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-200">Remplacant non disponible</p>
              )}
            </div>

            <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-error-500 text-white">
              <SwapArrowsIcon className="h-5 w-5" />
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/8 p-3">
              {pendingSwapStarter ? (
                <div className="flex items-center gap-3">
                  <Image
                    src={pendingSwapStarter.photoUrl}
                    alt={getPlayerFullName(pendingSwapStarter)}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full border border-white/30 object-cover"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {getPlayerFullName(pendingSwapStarter)}
                    </p>
                    <p className="text-xs text-slate-300">
                      Titulaire - {pendingSwapSlot?.label ?? "Poste"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-200">
                  Poste cible: {pendingSwapSlot?.label ?? "non defini"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeSwapModal}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmPendingSwap}
              disabled={!pendingSwap}
              className="inline-flex items-center gap-2 rounded-lg bg-error-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:bg-error-400"
            >
              <SwapArrowsIcon className="h-4 w-4" />
              Confirmer l&apos;echange
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
