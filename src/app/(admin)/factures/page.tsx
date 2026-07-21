"use client";

import { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/tables/Pagination";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClubData } from "@/context/ClubDataContext";
import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";
import { colorFromPaymentStatus, paymentStatusLabel } from "@/lib/club/status";

export default function InvoicesPage() {
  const { invoices, players } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invoices
      .filter((invoice) => {
        const player = playerMap.get(invoice.playerId);
        if (!player) return false;
        const playerName = getPlayerFullName(player).toLowerCase();
        const noFacture = invoice.noFacture.toLowerCase();
        
        const matchesSearch = !query || playerName.includes(query) || noFacture.includes(query);
        const matchesStatus =
          selectedStatus === "all" || invoice.statut === selectedStatus;
          
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dateFacture || 0).getTime();
        const dateB = new Date(b.dateFacture || 0).getTime();
        return dateB - dateA;
      });
  }, [invoices, playerMap, searchQuery, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedInvoices = filteredInvoices.slice(
    (currentPageSafe - 1) * pageSize,
    currentPageSafe * pageSize,
  );

  const handleExport = () => {
    const headers = [
      "NoFacture",
      "Joueur",
      "DateFacture",
      "MontantAPayer",
      "MontantPaye",
      "Statut",
      "DatePaiement",
      "Remarque"
    ];

    const rows = filteredInvoices.map((invoice) => {
      const player = playerMap.get(invoice.playerId)!;
      const playerName = getPlayerFullName(player);
      return [
        invoice.noFacture,
        playerName,
        invoice.dateFacture,
        String(invoice.montantAPayer),
        String(invoice.montantPaye),
        invoice.statut,
        invoice.datePaiement ?? "",
        invoice.remarque ?? "",
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${cell.replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `factures-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Factures" />

      <div className="mb-6 grid gap-3 lg:grid-cols-4">
        <input
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Rechercher par joueur ou n° de facture"
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />

        <select
          value={selectedStatus}
          onChange={(event) => {
            setSelectedStatus(event.target.value);
            setCurrentPage(1);
          }}
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="all">Tous statuts</option>
          <option value="paid">Payé</option>
          <option value="pending">En attente (Acompte)</option>
          <option value="late">Impayé</option>
        </select>

        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {filteredInvoices.length} facture(s)
        </div>
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  N° Facture
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Date
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Joueur
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  À Payer
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Déjà Payé
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Statut
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Remarque
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pagedInvoices.length === 0 ? (
                <TableRow>
                  <td colSpan={7} className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                    Aucune facture trouvée.
                  </td>
                </TableRow>
              ) : (
                pagedInvoices.map((invoice) => {
                  const player = playerMap.get(invoice.playerId)!;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="py-3 text-theme-sm font-medium text-brand-500">
                        {invoice.noFacture}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        {formatClubDate(invoice.dateFacture)}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                        {getPlayerFullName(player)}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {formatClubCurrency(invoice.montantAPayer)}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        {formatClubCurrency(invoice.montantPaye)}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        <Badge size="sm" color={colorFromPaymentStatus(invoice.statut)}>
                          {paymentStatusLabel[invoice.statut]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        <span className="block truncate max-w-[200px]" title={invoice.remarque}>
                          {invoice.remarque}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
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
  );
}
