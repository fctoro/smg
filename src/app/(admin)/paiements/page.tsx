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
import Link from "next/link";
import { useClubData } from "@/context/ClubDataContext";
import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";

export default function PaymentsPage() {
  const { payments, players } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return payments
      .filter((payment) => {
        const player = playerMap.get(payment.playerId);
        if (!player) return false;
        const playerName = getPlayerFullName(player).toLowerCase();
        return !query || playerName.includes(query);
      })
      .sort((a, b) => {
        const dateA = new Date(a.datePaiement || 0).getTime();
        const dateB = new Date(b.datePaiement || 0).getTime();
        return dateB - dateA;
      });
  }, [payments, playerMap, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPayments = filteredPayments.slice(
    (currentPageSafe - 1) * pageSize,
    currentPageSafe * pageSize,
  );

  const handleExport = () => {
    const headers = [
      "joueur",
      "montant",
      "date_paiement",
      "informations"
    ];

    const rows = filteredPayments.map((payment) => {
      const player = playerMap.get(payment.playerId)!;
      const playerName = getPlayerFullName(player);
      return [
        playerName,
        String(payment.montant),
        payment.datePaiement ?? "",
        payment.remarque ?? "",
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
    link.download = `paiements-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Paiements" />

      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        <input
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Rechercher un joueur"
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />

        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Export CSV
        </button>

        <Link
          href="/paiements/nouveau"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-600"
        >
          + Ajouter
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {filteredPayments.length} paiement(s)
        </div>
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Joueur
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Date paiement
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Montant
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Informations
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pagedPayments.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    Aucun paiement trouve.
                  </td>
                </TableRow>
              ) : (
                pagedPayments.map((payment) => {
                  const player = playerMap.get(payment.playerId)!;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                        {getPlayerFullName(player)}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-300 font-medium">
                        {payment.datePaiement ? formatClubDate(payment.datePaiement) : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        {formatClubCurrency(payment.montant, payment.devise)}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        <span className="block truncate max-w-[200px]" title={payment.remarque}>
                          {payment.remarque || "-"}
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
        <div className="mt-4 flex justify-end print:hidden">
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
