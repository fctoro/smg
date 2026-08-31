"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Pagination from "@/components/tables/Pagination";
import { EyeIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { Player } from "@/types/club";
import { PlayerColumnKey, DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import {
  formatClubCurrency,
  formatClubDate,
  getPlayerFullName,
} from "@/lib/club/metrics";
import {
  colorFromPlayerStatus,
  paymentStatusLabel,
  playerStatusLabel,
} from "@/lib/club/status";

const defaultColumns: PlayerColumnKey[] = [
  "avatarNom",
  "poste",
  "sexe",
  "statut",
  "categorie",
  "saison",
  "actions",
];

import { useClubData } from "@/context/ClubDataContext";
import { getDynamicSeasonOptions, generatePlayerMatricule } from "@/lib/club/season";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { fetchProgrammes } from "@/lib/club/programmes";

interface PlayerTableProps {
  players: Player[];
  columns?: PlayerColumnKey[];
  title?: string;
  showToolbar?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  onViewPlayer?: (player: Player) => void;
  onEditPlayer?: (player: Player) => void;
  onEvaluatePlayer?: (player: Player) => void;
  onDeletePlayer?: (player: Player) => void;
  onAddPaymentForPlayer?: (player: Player) => void;
  actionButton?: React.ReactNode;
  exportButton?: React.ReactNode;
  availableCategories?: string[];
}

export default function PlayerTable({
  players,
  columns = defaultColumns,
  title = "Joueurs",
  showToolbar = true,
  pageSize = 100,
  emptyMessage = "Aucun joueur trouvé.",
  onViewPlayer,
  onEditPlayer,
  onEvaluatePlayer,
  onDeletePlayer,
  onAddPaymentForPlayer,
  actionButton,
  exportButton,
  availableCategories,
}: PlayerTableProps) {
  const { hydrated, payments } = useClubData();

  const playerFinMap = useMemo(() => {
    const map = new Map<string, { totalPaid: number; balance: number; devise: "US" | "HTG"; isPaidInFull: boolean; hasPayments: boolean }>();
    const grouped = new Map<string, any[]>();

    (payments || []).forEach((p) => {
      const pid = String(p.playerId);
      if (!grouped.has(pid)) grouped.set(pid, []);
      grouped.get(pid)!.push(p);
    });

    grouped.forEach((pList, pid) => {
      const uniquePayments: any[] = [];
      const seenKeys = new Set<string>();
      pList.forEach((p) => {
        const key = `${p.montant}_${p.datePaiement}_${(p.remarque || "").trim()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniquePayments.push(p);
        }
      });

      const hasHTG = uniquePayments.some(p => p.devise === "HTG" || (p.montantHTG && p.montantHTG > 0));
      const mainDevise: "US" | "HTG" = hasHTG ? "HTG" : "US";

      let totalPaid = 0;
      if (mainDevise === "HTG") {
        totalPaid = uniquePayments.reduce((acc, p) => {
          if (p.devise === "HTG" || (p.montantHTG && p.montantHTG > 0)) {
            return acc + (p.montantHTG || p.montant || 0);
          }
          const taux = p.taux || 130;
          return acc + ((p.montantUS || p.montant || 0) * taux);
        }, 0);
      } else {
        totalPaid = uniquePayments.reduce((acc, p) => {
          if (p.devise === "US" || (p.montantUS && p.montantUS > 0)) {
            return acc + (p.montantUS || p.montant || 0);
          }
          const taux = p.taux || 130;
          return acc + (taux > 0 ? (p.montantHTG || p.montant || 0) / taux : 0);
        }, 0);
      }

      let dossierTotalDueUSD = 0;
      pList.forEach((p) => {
        const remark = p.remarque || "";
        const match = remark.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
        if (match && match[1]) {
          const due = parseFloat(match[1]);
          if (!isNaN(due) && due > dossierTotalDueUSD) {
            dossierTotalDueUSD = due;
          }
        }
      });

      let taux = 130;
      const htgPayment = uniquePayments.find(p => p.devise === "HTG" || (p.montantHTG && p.montantHTG > 0));
      if (htgPayment) {
        taux = htgPayment.taux || 0;
        if (taux <= 1) {
          const tauxMatch = (htgPayment.remarque || "").match(/\[TAUX:\s*([\d.]+)\s*\]/i);
          taux = tauxMatch ? parseFloat(tauxMatch[1]) : 130;
        }
      }

      let balance = 0;
      if (dossierTotalDueUSD > 0) {
        if (mainDevise === "HTG") {
          const dossierTotalDueHTG = dossierTotalDueUSD * taux;
          balance = Math.max(0, dossierTotalDueHTG - totalPaid);
        } else {
          balance = Math.max(0, dossierTotalDueUSD - totalPaid);
        }
      }

      const isPaidInFull = dossierTotalDueUSD > 0 ? balance <= 0.01 : false;

      map.set(pid, {
        totalPaid: Math.round(totalPaid * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        devise: mainDevise,
        isPaidInFull,
        hasPayments: pList.length > 0,
      });
    });

    return map;
  }, [payments]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedProgramme, setSelectedProgramme] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [dbProgrammes, setDbProgrammes] = useState<string[]>([]);

  useEffect(() => {
    fetchProgrammes().then((data) => {
      if (data && data.length > 0) {
        setDbProgrammes(data.map((p) => p.nom));
      }
    });
  }, []);

  const visibleColumnSet = useMemo(
    () => new Set(columns.length > 0 ? columns : defaultColumns),
    [columns],
  );

  const categories = useMemo(() => {
    if (availableCategories) {
      return availableCategories;
    }
    const customCats = players.map((player) => player.categorie).filter(Boolean);
    const combined = [...DEFAULT_CATEGORIES, ...customCats];
    const uniqueMap = new Map<string, string>();
    combined.forEach((cat) => {
      const key = cat.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, cat.trim());
      }
    });
    return Array.from(uniqueMap.values());
  }, [players, availableCategories]);

  const seasons = useMemo(() => {
    const customSeasons = players.map((player) => player.saison).filter(Boolean) as string[];
    const allOptions = Array.from(new Set([...getDynamicSeasonOptions(), ...customSeasons]));
    return allOptions.sort((a, b) => b.localeCompare(a));
  }, [players]);

  const programmes = useMemo(() => {
    const customProgrammes = players.map((player) => player.programme).filter(Boolean) as string[];
    const allOptions = Array.from(new Set([...customProgrammes, ...dbProgrammes]));
    return allOptions.sort();
  }, [players, dbProgrammes]);

  const filteredPlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return players
      .filter((player) => {
        const fullName = getPlayerFullName(player).toLowerCase();
        const reversedName = `${player.nom || ""} ${player.prenom || ""}`.toLowerCase();
        const searchStr = `${fullName} ${reversedName} ${player.matricule || ""} ${player.parentNomPrenom || ""} ${player.email || ""} ${player.parentEmail || ""} ${player.telephone || ""} ${player.parentTelephone || ""} ${player.adresse || ""} ${player.parentAdresse || ""} ${player.statutJoueur || ""} ${player.poste || ""}`.toLowerCase();

        const nameMatches = !query || searchStr.includes(query);
        const categoryMatches =
          selectedCategory === "all" ||
          (player.categorie || "").trim().toLowerCase() === selectedCategory.trim().toLowerCase();
        const seasonMatches =
          selectedSeason === "all" || player.saison === selectedSeason;
        const programmeMatches =
          selectedProgramme === "all" || player.programme === selectedProgramme;
        const statusMatches =
          selectedStatus === "all" || player.statut === selectedStatus;
        return nameMatches && categoryMatches && seasonMatches && programmeMatches && statusMatches;
      })
      .sort((a, b) => {
        // 1. Statut Actif en premier (priorité aux joueurs actifs)
        const isAActif = (a.statut || "").toLowerCase() === "actif";
        const isBActif = (b.statut || "").toLowerCase() === "actif";
        if (isAActif && !isBActif) return -1;
        if (!isAActif && isBActif) return 1;

        // 2. Ordre alphabétique A-Z (Nom de famille, puis Prénom)
        const nomA = (a.nom || "").trim();
        const nomB = (b.nom || "").trim();
        const nomCompare = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
        if (nomCompare !== 0) return nomCompare;

        const prenomA = (a.prenom || "").trim();
        const prenomB = (b.prenom || "").trim();
        return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
      });
  }, [players, searchQuery, selectedCategory, selectedSeason, selectedProgramme, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / currentPageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSeason, selectedProgramme, selectedStatus, currentPageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedPlayers = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return filteredPlayers.slice(start, start + currentPageSize);
  }, [currentPage, filteredPlayers, currentPageSize]);

  const visibleColumnsCount = Math.max(1, visibleColumnSet.size);

  const getSafeAvatarSrc = (photoUrl?: string) => {
    const trimmed = (photoUrl || "").trim();
    if (trimmed.length > 0 && !trimmed.includes("user-01")) {
      return trimmed;
    }
    return "/images/user/silhouette.svg";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* En-tête avec Titre à gauche, Boutons d'action à droite */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filteredPlayers.length} joueur(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actionButton ? (
            <div className="shrink-0">{actionButton}</div>
          ) : null}
          {exportButton ? (
            <div className="shrink-0">{exportButton}</div>
          ) : null}
        </div>
      </div>

      {/* Barre d'outils de filtres responsive */}
      {showToolbar ? (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 min-w-0">
          <div className="min-w-0">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un joueur"
              className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div className="min-w-0">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <select
              value={selectedSeason}
              onChange={(event) => setSelectedSeason(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes les saisons</option>
              {seasons.map((season) => (
                <option key={season} value={season}>
                  {String(season).toLowerCase().startsWith('saison') ? season : `Saison ${season}`}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <select
              value={selectedProgramme}
              onChange={(event) => setSelectedProgramme(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Tous les programmes</option>
              {programmes.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {visibleColumnSet.has("avatarNom") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Photo + Nom
                </TableCell>
              ) : null}
              {visibleColumnSet.has("poste") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Poste
                </TableCell>
              ) : null}
              {visibleColumnSet.has("sexe") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Sexe
                </TableCell>
              ) : null}
              {visibleColumnSet.has("statut") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Statut
                </TableCell>
              ) : null}
              {visibleColumnSet.has("categorie") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Catégorie
                </TableCell>
              ) : null}
              {visibleColumnSet.has("cotisation") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Cotisation
                </TableCell>
              ) : null}
              {visibleColumnSet.has("montant") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Montant
                </TableCell>
              ) : null}
              {visibleColumnSet.has("dernierPaiement") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Dernier paiement
                </TableCell>
              ) : null}
              {visibleColumnSet.has("saison") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Saison
                </TableCell>
              ) : null}
              {visibleColumnSet.has("programme") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Programme
                </TableCell>
              ) : null}
              {visibleColumnSet.has("actions") ? (
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Actions
                </TableCell>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {!hydrated && players.length === 0 ? (
              <TableBodySkeleton rows={10} columns={visibleColumnsCount} />
            ) : pagedPlayers.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  colSpan={visibleColumnsCount}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pagedPlayers.map((player) => {
                const fullName = getPlayerFullName(player);
                const safeAvatarSrc = getSafeAvatarSrc(player.photoIdentiteUrl || player.photoUrl);
                const safeMatricule = player.matricule && !player.matricule.includes("XXXX")
                  ? player.matricule
                  : generatePlayerMatricule(player.id, player.saison, player.sourceDetection);

                const pidStr = String(player.id);
                const finData = playerFinMap.get(pidStr);
                const isBoursier = ((player as any).statutJoueur || "").toLowerCase().includes("bourse");

                const displayMontant = finData ? finData.totalPaid : player.cotisationMontant;
                const displayDevise = finData ? finData.devise : (player.cotisationDevise || "US");
                const isPaidInFull = finData ? finData.isPaidInFull : player.cotisationStatut === "paid";
                const hasBalance = finData ? finData.balance > 0 : false;

                const statusLabel = isBoursier
                  ? "Boursier"
                  : isPaidInFull
                  ? "Payé"
                  : hasBalance
                  ? "Solde dû"
                  : paymentStatusLabel[player.cotisationStatut];

                const badgeBgClass = isBoursier
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400"
                  : isPaidInFull
                  ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500"
                  : hasBalance
                  ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-orange-400"
                  : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500";

                return (
                <TableRow key={player.id}>
                  {visibleColumnSet.has("avatarNom") ? (
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Image
                          width={40}
                          height={40}
                          src={safeAvatarSrc}
                          alt={fullName}
                          className="h-10 w-10 rounded-full object-cover shadow-xs border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-0.5"
                          unoptimized
                        />
                        <div>
                          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                            {fullName}
                          </p>
                          <p className="text-theme-xs font-semibold text-brand-600 dark:text-brand-400 mt-1 flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                            {safeMatricule}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("poste") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {player.poste}
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("sexe") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {player.sexe}
                    </TableCell>
                  ) : null}
                    {visibleColumnSet.has("statut") ? (
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        <Badge size="sm" color={colorFromPlayerStatus(player.statut)}>
                          {playerStatusLabel[player.statut]}
                        </Badge>
                      </TableCell>
                    ) : null}
                  {visibleColumnSet.has("categorie") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {player.categorie}
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("cotisation") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <span
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${badgeBgClass}`}
                      >
                        {statusLabel}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("montant") ? (
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatClubCurrency(displayMontant, displayDevise)}
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("dernierPaiement") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {formatClubDate(player.dernierPaiement)}
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("saison") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {player.saison || "-"}
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("programme") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {player.programme || "-"}
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("actions") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 cursor-pointer"
                          onClick={() => onViewPlayer?.(player)}
                          aria-label="Voir"
                          title="Voir"
                        >
                          <EyeIcon className="size-5" />
                        </button>
                        {onAddPaymentForPlayer && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
                            onClick={() => onAddPaymentForPlayer(player)}
                            aria-label="Effectuer un paiement"
                            title="Effectuer un paiement pour ce joueur"
                          >
                            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                              <line x1="2" y1="10" x2="22" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 15h3" />
                            </svg>
                          </button>
                        )}
                        {onEvaluatePlayer && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-brand-500 transition hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 cursor-pointer"
                            onClick={() => onEvaluatePlayer(player)}
                            aria-label="Évaluer"
                            title="Évaluer le joueur"
                          >
                            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </button>
                        )}
                        {onEditPlayer && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                            onClick={() => onEditPlayer(player)}
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <PencilIcon className="size-5" />
                          </button>
                        )}
                        {onDeletePlayer && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                            onClick={() => onDeletePlayer(player)}
                            aria-label="Supprimer"
                            title="Supprimer"
                          >
                            <TrashBinIcon className="size-5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex justify-end">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={currentPageSize}
          onPageSizeChange={setCurrentPageSize}
        />
      </div>
    </div>
  );
}
