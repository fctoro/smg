"use client";

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
import Link from "next/link";
import { useClubData } from "@/context/ClubDataContext";
import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";
import { updatePaymentInSupabase } from "@/lib/club/supabase-crud";
import { calculateDiscountedAmount, parseReductionFromRemark } from "@/lib/club/payment-reduction-utils";
import { ImageModal } from "@/components/club/modals/ImageModal";
import { extractPhotoUrlFromRemark } from "@/lib/club/payment-photo-utils";

interface PaymentPlan {
  id: string;
  plan: string;
  montantFCToro: number;
  montantTIToro: number;
  nombreVersements: number;
}

const paymentPlans: PaymentPlan[] = [
  {
    id: "annuel",
    plan: "Annuel",
    montantFCToro: 1215,
    montantTIToro: 900,
    nombreVersements: 1,
  },
  {
    id: "semestriel",
    plan: "Semestriel",
    montantFCToro: 641.25,
    montantTIToro: 475,
    nombreVersements: 2,
  },
  {
    id: "mensuel",
    plan: "Mensuel",
    montantFCToro: 155,
    montantTIToro: 115,
    nombreVersements: 9,
  },
];

import { PaymentAddModal } from "@/components/club/modals/PaymentAddModal";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";

export default function PaymentsPage() {
  const { payments, players, setPayments, hydrated } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [deviseFilter, setDeviseFilter] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(12);
  const [editingPayment, setEditingPayment] = useState<(typeof payments)[number] | null>(null);
  const [newAmount, setNewAmount] = useState(0);
  const [newPaymentDate, setNewPaymentDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");
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

  const calculateBalance = (currentPayment: (typeof payments)[number]): number => {
    const player = playerMap.get(currentPayment.playerId);
    if (!player) return 0;

    const normalizeText = (value?: string) => (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const categorieLower = normalizeText(player.categorie);
    const defaultAdhesion = categorieLower.includes("ti toro") ||
      categorieLower.includes("titoro") ||
      categorieLower.includes("u6-u8")
      ? "ti toro"
      : "fc toro";

    const getPlanId = (remark?: string) => {
      const normalized = normalizeText(remark);
      const marker = normalized.match(/\[plan\s*:\s*(annuel|semestriel|mensuel)\]/);
      const legacy = normalized.match(/plan\s*:\s*(annuel|semestriel|mensuel)/);
      return (marker?.[1] || legacy?.[1]);
    };
    const getAdhesionId = (remark?: string) => {
      const normalized = normalizeText(remark);
      const marker = normalized.match(/\[adhesion\s*:\s*(fc_toro|ti_toro)\]/);
      const legacy = normalized.match(/adhesion\s*:\s*(fc toro|ti toro)/);
      return marker?.[1]?.replace("_", " ") || legacy?.[1] || defaultAdhesion;
    };
    const selectedPlanId = getPlanId(currentPayment.remarque);
    const selectedAdhesionId = getAdhesionId(currentPayment.remarque);
    const selectedPlan = paymentPlans.find(
      (plan) => normalizeText(plan.plan) === selectedPlanId,
    );
    const reductionState = parseReductionFromRemark(currentPayment.remarque);

    if (!selectedPlan || currentPayment.statut !== "paid") return 0;

    // Calculate total amount due based on category
    const installmentAmount = selectedAdhesionId === "ti toro"
      ? selectedPlan.montantTIToro
      : selectedPlan.montantFCToro;
    const totalDue = installmentAmount * selectedPlan.nombreVersements;
    const discountedDue = calculateDiscountedAmount(totalDue, reductionState.reductionType, reductionState.customPercent);

    // Calculate total paid for the PLAN only (not all payments)
    const totalPaidUSD = payments
      .filter((payment) =>
        payment.playerId === currentPayment.playerId &&
        payment.statut === "paid" &&
        getPlanId(payment.remarque) === selectedPlanId &&
        getAdhesionId(payment.remarque) === selectedAdhesionId,
      )
      .reduce((sum, p) => {
        if (p.devise === "HTG") {
          const taux = p.taux || 1000;
          return sum + (p.montant / taux);
        } else {
          return sum + p.montant;
        }
      }, 0);

    // Return balance in USD (positive = owes, negative = overpaid)
    return Math.max(0, discountedDue - totalPaidUSD);
  };

  const hasPaymentPlan = (remark?: string) =>
    /(?:\[plan\s*:\s*|plan\s*:\s*)(annuel|semestriel|mensuel)/i.test(remark || "");

  const openEditModal = (payment: (typeof payments)[number]) => {
    setEditingPayment(payment);
    setNewAmount(0);
    setNewPaymentDate(payment.datePaiement || new Date().toISOString().slice(0, 10));
    setEditError("");
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setEditingPayment(null);
    setEditError("");
  };

  const handleEditPayment = async () => {
    if (!editingPayment || newAmount <= 0 || !newPaymentDate) {
      setEditError("Veuillez entrer un montant supérieur à zéro et une date.");
      return;
    }

    setIsSaving(true);
    setEditError("");
    try {
      const totalAmountPaid = editingPayment.montant + newAmount;
      const montantUS = editingPayment.devise === "US"
        ? totalAmountPaid
        : (editingPayment.taux ? totalAmountPaid / editingPayment.taux : 0);
      const montantHTG = editingPayment.devise === "HTG" ? totalAmountPaid : 0;
      await updatePaymentInSupabase(editingPayment.id, {
        montant: totalAmountPaid,
        montantUS,
        montantHTG,
        devise: editingPayment.devise,
        datePaiement: newPaymentDate,
      });
      setPayments((currentPayments) =>
        currentPayments.map((payment) =>
          payment.id === editingPayment.id
            ? { ...payment, montant: totalAmountPaid, montantUS, montantHTG, datePaiement: newPaymentDate }
            : payment,
        ),
      );
      setEditingPayment(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Impossible d'enregistrer la modification.");
    } finally {
      setIsSaving(false);
    }
  };

  const getPaymentPlanLabel = (remark?: string) =>
    remark?.match(/\[PLAN:\s*(ANNUEL|SEMESTRIEL|MENSUEL)\]/i)?.[1] ||
    remark?.match(/plan\s*:\s*(annuel|semestriel|mensuel)/i)?.[1] ||
    "Plan manquant";

  const getPaymentStatusLabel = (payment: (typeof payments)[number]) => {
    const marker = payment.remarque?.match(/\[STATUT:\s*(PAID|PENDING|LATE)\]/i)?.[1];
    return marker?.toLowerCase() || payment.statut;
  };

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return payments
      .filter((payment) => {
        if (deviseFilter !== "all" && payment.devise !== deviseFilter) return false;
        const player = playerMap.get(payment.playerId);
        if (!player) return false;
        if (selectedSeason !== "all" && player.saison !== selectedSeason) return false;
        const playerName = getPlayerFullName(player).toLowerCase();
        return !query || playerName.includes(query);
      })
      .sort((a, b) => {
        const dateA = new Date(a.datePaiement || 0).getTime();
        const dateB = new Date(b.datePaiement || 0).getTime();
        return dateB - dateA;
      });
  }, [payments, playerMap, searchQuery, deviseFilter, selectedSeason]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPayments = filteredPayments.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  const handleExportCSV = () => {
    setIsExportOpen(false);
    const headers = ["Joueur", "Montant", "Date Paiement", "Informations"];
    let csvContent = headers.join(",") + "\n";
    filteredPayments.forEach(payment => {
      const player = playerMap.get(payment.playerId)!;
      const playerName = getPlayerFullName(player);
      const row = [playerName, String(payment.montant), payment.datePaiement || "", payment.remarque || ""];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "paiements.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!window.confirm("Voulez-vous vraiment exporter la liste des paiements au format Excel ?")) return;
    setIsExportOpen(false);
    const headers = ["Joueur", "Montant", "Date Paiement", "Informations"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n";
    filteredPayments.forEach(payment => {
      const player = playerMap.get(payment.playerId)!;
      const playerName = getPlayerFullName(player);
      const row = [playerName, String(payment.montant), payment.datePaiement || "", payment.remarque || ""];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(";") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "paiements_excel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <PageBreadcrumb pageTitle="Paiements" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher un joueur"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <select
            value={deviseFilter}
            onChange={(event) => {
              setDeviseFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">Toutes devises</option>
            <option value="US">USD</option>
            <option value="HTG">HTG</option>
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

        <div className="shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 cursor-pointer"
          >
            + Ajouter un paiement
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Paiements
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredPayments.length} paiement(s)
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
                  Joueur
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Date paiement
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Montant
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Balance
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Action
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Informations
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {!hydrated ? (
                <TableBodySkeleton rows={6} columns={4} />
              ) : pagedPayments.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    Aucun paiement trouve.
                  </td>
                </TableRow>
              ) : (
                pagedPayments.map((payment) => {
                  const player = playerMap.get(payment.playerId)!;
                  const balance = calculateBalance(payment);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                        <span className="font-semibold">{getPlayerFullName(player)}</span>
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-300 font-medium">
                        {payment.datePaiement ? formatClubDate(payment.datePaiement) : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        {formatClubCurrency(payment.montant, payment.devise)}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm">
                        {balance > 0 && payment.statut === "paid" ? (
                          <span className="font-medium text-error-600 dark:text-error-400">
                            {formatClubCurrency(balance, "US")} à payer
                          </span>
                        ) : balance < 0 ? (
                          <span className="font-medium text-success-600 dark:text-success-400">
                            {formatClubCurrency(Math.abs(balance), payment.devise)} en trop
                          </span>
                        ) : !hasPaymentPlan(payment.remarque) ? (
                          <span className="text-warning-600 dark:text-warning-400">
                            Plan manquant
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm">
                        {balance > 0 && payment.statut === "paid" && (
                          <button
                            type="button"
                            onClick={() => openEditModal(payment)}
                            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                          >
                            Modifier
                          </button>
                        )}
                        {balance < 0 && (
                          <span className="text-xs text-gray-500">
                            Payé en trop
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        <span className="block truncate max-w-[200px]" title={payment.remarque}>
                          {payment.remarque || "-"}
                          <span className="mt-1 block text-xs text-gray-400">
                            Plan: {getPaymentPlanLabel(payment.remarque)} · Statut: {getPaymentStatusLabel(payment)}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm">
                        {(() => {
                          const photoUrl = extractPhotoUrlFromRemark(payment.remarque);
                          if (!photoUrl) return <span className="text-gray-400">-</span>;
                          return (
                            <button
                              onClick={() => {
                                setSelectedPaymentImage(photoUrl);
                                setIsImageModalOpen(true);
                              }}
                              className="flex items-center gap-1 text-brand-500 hover:text-brand-600"
                              title="Voir le justificatif"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                              Justificatif
                            </button>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {editingPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-payment-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-payment-title" className="text-lg font-semibold text-gray-800 dark:text-white">
                  Modifier le paiement
                </h2>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {getPlayerFullName(playerMap.get(editingPayment.playerId)!)}
                </p>
              </div>
              <button type="button" onClick={closeEditModal} className="text-xl text-gray-400 hover:text-gray-700" aria-label="Fermer">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Joueur</label>
                <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {getPlayerFullName(playerMap.get(editingPayment.playerId)!)}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Montant à régler</label>
                <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {formatClubCurrency(calculateBalance(editingPayment), "US")}
                </p>
              </div>
              <div>
                <label htmlFor="new-payment-amount" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Différence à ajouter</label>
                <input id="new-payment-amount" type="number" min="0.01" step="0.01" value={newAmount} onChange={(event) => setNewAmount(Number(event.target.value))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label htmlFor="new-payment-date" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Date du paiement</label>
                <input id="new-payment-date" type="date" value={newPaymentDate} onChange={(event) => setNewPaymentDate(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeEditModal} disabled={isSaving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
              <button type="button" onClick={handleEditPayment} disabled={isSaving} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{isSaving ? "Enregistrement..." : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end print:hidden">
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

      <PaymentAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

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
