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
import { updatePaymentInSupabase, deletePaymentInSupabase } from "@/lib/club/supabase-crud";
import { calculateDiscountedAmount, parseReductionFromRemark } from "@/lib/club/payment-reduction-utils";
import { ImageModal } from "@/components/club/modals/ImageModal";
import { extractPhotoUrlFromRemark, isPdfProof } from "@/lib/club/payment-photo-utils";
import { BellIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { ActiveBellIcon } from "@/icons/ActiveBellIcon";
import { ConfirmModal } from "@/components/ui/modal/ConfirmModal";
import { CustomReminderMessageModal } from "@/components/club/modals/CustomReminderMessageModal";
import { generateReceiptPDFBase64 } from "@/lib/club/pdf-generator";
import { useConfirm } from "@/hooks/useConfirm";

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
  const { payments, players, setPayments, hydrated, rubriques } = useClubData();
  const { confirm, ConfirmComponent } = useConfirm();
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
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] = useState(false);

  // Nouveaux etats pour les rappels
  const [reminderMode, setReminderMode] = useState<"none" | "mensuel" | "semestriel" | "custom">("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [isCustomMessageModalOpen, setIsCustomMessageModalOpen] = useState(false);
  const [customMessageText, setCustomMessageText] = useState("");
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

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

  // Calcule la balance uniquement si [TOTAL_DUE:XXX] est présent dans la remarque
  const calculateBalance = (currentPayment: (typeof payments)[number]): { balance: number; devise: "US" | "HTG"; dbg?: string } => {
    const paymentDevise = (currentPayment.devise || "US") as "US" | "HTG";
    const zero = { balance: 0, devise: paymentDevise };
    const player = playerMap.get(currentPayment.playerId);
    if (!player) return { ...zero, dbg: "no_player" };

    // Boursiers (full) -> balance = 0
    // We only zero the balance if it's explicitly a full bourse, not a demi-bourse
    const playerStatus = (player.statutJoueur || "").toLowerCase().trim();
    if (
      playerStatus === "bourse" ||
      playerStatus === "boursier" ||
      (currentPayment.remarque || "").toLowerCase().includes("[plan:boursier]")
    ) {
      return { ...zero, dbg: `boursier_status_(${playerStatus})` };
    }

    // Lire le TOTAL_DUE (toujours stocké en USD)
    const totalDueMarker = currentPayment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
    if (!totalDueMarker || !totalDueMarker[1]) return { ...zero, dbg: "no_marker" };
    const totalDueUSD = parseFloat(totalDueMarker[1]);
    if (isNaN(totalDueUSD) || totalDueUSD <= 0) return { ...zero, dbg: `nan_or_zero_(${totalDueUSD})` };

    // FIX: Si c'est un paiement uniquement pour des kits/inscription (pas d'adhésion)
    // mais qu'un plan a été sélectionné par erreur, le TOTAL_DUE inclut l'adhésion fantôme.
    // On ignore ce TOTAL_DUE démesuré pour éviter d'afficher une fausse dette.
    const remarkLower = (currentPayment.remarque || "").toLowerCase();
    const isKitOnly = !remarkLower.includes("adhésion") && !remarkLower.includes("adhesion");
    if (isKitOnly && totalDueUSD >= 900) {
      return { ...zero, dbg: "isKitOnly" }; // On ignore la dette fantôme
    }

    const isHTG = paymentDevise === "HTG";

    if (isHTG) {
      // Lire le taux depuis la colonne DB, sinon depuis le marqueur [TAUX:XXX] dans la remarque
      let taux = currentPayment.taux || 0;
      if (taux <= 1) {
        const tauxMatch = currentPayment.remarque?.match(/\[TAUX:\s*([\d.]+)\s*\]/i);
        if (tauxMatch && tauxMatch[1]) {
            taux = parseFloat(tauxMatch[1]);
        } else {
            taux = 130; // Fallback pour les anciens paiements corrompus (TauxChange=1 et pas de marqueur)
        }
      }
      if (taux <= 1) return { ...zero, dbg: `taux_le_1_(${taux})` }; // Impossible de convertir sans taux
      const totalDueHTG = totalDueUSD * taux;
      const paidHTG = currentPayment.montant; // montant stocké en HTG
      const balanceHTG = totalDueHTG - paidHTG;
      if (balanceHTG > 1) {
        return { balance: Math.round(balanceHTG), devise: "HTG", dbg: `HTG_PATH_balance_${balanceHTG}` };
      } else {
        return { ...zero, dbg: `HTG_PATH_balanceHTG_less_than_1_(${balanceHTG})` };
      }
    } else {
      // Travailler entièrement en USD
      const paidUSD = currentPayment.montant;
      const balanceUSD = totalDueUSD - paidUSD;
      if (balanceUSD > 0.01) {
        return { balance: Number(balanceUSD.toFixed(2)), devise: "US", dbg: `USD_PATH_balance_${balanceUSD}` };
      } else {
        return { balance: 0, devise: "US", dbg: `USD_PATH_balanceUSD_less_than_0.01_(${balanceUSD})` };
      }
    }

    return { ...zero, dbg: "END_REACHED" };
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

  const handleDeletePayment = (id: string) => {
    setPaymentToDelete(id);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePaymentInSupabase(paymentToDelete);
      setPayments((current) => current.filter((p) => p.id !== paymentToDelete));
    } catch (error) {
      alert("Erreur lors de la suppression du paiement.");
      console.error(error);
    } finally {
      setPaymentToDelete(null);
    }
  };

  const handleDownloadSinglePaymentPDF = async (payment: (typeof payments)[number]) => {
    const player = playerMap.get(payment.playerId);
    if (!player) return;
    
    try {
      const nomParts = (player.parentNomPrenom || "").split(" ");
      const parentNom = nomParts[0] || "";
      const parentPrenom = nomParts.slice(1).join(" ") || "";
      
      let proofBase64: string | null = null;
      const proofMatch = payment.remarque?.match(/\[JUSTIFICATIF:(.+?)\]/);
      if (proofMatch && proofMatch[1]) {
        try {
          const res = await fetch(proofMatch[1]);
          const blob = await res.blob();
          proofBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn("Erreur lors de la récupération de la preuve", e);
        }
      }
      
      // Extraire le total des rubriques depuis la remarque du paiement
      const totalRubriquesMatch = payment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      const totalRubriques = totalRubriquesMatch ? parseFloat(totalRubriquesMatch[1]) : undefined;
      
      const receiptBase64 = await generateReceiptPDFBase64(
        player,
        [payment],
        parentNom,
        parentPrenom,
        player.parentTelephone || player.telephone || "",
        player.parentEmail || player.email || "",
        player.parentAdresse || player.adresse || "",
        proofBase64,
        false,
        totalRubriques
      );
      
      // Télécharger le PDF
      const base64Data = receiptBase64.includes("base64,") ? receiptBase64.split("base64,")[1] : receiptBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: 'application/pdf'});
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const receiptNo = `RP-FCTORO-${payment.id.slice(0, 8).toUpperCase()}`;
      link.download = `${receiptNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur lors de la génération du PDF", err);
      alert("Erreur lors de la génération du PDF");
    }
  };

  const handlePrintSinglePaymentPDF = async (payment: (typeof payments)[number]) => {
    const player = playerMap.get(payment.playerId);
    if (!player) return;
    
    try {
      const nomParts = (player.parentNomPrenom || "").split(" ");
      const parentNom = nomParts[0] || "";
      const parentPrenom = nomParts.slice(1).join(" ") || "";
      
      let proofBase64: string | null = null;
      const proofMatch = payment.remarque?.match(/\[JUSTIFICATIF:(.+?)\]/);
      if (proofMatch && proofMatch[1]) {
        try {
          const res = await fetch(proofMatch[1]);
          const blob = await res.blob();
          proofBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn("Erreur lors de la récupération de la preuve", e);
        }
      }
      
      // Extraire le total des rubriques depuis la remarque du paiement
      const totalRubriquesMatch = payment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      const totalRubriques = totalRubriquesMatch ? parseFloat(totalRubriquesMatch[1]) : undefined;
      
      const receiptBase64 = await generateReceiptPDFBase64(
        player,
        [payment],
        parentNom,
        parentPrenom,
        player.parentTelephone || player.telephone || "",
        player.parentEmail || player.email || "",
        player.parentAdresse || player.adresse || "",
        proofBase64,
        true,
        totalRubriques
      );
      
      const base64Data = receiptBase64.includes("base64,") ? receiptBase64.split("base64,")[1] : receiptBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: 'application/pdf'});
      const blobUrl = URL.createObjectURL(blob);
      
      // Use a hidden iframe to print without triggering a download in most browsers
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Erreur lors de l'impression via iframe", e);
          }
        }, 300);
      };
    } catch (err) {
      console.error("Erreur lors de la génération du PDF", err);
      alert("Erreur lors de la génération du PDF pour impression");
    }
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
        if (dateB !== dateA) return dateB - dateA;
        const idA = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
        const idB = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
        return idB - idA;
      });
  }, [payments, playerMap, searchQuery, deviseFilter, selectedSeason]);

  // ----- Logique de Rappel en Masse -----
  const targetPlayers = useMemo(() => {
    const playersMap = new Map<string, { player: (typeof players)[number]; email: string; parentName: string }>();
    filteredPayments.forEach((p) => {
      const player = playerMap.get(p.playerId);
      if (player && !playersMap.has(player.id)) {
        const targetEmail = player.parentEmail || player.email;
        if (targetEmail) {
          playersMap.set(player.id, {
            player,
            email: targetEmail,
            parentName: player.parentNomPrenom || getPlayerFullName(player),
          });
        }
      }
    });
    return Array.from(playersMap.values());
  }, [filteredPayments, playerMap]);

  const allSelected = targetPlayers.length > 0 && selectedIds.size === targetPlayers.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(targetPlayers.map((tp) => tp.player.id)));
    }
  };

  const togglePlayerSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleStartReminder = (mode: "mensuel" | "semestriel" | "custom") => {
    setIsReminderDropdownOpen(false);
    if (mode === "semestriel") {
      alert("Le texte pour le plan semestriel n'est pas encore défini.");
      return;
    }
    if (mode === "custom") {
      setIsCustomMessageModalOpen(true);
    } else {
      setReminderMode(mode);
      setSelectedIds(new Set());
    }
  };

  const handleSendReminders = async () => {
    if (selectedIds.size === 0) return;
    
    confirm({
      title: "Envoyer les rappels",
      message: `Confirmez-vous l'envoi de ${selectedIds.size} rappel(s) de paiement ?`,
      confirmText: "Envoyer",
      cancelText: "Annuler",
      onConfirm: async () => {
        setIsSendingReminders(true);
        const selectedList = targetPlayers.filter(tp => selectedIds.has(tp.player.id));
        
        let successCount = 0;
        let errorCount = 0;

        for (const tp of selectedList) {
          try {
            const payload: any = {
              email: tp.email,
              playerName: getPlayerFullName(tp.player),
              recipientName: tp.parentName,
            };
            if (reminderMode === "custom") {
              payload.customMessage = customMessageText;
              payload.customSubject = "Message Important du FC TORO";
            }

            const response = await fetch("/api/send-reminder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch {
            errorCount++;
          }
        }

        setIsSendingReminders(false);
        setReminderMode("none");
        setSelectedIds(new Set());
        alert(`Rappels envoyés avec succès : ${successCount} réussi(s), ${errorCount} échoué(s).`);
      },
    });
  };

  const getPaymentPlanLabel = (remark?: string) => {
    const remarkLower = (remark || "").toLowerCase();
    const isKitOnly = !remarkLower.includes("adhésion") && !remarkLower.includes("adhesion");
    if (isKitOnly) return "Aucun";
    
    return remark?.match(/\[PLAN:\s*(ANNUEL|SEMESTRIEL|MENSUEL)\]/i)?.[1] ||
      remark?.match(/plan\s*:\s*(annuel|semestriel|mensuel)/i)?.[1] ||
      "Aucun";
  };

  const getPaymentStatusLabel = (payment: (typeof payments)[number]) => {
    const marker = payment.remarque?.match(/\[STATUT:\s*(PAID|PENDING|LATE)\]/i)?.[1];
    return marker?.toLowerCase() || payment.statut;
  };



  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPayments = filteredPayments.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des paiements au format CSV ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
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
      }
    });
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des paiements au format Excel ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
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
      }
    });
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
                {String(season).toLowerCase().startsWith('saison') ? season : `Saison ${season}`}
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
          <div className="flex items-center gap-3 relative">
            {reminderMode !== "none" ? (
              <>
                <button
                  onClick={() => {
                    setReminderMode("none");
                    setSelectedIds(new Set());
                  }}
                  disabled={isSendingReminders}
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-white border border-gray-200 px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendReminders}
                  disabled={isSendingReminders || selectedIds.size === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {isSendingReminders ? "Envoi..." : `Envoyer les rappels (${selectedIds.size})`}
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <button
                    onClick={() => setIsReminderDropdownOpen(!isReminderDropdownOpen)}
                    className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-white border border-gray-200 dark:border-gray-800 dark:bg-gray-900 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-theme-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ActiveBellIcon className="w-5 h-5 text-brand-500" />
                    Rappel
                  </button>
                  <Dropdown
                    isOpen={isReminderDropdownOpen}
                    onClose={() => setIsReminderDropdownOpen(false)}
                    className="absolute right-0 top-full mt-1 w-56"
                  >
                    <DropdownItem
                      onItemClick={() => handleStartReminder("mensuel")}
                      className="cursor-pointer"
                    >
                      Rappel Plan mensuel
                    </DropdownItem>
                    <DropdownItem
                      onItemClick={() => handleStartReminder("semestriel")}
                      className="cursor-pointer text-gray-400"
                    >
                      Rappel Plan semestriel
                    </DropdownItem>
                    <DropdownItem
                      onItemClick={() => handleStartReminder("custom")}
                      className="cursor-pointer"
                    >
                      Rappel pour autre Cas
                    </DropdownItem>
                  </Dropdown>
                </div>
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
              </>
            )}
          </div>
        </div>
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                {reminderMode !== "none" && (
                  <TableCell isHeader className="py-3 text-start w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={isSendingReminders}
                      className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:opacity-50"
                    />
                  </TableCell>
                )}
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
                  Informations
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Justificatif
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Action
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
                  const isSelectable = !!(player.parentEmail || player.email);
                  return (
                    <TableRow key={payment.id}>
                      {reminderMode !== "none" && (
                        <TableCell className="py-3">
                          {isSelectable && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(player.id)}
                              onChange={() => togglePlayerSelect(player.id)}
                              disabled={isSendingReminders}
                              className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:opacity-50"
                            />
                          )}
                        </TableCell>
                      )}
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
                        {balance.balance > 0 ? (
                          <span className="font-medium text-error-600 dark:text-error-400">
                            {formatClubCurrency(balance.balance, balance.devise)} à payer
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
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
                          const isPdf = isPdfProof(photoUrl);
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPaymentImage(photoUrl);
                                  setIsImageModalOpen(true);
                                }}
                                className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded border transition-all focus:outline-none ${
                                  isPdf
                                    ? "flex-col border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30"
                                    : "border-gray-200 bg-gray-50 hover:border-brand-500 hover:opacity-90 dark:border-gray-700 dark:bg-gray-800"
                                }`}
                                title={isPdf ? "Voir le document PDF" : "Voir le justificatif en grand"}
                              >
                                {isPdf ? (
                                  <>
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[9px] font-bold text-red-700 dark:text-red-300">PDF</span>
                                  </>
                                ) : (
                                  <img
                                    src={photoUrl}
                                    alt="Justificatif"
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </button>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handlePrintSinglePaymentPDF(payment)}
                            className="inline-flex items-center justify-center text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition cursor-pointer"
                            aria-label="Imprimer le reçu"
                            title="Imprimer le reçu"
                          >
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <Link
                            href={`/paiements/modifier/${payment.id}`}
                            className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <PencilIcon className="size-5" />
                          </Link>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                            onClick={() => handleDeletePayment(payment.id)}
                            aria-label="Supprimer"
                            title="Supprimer"
                          >
                            <TrashBinIcon className="size-5" />
                          </button>

                          {balance.balance > 0 && (
                            <button
                              type="button"
                              onClick={() => openEditModal(payment)}
                              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                              title="Ajouter un solde"
                            >
                              Solde
                            </button>
                          )}
                        </div>
                        {balance.balance < 0 && (
                          <span className="text-xs text-gray-500 mt-1 block">
                            Payé en trop
                          </span>
                        )}
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
                  {(() => {
                    const b = calculateBalance(editingPayment);
                    return formatClubCurrency(b.balance, b.devise);
                  })()}
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
          pageSizeOptions={[10, 25, 50, 100, 10000]}
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
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={selectedPaymentImage || ""}
        title="Justificatif de paiement"
      />

      {isCustomMessageModalOpen && (
        <CustomReminderMessageModal
          isOpen={isCustomMessageModalOpen}
          onClose={() => setIsCustomMessageModalOpen(false)}
          onSubmit={(msg) => {
            setCustomMessageText(msg);
            setIsCustomMessageModalOpen(false);
            setReminderMode("custom");
            setSelectedIds(new Set());
          }}
        />
      )}

      <ConfirmModal
        isOpen={paymentToDelete !== null}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={confirmDeletePayment}
        title="Supprimer le paiement"
        message="Voulez-vous vraiment supprimer ce paiement ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        isDestructive={true}
      />

      <ConfirmComponent />
    </div>
  );
}
