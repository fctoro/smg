"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { getTacticalPlan, getSavedPlans, SavedTacticalPlan, savePlan, deletePlan } from "@/lib/club/tactics";
import { Player } from "@/types/club";

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

export default function CoachTacticsPage({ planId }: { planId?: string | null }) {
  const { players, hydrated } = useClubData();
  const [formationId, setFormationId] = useState(
    defaultFifaFormationId || fallbackFormation.id,
  );
  const [planName, setPlanName] = useState("Plan de match principal");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedTacticalPlan[]>([]);
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

  useEffect(() => {
    setSavedPlans(getSavedPlans());
  }, [savedAt]);

  useEffect(() => {
    if (planId) {
      const plan = getTacticalPlan(planId);
      if (plan) {
        setFormationId(plan.formationId);
        setPlanName(plan.name);
        setAssignments(plan.assignments);
      }
    }
  }, [planId]);

  const availablePlayers = useMemo(
    () => {
      const activePlayers = [...players].filter((player) => player.statut === "actif");
      const uniquePlayers = [];
      const seen = new Set();
      for (const p of activePlayers) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          uniquePlayers.push(p);
        }
      }
      return uniquePlayers.sort(byPlayerName);
    },
    [players],
  );

  const unavailablePlayers = useMemo(
    () =>
      [...players]
        .filter((player) => player.statut !== "actif")
        .sort(byPlayerName),
    [players],
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

  useEffect(() => {
    setAssignments(buildAutoAssignments(slots, players));
  }, [slots, players]);

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

  const benchPlayers = useMemo(
    () => {
      let bench = availablePlayers.filter((player) => !selectedPlayerIds.has(player.id));
      if (searchBenchQuery) {
        const lower = searchBenchQuery.toLowerCase();
        bench = bench.filter(
          (p) =>
            p.nom.toLowerCase().includes(lower) ||
            p.prenom.toLowerCase().includes(lower) ||
            (p.poste && p.poste.toLowerCase().includes(lower))
        );
      }
      return bench;
    },
    [availablePlayers, selectedPlayerIds, searchBenchQuery],
  );

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

  const formattedSavedAt = savedAt
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(savedAt))
    : null;

  const resetAutoAssignments = () => {
    setAssignments(buildAutoAssignments(slots, players));
    setSavedAt(null);
    setSelectedStarterSlotId(null);
    setSelectedBenchPlayerId(null);
  };

  const saveCurrentPlan = () => {
    if (window.confirm("Êtes-vous sûr de vouloir sauvegarder ce plan ?")) {
      savePlan({
        name: planName,
        formationId,
        assignments,
      });
      setSavedAt(new Date().toISOString());
    }
  };

  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce plan ?")) {
      deletePlan(id);
      setSavedAt(new Date().toISOString());
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

    setSavedAt(null);
    setSelectedStarterSlotId(null);
    setSelectedBenchPlayerId(null);
    setPendingSwap(null);
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

    setSavedAt(null);
    setSelectedStarterSlotId(null);
    setPendingSwap(null);
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
        <div className="order-2 xl:order-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-700 dark:bg-white/[0.02]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Banc des remplacants
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
              Banc vers terrain, ou permutation terrain-terrain en 2 clics.
            </p>

            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Rechercher un joueur..."
                value={searchBenchQuery}
                onChange={(e) => setSearchBenchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-9 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {benchPlayers.length > 0 ? (
                benchPlayers.map((player) => (
                  <button
                    key={`bench-${player.id}`}
                    type="button"
                    onClick={() => requestSwapWithBenchPlayer(player.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all duration-200 ${
                      selectedBenchPlayerId === player.id
                        ? "border-brand-300 bg-brand-50 shadow-theme-sm dark:border-brand-500/40 dark:bg-brand-500/15"
                        : "border-gray-100 bg-white hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800/60 dark:bg-gray-800/30 dark:hover:border-brand-500/20 dark:hover:bg-brand-500/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        width={40}
                        height={40}
                        src={player.photoUrl || "/images/user/user-01.jpg"}
                        alt={getPlayerFullName(player)}
                        className={`h-10 w-10 rounded-full object-cover shadow-sm ${
                          selectedBenchPlayerId === player.id
                            ? "ring-2 ring-brand-500 ring-offset-2 dark:ring-brand-400 dark:ring-offset-gray-900"
                            : ""
                        }`}
                        unoptimized
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                          {getPlayerFullName(player)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {player.poste || "Non assigné"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`ml-3 shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${roleChipStyles[normalizePlayerRole(player.poste)]}`}
                    >
                      {player.poste}
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Tout le groupe actif est utilise.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Remplacant selectionne
              </p>
              {selectedBenchPlayer ? (
                <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                  <Image
                    src={selectedBenchPlayer.photoUrl}
                    alt={getPlayerFullName(selectedBenchPlayer)}
                    width={34}
                    height={34}
                    className="h-9 w-9 rounded-full object-cover"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {getPlayerFullName(selectedBenchPlayer)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedBenchPlayer.poste}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-800 dark:text-white/90">Aucun</p>
              )}

              <p className="mt-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                Titulaire cible
              </p>
              {selectedStarterEntry?.player ? (
                <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                  <Image
                    src={selectedStarterEntry.player.photoUrl}
                    alt={getPlayerFullName(selectedStarterEntry.player)}
                    width={34}
                    height={34}
                    className="h-9 w-9 rounded-full object-cover"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {getPlayerFullName(selectedStarterEntry.player)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedStarterEntry.slot.label} - {selectedStarterEntry.player.poste}
                    </p>
                  </div>
                </div>
              ) : selectedStarterEntry ? (
                <p className="mt-1 text-sm text-gray-800 dark:text-white/90">
                  {selectedStarterEntry.slot.label}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-800 dark:text-white/90">Aucun</p>
              )}

              {selectedBenchPlayer ? (
                <button
                  type="button"
                  onClick={handleSwapButtonClick}
                  disabled={!selectedStarterEntry}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:bg-error-300"
                >
                  <SwapArrowsIcon className="h-4 w-4" />
                  Echanger
                </button>
              ) : null}

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {selectedBenchPlayer
                  ? "Clique sur un titulaire sur le terrain pour lancer l'echange."
                  : selectedStarterSlotId
                  ? "Titulaire source selectionne: clique un 2eme titulaire pour permuter."
                  : "Clique un joueur du banc pour echanger, ou deux titulaires pour permuter."}
              </p>
            </div>
          </div>
        </div>

        <div className="order-1 xl:order-1">
          <div className="p-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom du plan
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(event) => {
                      setPlanName(event.target.value);
                      setSavedAt(null);
                    }}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Formation active
                  </label>
                  <select
                    value={formationId}
                    onChange={(event) => {
                      setFormationId(event.target.value);
                      setSavedAt(null);
                    }}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    {fifaFormations.map((formation) => (
                      <option key={formation.id} value={formation.id}>
                        {formation.label} - {formation.family}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetAutoAssignments}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Auto composer
                </button>
                <button
                  type="button"
                  onClick={saveCurrentPlan}
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Sauvegarder
                </button>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">
              Plans Tactiques Sauvegardés
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Retrouvez ici vos compositions sauvegardées.
            </p>

            <div className="space-y-3">
              {savedPlans.length > 0 ? (
                savedPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/coach?tab=tactiques&planId=${plan.id}`}
                    className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition hover:border-brand-300 hover:bg-brand-50/30 dark:border-gray-800 dark:bg-gray-800/30 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                        {plan.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Formation: <span className="font-medium text-gray-700 dark:text-gray-300">{plan.formationId}</span> • 
                        {new Date(plan.createdAt).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex h-8 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600">
                        Ouvrir
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePlan(plan.id, e)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-500 text-white shadow-theme-xs hover:bg-error-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 dark:border-gray-800">
                  <svg className="mb-2 h-8 w-8 text-gray-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Aucun plan sauvegardé
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Catalogue formations FIFA
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Clique sur une formation pour l&apos;appliquer sur le terrain.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {fifaFormations.map((formation) => (
                <button
                  key={`formation-chip-${formation.id}`}
                  type="button"
                  onClick={() => {
                    setFormationId(formation.id);
                    setSavedAt(null);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    formation.id === formationId
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-400"
                      : "border-gray-300 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-400"
                  }`}
                  title={formation.style}
                >
                  {formation.label}
                </button>
              ))}
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
