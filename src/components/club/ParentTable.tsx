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
import { useClubData } from "@/context/ClubDataContext";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";

import { Dropdown } from "@/components/ui/dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useConfirm } from "@/hooks/useConfirm";

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
  const { hydrated } = useClubData();
  const { confirm, ConfirmComponent } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChildrenCount, setSelectedChildrenCount] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(100);
  const [isExportOpen, setIsExportOpen] = useState(false);

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

  const handleExport = (type: "excel" | "csv") => {
    setIsExportOpen(false);
    const isExcel = type === "excel";
    const formatName = isExcel ? "Excel (.xls)" : "CSV (.csv)";

    confirm({
      title: "Exporter la liste des parents",
      message: `Voulez-vous exporter la liste des ${filteredParents.length} parent(s) au format ${formatName} ?`,
      onConfirm: () => {
        const headers = [
          "Nom Parent",
          "Prénom Parent",
          "Lien de Parenté",
          "Téléphone Parent",
          "Email Parent",
          "Enfant(s) / Joueur(s)",
          "Matricule Enfant(s)",
          "Saison Enfant(s)",
          "Catégorie Enfant(s)",
        ];

        const rows: string[][] = [];

        filteredParents.forEach((p) => {
          const linkedPlayerIds = getParentLinkedPlayerIds(p);
          const linkedPlayers = linkedPlayerIds
            .map((id) => playerMap.get(id))
            .filter(Boolean) as Player[];

          const childNames = linkedPlayers.map((lp) => getPlayerFullName(lp)).join(" | ");
          const childMatricules = linkedPlayers.map((lp) => lp.matricule || "-").join(" | ");
          const childSeasons = linkedPlayers.map((lp) => lp.saison || "-").join(" | ");
          const childCategories = linkedPlayers.map((lp) => lp.categorie || "-").join(" | ");

          rows.push([
            p.nom || "",
            p.prenom || "",
            p.lien || "",
            p.telephone || "",
            p.email || "",
            childNames || "-",
            childMatricules || "-",
            childSeasons || "-",
            childCategories || "-",
          ]);
        });

        const seasonSuffix = selectedSeason !== "all" ? `_${selectedSeason}` : "";

        if (isExcel) {
          let excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
          excelHtml += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Parents</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>`;
          excelHtml += `<body><table border="1" style="border-collapse:collapse;"><thead><tr style="background-color: #107C41; color: #ffffff; font-weight: bold;">`;
          headers.forEach((h) => {
            excelHtml += `<th style="padding: 8px 12px; text-align: left; border: 1px solid #cccccc;">${h}</th>`;
          });
          excelHtml += `</tr></thead><tbody>`;
          rows.forEach((r) => {
            excelHtml += `<tr>`;
            r.forEach((cell) => {
              const safeCell = (cell || "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
              excelHtml += `<td style="padding: 6px 10px; border: 1px solid #cccccc;">${safeCell}</td>`;
            });
            excelHtml += `</tr>`;
          });
          excelHtml += `</tbody></table></body></html>`;

          const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `parents_excel${seasonSuffix}.xls`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          let csvContent = "sep=,\n\uFEFF" + headers.map((h) => `"${h}"`).join(",") + "\n";
          rows.forEach((r) => {
            const formattedRow = r.map((field) => `"${(field || "").toString().replace(/"/g, '""')}"`);
            csvContent += formattedRow.join(",") + "\n";
          });

          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `parents${seasonSuffix}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredParents.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedParents = filteredParents.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  return (
    <div className="space-y-4">
      {showToolbar || actionButton ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {showToolbar ? (
            <div className="grid flex-1 gap-2 grid-cols-1 sm:grid-cols-3 min-w-0">
              <div className="min-w-0">
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Rechercher parent ou joueur"
                  className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="min-w-0">
                <select
                  value={selectedChildrenCount}
                  onChange={(event) => {
                    setSelectedChildrenCount(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="all">Tous (nombre d'enfants)</option>
                  <option value="1">1 enfant</option>
                  <option value=">1">Plus d'1 enfant</option>
                </select>
              </div>
              <div className="min-w-0">
                <select
                  value={selectedSeason}
                  onChange={(event) => {
                    setSelectedSeason(event.target.value);
                    setCurrentPage(1);
                  }}
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
          ) : (
            <div className="relative shrink-0">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <path d="M14 2v6h6"></path>
                  <path d="M8 13h2"></path>
                  <path d="M14 13h2"></path>
                  <path d="M8 17h2"></path>
                  <path d="M14 17h2"></path>
                </svg>
                Exporter Excel / CSV
              </button>
              <Dropdown
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                className="absolute right-0 top-full mt-1 w-40 z-30"
              >
                <DropdownItem
                  onItemClick={() => handleExport("excel")}
                  className="cursor-pointer"
                >
                  Excel (.csv)
                </DropdownItem>
                <DropdownItem
                  onItemClick={() => handleExport("csv")}
                  className="cursor-pointer"
                >
                  CSV
                </DropdownItem>
              </Dropdown>
            </div>
          )}
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
            {!hydrated && parents.length === 0 ? (
              <TableBodySkeleton rows={10} columns={6} />
            ) : pagedParents.length === 0 ? (
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
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                          onClick={() => onEditParent?.(parent)}
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <PencilIcon className="size-5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                          onClick={() => onDeleteParent?.(parent)}
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          <TrashBinIcon className="size-5" />
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

      <div className="mt-4 flex justify-end">
        <Pagination
          currentPage={currentPageSafe}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={currentPageSize}
          onPageSizeChange={(size) => {
            setCurrentPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
      <ConfirmComponent />
    </div>
  </div>
);
}
