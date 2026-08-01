"use client";

import React from "react";
import { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Dropdown } from "@/components/ui/dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
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
import { ImageModal } from "@/components/club/modals/ImageModal";
import { extractPhotoUrlFromRemark } from "@/lib/club/payment-photo-utils";

export default function InvoicesPage() {
  const { invoices, players, payments } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(12);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [selectedPaymentImage, setSelectedPaymentImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invoices
      .filter((invoice) => {
        const player = playerMap.get(invoice.playerId);
        if (!player) return false;
        if (selectedSeason !== "all" && player.saison !== selectedSeason) return false;
        
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
  }, [invoices, playerMap, searchQuery, selectedStatus, selectedSeason]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedInvoices = filteredInvoices.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  const handleExportCSV = () => {
    setIsExportOpen(false);
    const headers = ["NoFacture", "Joueur", "DateFacture", "MontantAPayer", "MontantPaye", "Statut", "DatePaiement", "Remarque"];
    let csvContent = headers.join(",") + "\n";
    filteredInvoices.forEach(invoice => {
      const player = playerMap.get(invoice.playerId)!;
      const playerName = getPlayerFullName(player);
      const row = [invoice.noFacture, playerName, invoice.dateFacture, String(invoice.montantAPayer), String(invoice.montantPaye), invoice.statut, invoice.datePaiement || "", invoice.remarque || ""];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "factures.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!window.confirm("Voulez-vous vraiment exporter la liste des factures au format Excel ?")) return;
    setIsExportOpen(false);
    const headers = ["NoFacture", "Joueur", "DateFacture", "MontantAPayer", "MontantPaye", "Statut", "DatePaiement", "Remarque"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n";
    filteredInvoices.forEach(invoice => {
      const player = playerMap.get(invoice.playerId)!;
      const playerName = getPlayerFullName(player);
      const row = [invoice.noFacture, playerName, invoice.dateFacture, String(invoice.montantAPayer), String(invoice.montantPaye), invoice.statut, invoice.datePaiement || "", invoice.remarque || ""];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(";") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "factures_excel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <PageBreadcrumb pageTitle="Factures" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher par joueur ou n° de facture"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />

          <select
            value={selectedStatus}
            onChange={(event) => {
              setSelectedStatus(event.target.value);
              setCurrentPage(1);
            }}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">Tous statuts</option>
            <option value="paid">Payé</option>
            <option value="pending">En attente (Acompte)</option>
            <option value="late">Impayé</option>
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Factures
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredInvoices.length} facture(s)
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors"
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
              className="absolute right-0 top-full mt-1 w-40"
            >
              <DropdownItem
                onItemClick={handleExportExcel}
                className="cursor-pointer"
              >
                Excel
              </DropdownItem>
              <DropdownItem
                onItemClick={handleExportCSV}
                className="cursor-pointer"
              >
                CSV
              </DropdownItem>
            </Dropdown>
          </div>
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
                  const invoicePayments = payments.filter(p => p.playerId === invoice.playerId);
                  const isExpanded = expandedInvoice === invoice.id;
                  
                  return (
                    <React.Fragment key={invoice.id}>
                      <TableRow className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
                          {formatClubCurrency(invoice.montantAPayer, invoice.devise)}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          {formatClubCurrency(invoice.montantPaye, invoice.devise)}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          <Badge size="sm" color={colorFromPaymentStatus(invoice.statut)}>
                            {paymentStatusLabel[invoice.statut]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          <button
                            onClick={() => setExpandedInvoice(isExpanded ? null : invoice.id)}
                            className="flex items-center gap-1 text-brand-500 hover:text-brand-600"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                            {invoicePayments.length} paiement(s)
                          </button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && invoicePayments.length > 0 && (
                        <TableRow key={`${invoice.id}-payments`}>
                          <td colSpan={7} className="p-0">
                            <div className="bg-gray-50 dark:bg-gray-800/30 px-6 py-4">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Historique des paiements
                              </h4>
                              <div className="space-y-2">
                                {invoicePayments.map((payment) => {
                                  const photoUrl = extractPhotoUrlFromRemark(payment.remarque);
                                  return (
                                    <div
                                      key={payment.id}
                                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                                            {formatClubCurrency(payment.montant, payment.devise)}
                                          </span>
                                          <Badge size="sm" color={colorFromPaymentStatus(payment.statut)}>
                                            {paymentStatusLabel[payment.statut]}
                                          </Badge>
                                          {photoUrl && (
                                            <button
                                              onClick={() => {
                                                setSelectedPaymentImage(photoUrl);
                                                setIsImageModalOpen(true);
                                              }}
                                              className="flex items-center gap-1 text-brand-500 hover:text-brand-600"
                                              title="Voir le justificatif"
                                            >
                                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                <polyline points="21 15 16 10 5 21"></polyline>
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                          <span>{formatClubDate(payment.datePaiement || new Date().toISOString())}</span>
                                          <span>•</span>
                                          <span>{payment.methode}</span>
                                          {payment.remarque && (
                                            <>
                                              <span>•</span>
                                              <span className="truncate max-w-[300px]">{payment.remarque}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
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

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setSelectedPaymentImage(null);
        }}
        imageUrl={selectedPaymentImage}
        title="Justificatif de paiement"
      />
    </div>
  );
}
