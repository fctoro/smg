"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import { updatePlayerInSupabase } from "@/lib/club/supabase-crud";
import { Player } from "@/types/club";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/modal/ConfirmModal";
import {
  GroupIcon,
  DollarLineIcon,
  PieChartIcon,
  ShootingStarIcon,
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
} from "@/icons/index";

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const DEFAULT_STATUS_OPTIONS = [
  "Bourse",
  "Boursier",
  "Demi-bourse",
  "Joueur spécial",
];

export default function StatutsSpeciauxPage() {
  const { players, setPlayers } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<Player | null>(null);
  const [playerSearchInput, setPlayerSearchInput] = useState("");
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [targetPlayerId, setTargetPlayerId] = useState("");
  const [selectedStatusValue, setSelectedStatusValue] = useState("");
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [playerPendingRemoval, setPlayerPendingRemoval] = useState<Player | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowPlayerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter active players that have a special status
  const activePlayers = useMemo(
    () => players.filter((p) => p.statut !== "alumni"),
    [players]
  );

  const playersWithSpecialStatus = useMemo(() => {
    return activePlayers.filter((p) => {
      const status = (p.statutJoueur || "").trim().toLowerCase();
      return (
        status !== "" &&
        status !== "aucun" &&
        status !== "normal" &&
        status !== "undefined" &&
        status !== "null" &&
        status !== "inactif"
      );
    });
  }, [activePlayers]);

  // Statistics across the 3 categories
  const stats = useMemo(() => {
    let bourse = 0;
    let demiBourse = 0;
    let joueurSpecial = 0;

    playersWithSpecialStatus.forEach((p) => {
      const st = (p.statutJoueur || "").toLowerCase();
      if (st.includes("demi")) {
        demiBourse++;
      } else if (st.includes("bourse") || st.includes("boursier")) {
        bourse++;
      } else {
        joueurSpecial++;
      }
    });

    return {
      total: playersWithSpecialStatus.length,
      bourse,
      demiBourse,
      joueurSpecial,
    };
  }, [playersWithSpecialStatus]);

  // Available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activePlayers.forEach((p) => {
      if (p.categorie) set.add(p.categorie);
    });
    return Array.from(set).sort();
  }, [activePlayers]);

  // Filtered players list for the table
  const filteredList = useMemo(() => {
    return playersWithSpecialStatus.filter((player) => {
      const fullName = getPlayerFullName(player).toLowerCase();
      const matricule = (player.matricule || "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || fullName.includes(query) || matricule.includes(query);

      const matchesCat = categoryFilter === "all" || player.categorie === categoryFilter;

      const st = (player.statutJoueur || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "bourse") {
        matchesStatus = st.includes("bourse") && !st.includes("demi");
      } else if (statusFilter === "demi-bourse") {
        matchesStatus = st.includes("demi");
      } else if (statusFilter === "special") {
        matchesStatus = !st.includes("demi") && !st.includes("bourse");
      }

      return matchesSearch && matchesCat && matchesStatus;
    })
    .sort((a, b) => {
      const isAActif = (a.statut || "").toLowerCase() === "actif";
      const isBActif = (b.statut || "").toLowerCase() === "actif";
      if (isAActif && !isBActif) return -1;
      if (!isAActif && isBActif) return 1;

      const nomA = (a.nom || "").trim();
      const nomB = (b.nom || "").trim();
      const nomCompare = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
      if (nomCompare !== 0) return nomCompare;

      const prenomA = (a.prenom || "").trim();
      const prenomB = (b.prenom || "").trim();
      return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
    });
  }, [playersWithSpecialStatus, searchQuery, categoryFilter, statusFilter]);

  // Search dropdown players when adding a new status
  const dropdownFilteredPlayers = useMemo(() => {
    const query = playerSearchInput.trim().toLowerCase();
    if (!query) return activePlayers.slice(0, 20);
    return activePlayers.filter((player) => {
      const fullName = getPlayerFullName(player).toLowerCase();
      const matricule = (player.matricule || "").toLowerCase();
      return fullName.includes(query) || matricule.includes(query);
    });
  }, [activePlayers, playerSearchInput]);

  const selectedTargetPlayer = useMemo(() => {
    return activePlayers.find((p) => p.id === targetPlayerId) || null;
  }, [activePlayers, targetPlayerId]);

  const handleOpenAddModal = (playerToEdit?: Player) => {
    if (playerToEdit) {
      setSelectedPlayerForEdit(playerToEdit);
      setTargetPlayerId(playerToEdit.id);
      setPlayerSearchInput(getPlayerFullName(playerToEdit));
      const currentSt = playerToEdit.statutJoueur || "";
      if (DEFAULT_STATUS_OPTIONS.includes(currentSt)) {
        setSelectedStatusValue(currentSt);
        setCustomStatusInput("");
      } else {
        setSelectedStatusValue("custom");
        setCustomStatusInput(currentSt);
      }
    } else {
      setSelectedPlayerForEdit(null);
      setTargetPlayerId("");
      setPlayerSearchInput("");
      setSelectedStatusValue("Bourse");
      setCustomStatusInput("");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlayerForEdit(null);
    setTargetPlayerId("");
    setPlayerSearchInput("");
    setSelectedStatusValue("");
    setCustomStatusInput("");
  };

  const handleSaveStatus = async () => {
    const finalPlayerId = selectedPlayerForEdit ? selectedPlayerForEdit.id : targetPlayerId;
    if (!finalPlayerId) {
      alert("Veuillez sélectionner un joueur.");
      return;
    }

    const finalStatus =
      selectedStatusValue === "custom"
        ? customStatusInput.trim()
        : selectedStatusValue.trim();

    setIsSaving(true);
    try {
      await updatePlayerInSupabase(finalPlayerId, { statutJoueur: finalStatus });

      setPlayers((prev) =>
        prev.map((p) => (p.id === finalPlayerId ? { ...p, statutJoueur: finalStatus } : p))
      );

      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour du statut du joueur.");
    } finally {
      setIsSaving(false);
    }
  };
  const handleRemoveStatus = (player: Player) => {
    setPlayerPendingRemoval(player);
  };

  const confirmRemoveStatus = async () => {
    if (!playerPendingRemoval) return;

    try {
      const pIds = (playerPendingRemoval as any).playerIds || [playerPendingRemoval.id];
      await updatePlayerInSupabase(playerPendingRemoval.id, { 
        statutJoueur: "Normal",
        playerIds: pIds,
      } as any);
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerPendingRemoval.id ? { ...p, statutJoueur: "Normal" } : p))
      );
      setPlayerPendingRemoval(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression du statut.");
    }
  };
  const renderBadge = (status?: string) => {
    if (!status) return null;
    const stLower = status.toLowerCase();

    // Afficher le texte sans icône pour les statuts "inactif", "normal" ou "aucun"
    if (stLower === "inactif" || stLower === "normal" || stLower === "aucun") {
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          {status}
        </span>
      );
    }

    if (stLower.includes("demi")) {
      const hasPercent = status.includes("%");
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
          {hasPercent ? status : `${status} (50%)`}
        </span>
      );
    }
    if (stLower.includes("bourse") || stLower.includes("boursier")) {
      const hasPercent = status.includes("%");
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
          {hasPercent ? status : `${status} (100%)`}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Statuts Spéciaux & Bourses" />

      {/* Header section with title and main CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Liste des Joueurs à Statut Spécial
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestion des 3 catégories de statuts : Bourse (100%), Demi-bourse (50%) et Joueurs spéciaux.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/joueurs"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            ← Tous les joueurs
          </Link>
          <button
            onClick={() => handleOpenAddModal()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <PlusIcon />
            </span>
            Assigner un statut spécial
          </button>
        </div>
      </div>

      {/* KPI Cards: Total joueur + 3 Categories (Bourse, Demi-bourse, Joueurs spéciaux) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total joueur */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total joueur
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <GroupIcon />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total} <span className="text-xs font-normal text-gray-500">joueurs</span>
          </p>
        </div>

        {/* Card 2: Bourse */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Bourse (100%)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <DollarLineIcon />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.bourse} <span className="text-xs font-normal text-gray-500">joueurs</span>
          </p>
        </div>

        {/* Card 3: Demi-bourse */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Demi-bourse (50%)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <PieChartIcon />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.demiBourse} <span className="text-xs font-normal text-gray-500">joueurs</span>
          </p>
        </div>

        {/* Card 4: Joueurs spéciaux */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Joueurs spéciaux
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <ShootingStarIcon />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.joueurSpecial} <span className="text-xs font-normal text-gray-500">joueurs</span>
          </p>
        </div>
      </div>

      {/* Filters and Table Container */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Rechercher par nom ou code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClassName}
              />
              {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`${selectClassName} max-w-[180px]`}
            >
              <option value="all">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 3 Categories Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {[
              { id: "all", label: "Tous" },
              { id: "bourse", label: "Bourse" },
              { id: "demi-bourse", label: "Demi-bourse" },
              { id: "special", label: "Joueurs spéciaux" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? "bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Players Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3.5">Joueur</th>
                <th className="px-4 py-3.5">Code / Matricule</th>
                <th className="px-4 py-3.5">Catégorie</th>
                <th className="px-4 py-3.5">Poste</th>
                <th className="px-4 py-3.5">Statut Spécial</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun joueur avec statut spécial pour le moment.
                  </td>
                </tr>
              ) : (
                filteredList.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Joueur Photo & Name */}
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <Image
                          src={player.photoUrl || "/images/user/silhouette.svg"}
                          alt={getPlayerFullName(player)}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {getPlayerFullName(player)}
                          </p>
                          <p className="text-xs text-gray-400">{player.sexe || ""}</p>
                        </div>
                      </div>
                    </td>

                    {/* Matricule */}
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {player.matricule || "—"}
                    </td>

                    {/* Catégorie */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {player.categorie}
                      </span>
                    </td>

                    {/* Poste */}
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                      {player.poste || "Joueur"}
                    </td>

                    {/* Statut Spécial Badge */}
                    <td className="px-4 py-3">{renderBadge(player.statutJoueur)}</td>

                    {/* Contact */}
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {player.telephone || player.email || "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(player)}
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                          aria-label="Modifier"
                          title="Modifier le statut"
                        >
                          <PencilIcon className="size-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStatus(player)}
                          className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                          aria-label="Retirer le statut"
                          title="Retirer le statut spécial"
                        >
                          <TrashBinIcon className="size-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!playerPendingRemoval}
        onClose={() => setPlayerPendingRemoval(null)}
        onConfirm={confirmRemoveStatus}
        title="Retirer le statut"
        message={
          playerPendingRemoval
            ? `Voulez-vous vraiment retirer le statut spécial de ${getPlayerFullName(playerPendingRemoval)} ?`
            : ""
        }
        confirmText="Retirer"
        cancelText="Annuler"
        isDestructive
      />

      {/* Modal for Assigning / Editing Special Status */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} className="max-w-lg">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {selectedPlayerForEdit ? "Modifier le statut spécial" : "Assigner un statut spécial"}
            </h3>
            <button
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          {/* Player selection */}
          {!selectedPlayerForEdit ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Sélectionner un joueur
              </label>
              <div ref={searchRef} className="relative">
                <input
                  type="text"
                  placeholder="Rechercher par nom ou code..."
                  value={playerSearchInput}
                  onChange={(e) => {
                    setPlayerSearchInput(e.target.value);
                    setShowPlayerDropdown(true);
                  }}
                  onFocus={() => setShowPlayerDropdown(true)}
                  className={inputClassName}
                />
                {showPlayerDropdown && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {dropdownFilteredPlayers.length === 0 ? (
                      <div className="p-3 text-xs text-gray-500">Aucun joueur trouvé.</div>
                    ) : (
                      dropdownFilteredPlayers.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setTargetPlayerId(p.id);
                            setPlayerSearchInput(getPlayerFullName(p));
                            setShowPlayerDropdown(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            p.id === targetPlayerId ? "bg-brand-50 dark:bg-brand-500/10 font-bold" : ""
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {getPlayerFullName(p)}
                            </span>
                            <span className="ml-2 text-gray-500">({p.matricule || "Sans code"})</span>
                          </div>
                          <span className="text-gray-400">{p.categorie}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedTargetPlayer && (
                <p className="mt-1.5 text-xs text-brand-600 dark:text-brand-400 font-medium">
                  Joueur sélectionné : {getPlayerFullName(selectedTargetPlayer)} ({selectedTargetPlayer.categorie})
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {getPlayerFullName(selectedPlayerForEdit)}
              </p>
              <p className="text-xs text-gray-500">
                Code : {selectedPlayerForEdit.matricule || "Sans code"} • Catégorie : {selectedPlayerForEdit.categorie}
              </p>
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Statut spécial à attribuer
            </label>
            <select
              value={selectedStatusValue}
              onChange={(e) => setSelectedStatusValue(e.target.value)}
              className={selectClassName}
            >
              <option value="Bourse">Bourse (100%)</option>
              <option value="Demi-bourse">Demi-bourse (50%)</option>
              <option value="Joueur spécial">Joueur spécial</option>
              <option value="custom">Autre (Personnalisé)</option>
            </select>
          </div>

          {/* Custom status input */}
          {selectedStatusValue === "custom" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Préciser le statut personnalisé
              </label>
              <input
                type="text"
                placeholder="Ex: Sponsorisé, Aide sociale..."
                value={customStatusInput}
                onChange={(e) => setCustomStatusInput(e.target.value)}
                className={inputClassName}
              />
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveStatus}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
