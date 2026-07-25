"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/tables/Pagination";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Parent, Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { getParentLinkedPlayerIds } from "@/lib/club/parents";

interface ParentTableProps {
  parents: Parent[];
  players: Player[];
  title?: string;
  showToolbar?: boolean;
  onEditParent?: (parent: Parent) => void;
  onDeleteParent?: (parent: Parent) => void;
  actionButton?: React.ReactNode;
  exportButton?: React.ReactNode;
}

export default function ParentTable({
  parents,
  players,
  title = "Parents",
  showToolbar = true,
  onEditParent,
  onDeleteParent,
  actionButton,
  exportButton,
}: ParentTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChildrenCount, setSelectedChildrenCount] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const seasons = useMemo(
    () =>
      [...new Set(players.map((player) => player.saison).filter(Boolean))].sort(
        (a, b) => (b || "").localeCompare(a || ""),
      ),
    [players],
  );

  const filteredParents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return parents.filter((parent) => {
      const linkedPlayerIds = getParentLinkedPlayerIds(parent);
      const count = linkedPlayerIds.length;
      
      let countMatch = true;
      if (selectedChildrenCount === "1") countMatch = count === 1;
      else if (selectedChildrenCount === ">1") countMatch = count > 1;

      if (!countMatch) return false;

      let seasonMatch = true;
      if (selectedSeason !== "all") {
        seasonMatch = linkedPlayerIds.some((playerId) => {
          const player = playerMap.get(playerId);
          return player && player.saison === selectedSeason;
        });
      }
      if (!seasonMatch) return false;

      if (!query) return true;

      const linkedPlayerNames = linkedPlayerIds
        .map((playerId) => playerMap.get(playerId))
        .filter(Boolean)
        .map((player) => getPlayerFullName(player as Player).toLowerCase())
        .join(" ");
      const parentFullName = `${parent.prenom} ${parent.nom}`.toLowerCase();

      return (
        parentFullName.includes(query) ||
        linkedPlayerNames.includes(query) ||
        parent.email.toLowerCase().includes(query)
      );
    });
  }, [parents, playerMap, searchQuery, selectedChildrenCount, selectedSeason]);

  const totalPages = Math.max(1, Math.ceil(filteredParents.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedParents = filteredParents.slice(
    (currentPageSafe - 1) * pageSize,
    currentPageSafe * pageSize,
  );

  return (
    <div className="space-y-4">
      {showToolbar || actionButton ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {showToolbar ? (
            <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Rechercher parent ou joueur"
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <select
                value={selectedChildrenCount}
                onChange={(event) => {
                  setSelectedChildrenCount(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">Tous (nombre d'enfants)</option>
                <option value="1">1 enfant</option>
                <option value=">1">Plus d'1 enfant</option>
              </select>
              <select
                value={selectedSeason}
                onChange={(event) => {
                  setSelectedSeason(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">Toutes les saisons</option>
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    Saison {season}
                  </option>
                ))}
              </select>
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
              {filteredParents.length} parent(s)
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
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Parent
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Lien
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Enfants associes
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Telephone
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Email
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {pagedParents.length === 0 ? (
              <TableRow>
                <td
                  colSpan={6}
                  className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                >
                  Aucun parent trouve.
                </td>
              </TableRow>
            ) : (
              pagedParents.map((parent) => {
                const linkedPlayerIds = getParentLinkedPlayerIds(parent);
                const linkedPlayers = linkedPlayerIds
                  .map((playerId) => playerMap.get(playerId))
                  .filter(Boolean) as Player[];
                const linkedPlayerNames = linkedPlayers.length
                  ? linkedPlayers.map((player) => getPlayerFullName(player)).join(", ")
                  : "-";

                return (
                  <TableRow key={parent.id}>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                      {parent.prenom} {parent.nom}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {parent.lien}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col gap-1">
                        <span>{linkedPlayerNames}</span>
                        <span className="text-xs text-gray-400">
                          {linkedPlayerIds.length} enfant(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {parent.telephone}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {parent.email}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
                          onClick={() => onDeleteParent?.(parent)}
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          <TrashBinIcon className="size-5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          onClick={() => onEditParent?.(parent)}
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <PencilIcon className="size-5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex justify-end">
          <Pagination
            currentPage={currentPageSafe}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : null}
      </div>
    </div>
  );
}
