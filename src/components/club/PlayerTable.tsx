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
  "cotisation",
  "montant",
  "dernierPaiement",
  "saison",
  "actions",
];

import { useClubData } from "@/context/ClubDataContext";
import { getDynamicSeasonOptions } from "@/lib/club/season";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";

interface PlayerTableProps {
  players: Player[];
  columns?: PlayerColumnKey[];
  title?: string;
  showToolbar?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  onViewPlayer?: (player: Player) => void;
  onEditPlayer?: (player: Player) => void;
  onDeletePlayer?: (player: Player) => void;
  actionButton?: React.ReactNode;
  exportButton?: React.ReactNode;
}

export default function PlayerTable({
  players,
  columns = defaultColumns,
  title = "Joueurs",
  showToolbar = true,
  pageSize = 8,
  emptyMessage = "Aucun joueur trouvé.",
  onViewPlayer,
  onEditPlayer,
  onDeletePlayer,
  actionButton,
  exportButton,
}: PlayerTableProps) {
  const { hydrated } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  const visibleColumnSet = useMemo(
    () => new Set(columns.length > 0 ? columns : defaultColumns),
    [columns],
  );

  const categories = useMemo(() => {
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
  }, [players]);

  const seasons = useMemo(() => {
    const customSeasons = players.map((player) => player.saison).filter(Boolean) as string[];
    const allOptions = Array.from(new Set([...getDynamicSeasonOptions(), ...customSeasons]));
    return allOptions.sort((a, b) => b.localeCompare(a));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return players
      .filter((player) => {
        const fullName = getPlayerFullName(player).toLowerCase();
        const nameMatches = !query || fullName.includes(query);
        const categoryMatches =
          selectedCategory === "all" ||
          (player.categorie || "").trim().toLowerCase() === selectedCategory.trim().toLowerCase();
        const seasonMatches =
          selectedSeason === "all" || player.saison === selectedSeason;
        const statusMatches =
          selectedStatus === "all" || player.statut === selectedStatus;
        return nameMatches && categoryMatches && seasonMatches && statusMatches;
      })
      .sort(
        (a, b) =>
          new Date(b.dateInscription).getTime() -
          new Date(a.dateInscription).getTime(),
      );
  }, [players, searchQuery, selectedCategory, selectedSeason, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / currentPageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSeason, selectedStatus, currentPageSize]);

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
    <div className="space-y-4">
      {/* Toolbar en dehors de la carte du tableau, sur la même ligne que Ajouter */}
      {showToolbar || actionButton ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {showToolbar ? (
            <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
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
                      Saison {season}
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
                  <option value="blesse">Blessé</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="abandonne">Abandonné</option>
                </select>
              </div>
            </div>
          ) : null}

          {actionButton ? (
            <div className="shrink-0">{actionButton}</div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredPlayers.length} joueur(s)
            </p>
          </div>
          {exportButton ? (
            <div className="shrink-0">{exportButton}</div>
          ) : null}
        </div>

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
            {!hydrated ? (
              <TableBodySkeleton rows={6} columns={visibleColumnsCount} />
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
                  : `FCT-2526-${String(player.id).padStart(4, "0")}`;

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
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
                          player.cotisationStatut === "paid"
                            ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500"
                            : player.cotisationStatut === "pending"
                            ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-orange-400"
                            : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500"
                        }`}
                      >
                        {paymentStatusLabel[player.cotisationStatut]}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleColumnSet.has("montant") ? (
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatClubCurrency(player.cotisationMontant, player.cotisationDevise)}
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
                  {visibleColumnSet.has("actions") ? (
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                          onClick={() => onViewPlayer?.(player)}
                          aria-label="Voir"
                          title="Voir"
                        >
                          <EyeIcon className="size-5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
                          onClick={() => onDeletePlayer?.(player)}
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          <TrashBinIcon className="size-5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          onClick={() => onEditPlayer?.(player)}
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <PencilIcon className="size-5" />
                        </button>
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
    </div>
  );
}
