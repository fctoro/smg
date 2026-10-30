"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { extractPhotoUrlFromRemark, extractPhotoUrlsFromRemark, isPdfProof, validatePaymentPhotoFile, getPaymentPhotoPreviewUrl, uploadPaymentPhotosToSupabase, filesToBase64 } from "@/lib/club/payment-photo-utils";
import { BellIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { ActiveBellIcon } from "@/icons/ActiveBellIcon";
import { ConfirmModal } from "@/components/ui/modal/ConfirmModal";
import { CustomReminderMessageModal } from "@/components/club/modals/CustomReminderMessageModal";
import { generateReceiptPDFBase64, generatePlayerHistoryPDFBase64 } from "@/lib/club/pdf-generator";
import { decomposePaymentTransactions } from "@/lib/club/statistics";
import { generatePlayerMatricule } from "@/lib/club/season";
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
import { fetchProgrammes } from "@/lib/club/programmes";
import { ProgrammeMatch } from "@/types/club";

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const urlMethode = searchParams.get("methode") || "all";

  const { payments, players, parents, setPayments, hydrated, rubriques } = useClubData();
  const { confirm, ConfirmComponent } = useConfirm();
  const [activeTab, setActiveTab] = useState<"saison" | "programmes">("saison");
  const [programmesList, setProgrammesList] = useState<ProgrammeMatch[]>([]);
  const [selectedProgrammeFilter, setSelectedProgrammeFilter] = useState("all");
  const [modalProgrammeNom, setModalProgrammeNom] = useState<string | undefined>(undefined);
  const [progCurrentPage, setProgCurrentPage] = useState(1);
  const [progCurrentPageSize, setProgCurrentPageSize] = useState(50);
  const [isProgExportOpen, setIsProgExportOpen] = useState(false);

  useEffect(() => {
    fetchProgrammes()
      .then((res) => setProgrammesList(res || []))
      .catch((err) => console.warn("Erreur chargement programmes:", err));
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [methodeFilter, setMethodeFilter] = useState(urlMethode);
  const [deviseFilter, setDeviseFilter] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [codeUniqueFilter, setCodeUniqueFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const m = searchParams.get("methode");
    if (m) {
      setMethodeFilter(m);
    } else {
      setMethodeFilter("all");
    }
  }, [searchParams]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(100);
  const [editingPayment, setEditingPayment] = useState<(typeof payments)[number] | null>(null);
  const [newAmount, setNewAmount] = useState<number | "">("");
  const [newPaymentDate, setNewPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
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

  const [paymentPhotos, setPaymentPhotos] = useState<File[]>([]);
  const [paymentPhotoPreviews, setPaymentPhotoPreviews] = useState<{ file: File; url: string; name: string; isPdf: boolean }[]>([]);
  const [paymentPhotoError, setPaymentPhotoError] = useState<string | null>(null);
  const [nombreDeMois, setNombreDeMois] = useState<number>(1);
  const [isMonthlyPlan, setIsMonthlyPlan] = useState<boolean>(false);
  const [editPlan, setEditPlan] = useState<string>("annuel");

  const [modalPlayerId, setModalPlayerId] = useState<string | undefined>(undefined);
  const [editDevise, setEditDevise] = useState<"US" | "HTG">("US");
  const [editTaux, setEditTaux] = useState<number>(0);
  const [historyPlayerId, setHistoryPlayerId] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<"saison" | "programmes">("saison");
  const [historySelectedProgramme, setHistorySelectedProgramme] = useState<string>("all");
  const [settledReceiptModalData, setSettledReceiptModalData] = useState<{
    player: (typeof players)[number];
    payment: any;
    receiptBase64: string;
    blobUrl: string;
    receiptNumber: string;
    amountFormatted: string;
    datePaiement: string;
    methode: string;
    emailSentTo: string | null;
  } | null>(null);

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const parentMap = useMemo(
    () => new Map((parents || []).map((parent) => [parent.id, parent])),
    [parents],
  );

  const seasons = useMemo(() => {
    const list: string[] = [];
    players.forEach((player) => {
      if (player.saison) list.push(player.saison);
      if (player.saisons && Array.isArray(player.saisons)) {
        list.push(...player.saisons);
      }
    });
    return [...new Set(list.filter(Boolean))].sort((a, b) => (b || "").localeCompare(a || ""));
  }, [players]);

  // Calcule la balance globale du joueur en tenant compte de tous ses versements
  const calculateBalance = (currentPayment: (typeof payments)[number]): { balance: number; devise: "US" | "HTG"; moisRestants?: number; isSpecial?: boolean; dbg?: string } => {
    const paymentDevise = (currentPayment.devise || "US") as "US" | "HTG";
    const zero = { balance: 0, devise: paymentDevise };
    const player = playerMap.get(currentPayment.playerId);
    if (!player) return { ...zero, dbg: "no_player" };

    const remarkLower = (currentPayment.remarque || "").toLowerCase();
    const playerStatus = (player.statutJoueur || "").toLowerCase().trim();
    const isBoursier = (playerStatus === "bourse" || playerStatus === "boursier" || remarkLower.includes("[plan:boursier]")) && !playerStatus.includes("demi") && !remarkLower.includes("demi");
    const isDemiBoursier = playerStatus.includes("demi") || remarkLower.includes("demi-bourse") || remarkLower.includes("demi bourse") || remarkLower.includes("[reduction:half]") || (remarkLower.includes("demi") && !remarkLower.includes("pandemie"));

    // Somme cumulée de TOUS les paiements de saison de ce joueur (hors programmes spéciaux)
    const playerPayments = payments.filter((p) => p.playerId === currentPayment.playerId && !p.remarque?.includes("[PROGRAMME:"));
    let defaultTaux = currentPayment.taux || 0;
    if (defaultTaux <= 1) {
      const tauxMatch = currentPayment.remarque?.match(/\[TAUX:\s*([\d.]+)\s*\]/i);
      defaultTaux = tauxMatch ? parseFloat(tauxMatch[1]) : 130;
    }

    let playerTotalPaidUSD = 0;
    let playerTotalPaidHTG = 0;
    playerPayments.forEach((p) => {
      const pAmt = Number(p.montant) || 0;
      const pTaux = Number(p.taux) || defaultTaux;
      if (p.devise === "HTG") {
        playerTotalPaidHTG += pAmt;
        playerTotalPaidUSD += pTaux > 0 ? pAmt / pTaux : 0;
      } else {
        playerTotalPaidUSD += pAmt;
        playerTotalPaidHTG += pTaux > 0 ? pAmt * pTaux : 0;
      }
    });

    // 1. Cas Boursier : paie seulement un montant à définir (pas de formule mensuelle comme demi-bourse)
    if (isBoursier) {
      const totalDueMarker = currentPayment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      if (totalDueMarker && totalDueMarker[1]) {
        const totalDueVal = parseFloat(totalDueMarker[1]);
        if (!isNaN(totalDueVal) && totalDueVal > 0) {
          if (paymentDevise === "HTG") {
            let taux = currentPayment.taux || defaultTaux;
            const totalDueHTG = Math.round(totalDueVal * taux);
            const balanceHTG = Math.max(0, totalDueHTG - playerTotalPaidHTG);
            return {
              balance: balanceHTG,
              devise: "HTG",
              isSpecial: true,
              dbg: `boursier_defined_htg`,
            };
          } else {
            const balanceUSD = Math.max(0, totalDueVal - playerTotalPaidUSD);
            return {
              balance: Number(balanceUSD.toFixed(2)),
              devise: "US",
              isSpecial: true,
              dbg: `boursier_defined_usd`,
            };
          }
        }
      }
      return { ...zero, dbg: "boursier_defined_solde" };
    }

    // 2. Cas Demi-Bourse (Soit Fixe 2 500 HTG/mois, soit 50% du tarif mensuel: 77.50$ FC Toro / 57.50$ Ti Toro)
    if (isDemiBoursier) {
      const isDemi2500 = playerStatus.includes("2500") || playerStatus.includes("2 500") || remarkLower.includes("demi-bourse-2500") || remarkLower.includes("2 500 htg") || remarkLower.includes("2,500 htg") || remarkLower.includes("2500 htg");
      const payesMatch = currentPayment.remarque?.match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || currentPayment.remarque?.match(/(\d+)\s*mois/i);
      const moisPayes = payesMatch ? parseInt(payesMatch[1], 10) : 1;
      const restantsMatch = currentPayment.remarque?.match(/\[MOIS_RESTANTS:\s*(\d+)\s*\]/i);
      let moisRestants: number | undefined = restantsMatch ? parseInt(restantsMatch[1], 10) : undefined;
      if (moisRestants === undefined) {
        moisRestants = Math.max(0, 12 - moisPayes);
      }

      if (moisRestants !== undefined) {
        const totalSeasonMonths = moisPayes + moisRestants;

        if (isDemi2500) {
          const totalSeasonDueHTG = totalSeasonMonths * 2500;
          const balanceHTG = Math.max(0, totalSeasonDueHTG - playerTotalPaidHTG);
          const effectiveMoisRestants = Math.max(0, Math.ceil(balanceHTG / 2500));
          return {
            balance: balanceHTG,
            devise: "HTG",
            moisRestants: effectiveMoisRestants,
            isSpecial: true,
            dbg: `demi_boursier_2500_${effectiveMoisRestants}_mois_restants_htg`,
          };
        }

        const cat = (player.categorie || "").toLowerCase().replace(/[\s-_]/g, "");
        const isTi = cat.includes("titoro") || cat.includes("ti-toro") || cat.includes("ti_toro");
        const demiMonthlyUSD = isTi ? 57.5 : 77.5;

        let taux = currentPayment.taux || defaultTaux;
        const totalSeasonDueUSD = totalSeasonMonths * demiMonthlyUSD;
        const balanceUSD = Math.max(0, totalSeasonDueUSD - playerTotalPaidUSD);
        const effectiveMoisRestants = Math.max(0, Math.ceil(balanceUSD / demiMonthlyUSD));

        if (paymentDevise === "HTG" && taux > 1) {
          const remainingHTG = Math.round(balanceUSD * taux);
          return {
            balance: remainingHTG,
            devise: "HTG",
            moisRestants: effectiveMoisRestants,
            isSpecial: true,
            dbg: `demi_boursier_${effectiveMoisRestants}_mois_restants_htg`,
          };
        } else {
          return {
            balance: Number(balanceUSD.toFixed(2)),
            devise: "US",
            moisRestants: effectiveMoisRestants,
            isSpecial: true,
            dbg: `demi_boursier_${effectiveMoisRestants}_mois_restants_usd`,
          };
        }
      }
    }

    // 3. Cas Standard : Lire le TOTAL_DUE (stocké en USD)
    const totalDueMarker = currentPayment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
    if (!totalDueMarker || !totalDueMarker[1]) return { ...zero, dbg: "no_marker" };
    const totalDueUSD = parseFloat(totalDueMarker[1]);
    if (isNaN(totalDueUSD) || totalDueUSD <= 0) return { ...zero, dbg: `nan_or_zero_(${totalDueUSD})` };

    const paidUSD = playerTotalPaidUSD;
    const balanceUSD = totalDueUSD - paidUSD;
    if (balanceUSD > 0.01) {
      return { balance: Number(balanceUSD.toFixed(2)), devise: "US", dbg: `USD_PATH_balance_${balanceUSD}` };
    } else {
      return { balance: 0, devise: "US", dbg: `USD_PATH_balanceUSD_less_than_0.01_(${balanceUSD})` };
    }
  };

  const hasPaymentPlan = (remark?: string) =>
    /(?:\[plan\s*:\s*|plan\s*:\s*)(annuel|semestriel|mensuel)/i.test(remark || "");

  // Récupère la date de paiement la plus récente (premier paiement ou solde/versement le plus récent)
  const getLatestPaymentDate = (payment: (typeof payments)[number]): string => {
    const dates: string[] = [];
    if (payment.datePaiement) {
      dates.push(payment.datePaiement.split("T")[0]);
    }

    if (payment.remarque) {
      const versementMatches = payment.remarque.matchAll(/_DATE:(\d{4}-\d{2}-\d{2})/gi);
      for (const m of versementMatches) {
        if (m[1]) dates.push(m[1]);
      }
      const genericDateMatches = payment.remarque.matchAll(/\[(?:DATE|SOLDE_DATE|DERNIER_VERSEMENT):(\d{4}-\d{2}-\d{2})\]/gi);
      for (const m of genericDateMatches) {
        if (m[1]) dates.push(m[1]);
      }
    }

    const playerAllP = payments.filter((p) => p.playerId === payment.playerId);
    playerAllP.forEach((p) => {
      if (p.datePaiement) {
        dates.push(p.datePaiement.split("T")[0]);
      }
      if (p.remarque) {
        const matches = p.remarque.matchAll(/_DATE:(\d{4}-\d{2}-\d{2})/gi);
        for (const m of matches) {
          if (m[1]) dates.push(m[1]);
        }
      }
    });

    if (dates.length === 0) return payment.datePaiement ? payment.datePaiement.split("T")[0] : "";
    dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return dates[0];
  };

  const openEditModal = (payment: (typeof payments)[number]) => {
    setEditingPayment(payment);
    setNewAmount("");
    setNewPaymentDate(new Date().toISOString().split("T")[0]);
    setEditDevise((payment.devise as "US" | "HTG") || "US");
    setEditTaux(payment.taux || 0);
    setEditError("");
    paymentPhotoPreviews.forEach((p) => {
      if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
    });
    setPaymentPhotos([]);
    setPaymentPhotoPreviews([]);
    setPaymentPhotoError(null);

    const remarkLower = (payment.remarque || "").toLowerCase();
    let rawPlan = "annuel";
    if (remarkLower.includes("demi")) rawPlan = "demi-bourse";
    else if ((remarkLower.includes("boursier") || remarkLower.includes("bourse")) && !remarkLower.includes("demi")) rawPlan = "boursier";
    else if (remarkLower.includes("semestriel")) rawPlan = "semestriel";
    else if (remarkLower.includes("mensuel")) rawPlan = "mensuel";
    else rawPlan = "annuel";
    setEditPlan(rawPlan);

    const isMonthly = rawPlan === "mensuel" || rawPlan === "demi-bourse" || remarkLower.includes("[plan:mensuel]") || remarkLower.includes("mensuel");
    setIsMonthlyPlan(isMonthly);

    const moisMatch = payment.remarque?.match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || payment.remarque?.match(/(\d+)\s*mois/i);
    if (moisMatch && moisMatch[1]) {
      setNombreDeMois(parseInt(moisMatch[1], 10) || 1);
    } else {
      setNombreDeMois(1);
    }
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setEditingPayment(null);
    setEditError("");
    paymentPhotoPreviews.forEach((p) => {
      if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
    });
    setPaymentPhotos([]);
    setPaymentPhotoPreviews([]);
    setPaymentPhotoError(null);
  };

  const handlePaymentPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setPaymentPhotoError(null);
    const newPreviews = selectedFiles.map((file) => {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const url = URL.createObjectURL(file);
      return { file, url, name: file.name, isPdf };
    });

    setPaymentPhotos((current) => [...current, ...selectedFiles]);
    setPaymentPhotoPreviews((current) => [...current, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    setPaymentPhotos((current) => current.filter((_, i) => i !== index));
    setPaymentPhotoPreviews((current) => {
      const itemToRemove = current[index];
      if (itemToRemove && itemToRemove.url.startsWith("blob:")) {
        URL.revokeObjectURL(itemToRemove.url);
      }
      return current.filter((_, i) => i !== index);
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPayment) return;

    setIsSaving(true);
    setEditError("");
    try {
      const uploadPromise = paymentPhotos.length > 0 ? uploadPaymentPhotosToSupabase(paymentPhotos) : Promise.resolve([]);
      const paymentPhotoUrls = await uploadPromise;

      const newAmountNum = Number(newAmount) || 0;

      // Calcul de l'équivalent en USD du versement ajouté
      const addedUSD = editDevise === "HTG"
        ? (editTaux > 0 ? newAmountNum / editTaux : 0)
        : newAmountNum;
      
      const addedHTG = editDevise === "HTG"
        ? newAmountNum
        : (editTaux > 0 ? newAmountNum * editTaux : 0);

      const targetDevise = editingPayment.devise || "US";

      // Cumul total mis à jour en USD et HTG
      const prevMontantUS = Number(editingPayment.montantUS) || (editingPayment.devise === "HTG" && editingPayment.taux ? editingPayment.montant / editingPayment.taux : Number(editingPayment.montant) || 0);
      const prevMontantHTG = Number(editingPayment.montantHTG) || (editingPayment.devise === "HTG" ? Number(editingPayment.montant) || 0 : 0);

      const totalMontantUS = prevMontantUS + addedUSD;
      const totalMontantHTG = prevMontantHTG + addedHTG;

      // Le montant principal reste exprimé dans la devise initiale du dossier
      const newPrimaryAmount = targetDevise === "HTG" ? totalMontantHTG : totalMontantUS;

      const paymentPhotoNotes = (paymentPhotoUrls && paymentPhotoUrls.length > 0)
        ? paymentPhotoUrls.map((url) => ` [JUSTIFICATIF:${url}]`).join("")
        : paymentPhotos.map((p) => ` [JUSTIFICATIF:${p.name}]`).join("");

      let baseRemarque = editingPayment.remarque || "";

      // Mettre à jour le marqueur [PLAN:...]
      const planUpper = editPlan.toUpperCase();
      if (/\[PLAN:\s*[^\]]+\s*\]/i.test(baseRemarque)) {
        baseRemarque = baseRemarque.replace(/\[PLAN:\s*[^\]]+\s*\]/gi, `[PLAN:${planUpper}]`);
      } else {
        baseRemarque = `[PLAN:${planUpper}] ${baseRemarque}`;
      }

      if (editPlan === "mensuel") {
        if (/\[MOIS_PAYES:\s*\d+\s*\]/i.test(baseRemarque)) {
          baseRemarque = baseRemarque.replace(/\[MOIS_PAYES:\s*\d+\s*\]/gi, `[MOIS_PAYES:${nombreDeMois}]`);
        } else {
          baseRemarque = `${baseRemarque} [MOIS_PAYES:${nombreDeMois}]`;
        }
      } else {
        baseRemarque = baseRemarque.replace(/\[MOIS_PAYES:\s*\d+\s*\]/gi, "").trim();
      }

      const paymentDateToSave = newPaymentDate || new Date().toISOString().split("T")[0];

      if (!baseRemarque.includes("[DATE_INITIALE:") && editingPayment.datePaiement) {
        baseRemarque = `[DATE_INITIALE:${editingPayment.datePaiement.split("T")[0]}] ${baseRemarque}`;
      }

      if (editDevise === "HTG" && newAmountNum > 0) {
        baseRemarque += ` [SOLDE_HTG:${newAmountNum}_TAUX:${editTaux}_USD:${addedUSD.toFixed(2)}]`;
      }
      if (newAmountNum > 0) {
        baseRemarque += ` [VERSEMENT:${newAmountNum}_${editDevise}_DATE:${paymentDateToSave}]`;
        baseRemarque += ` [DERNIER_VERSEMENT:${paymentDateToSave}]`;
      }

      const finalRemarque = `${baseRemarque}${paymentPhotoNotes}`.trim();

      if (newAmountNum > 0) {
        // Mettre à jour la transaction existante en place (cumul) pour ne JAMAIS créer de nouvelle ligne dans la table
        await updatePaymentInSupabase(editingPayment.id, {
          montant: newPrimaryAmount,
          montantUS: totalMontantUS,
          montantHTG: totalMontantHTG,
          devise: targetDevise,
          taux: editTaux > 0 ? editTaux : editingPayment.taux,
          datePaiement: paymentDateToSave,
          remarque: finalRemarque,
        });

        const updatedPayment = {
          ...editingPayment,
          montant: newPrimaryAmount,
          montantUS: totalMontantUS,
          montantHTG: totalMontantHTG,
          devise: targetDevise,
          taux: editTaux > 0 ? editTaux : editingPayment.taux,
          datePaiement: paymentDateToSave,
          remarque: finalRemarque,
        };

        setPayments((currentPayments) =>
          currentPayments.map((payment) =>
            payment.id === editingPayment.id ? updatedPayment : payment
          )
        );

        // Génération du reçu et envoi par email
        const player = playerMap.get(editingPayment.playerId);
        if (player) {
          try {
            const savedVMatches = [...finalRemarque.matchAll(/\[VERSEMENT:\s*([\d.]+)_([A-Za-z]+)(?:_TAUX:([\d.]+))?(?:_USD:([\d.]+))?_DATE:(\d{4}-\d{2}-\d{2})\]/gi)];
            const installmentPaymentForPdf = {
              ...editingPayment,
              id: `${editingPayment.id}-v${savedVMatches.length}`,
              montant: newAmountNum,
              montantUS: addedUSD,
              montantHTG: addedHTG,
              devise: editDevise,
              taux: editDevise === "HTG" && editTaux > 0 ? editTaux : editingPayment.taux,
              datePaiement: paymentDateToSave,
              remarque: finalRemarque,
            };

            const playerAllPayments = payments
              .filter((p) => p.playerId === editingPayment.playerId)
              .map((p) => (p.id === editingPayment.id ? updatedPayment : p));

            const nomParts = (player.parentNomPrenom || "").split(" ");
            const parentNom = nomParts[0] || "";
            const parentPrenom = nomParts.slice(1).join(" ") || "";

            const totalRubriquesMatch = finalRemarque.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
            const totalRubriques = totalRubriquesMatch ? parseFloat(totalRubriquesMatch[1]) : undefined;

            const existingPhotoUrls = extractPhotoUrlsFromRemark(editingPayment.remarque);
            const existingProofBase64List: string[] = [];
            for (const proofUrl of existingPhotoUrls) {
              try {
                const res = await fetch(proofUrl);
                const blob = await res.blob();
                const b64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                if (b64) existingProofBase64List.push(b64);
              } catch (e) {
                console.warn("Erreur lors de la récupération de la preuve", proofUrl, e);
              }
            }

            const newProofBase64List = await filesToBase64(paymentPhotos);
            const allProofBase64List = [...existingProofBase64List, ...newProofBase64List];

            const emailToSend = (player.parentEmail || player.email || "").trim();

            const receiptBase64 = await generateReceiptPDFBase64(
              player,
              [installmentPaymentForPdf],
              parentNom,
              parentPrenom,
              player.parentTelephone || player.telephone || "",
              emailToSend,
              player.parentAdresse || player.adresse || "",
              allProofBase64List,
              false,
              totalRubriques,
              playerAllPayments
            );

            const mntStr = editDevise === "HTG" ? `${newAmountNum.toLocaleString()} HTG` : `$${newAmountNum.toFixed(2)} USD`;
            const receiptNo = `REC-${String(editingPayment.id).slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

            const base64Data = receiptBase64.includes("base64,") ? receiptBase64.split("base64,")[1] : receiptBase64;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(blob);

            let emailSentTo: string | null = null;
            if (emailToSend) {
              emailSentTo = emailToSend;
              fetch("/api/send-receipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: emailSentTo,
                  parentName: player.parentNomPrenom || getPlayerFullName(player),
                  receiptBase64,
                  receiptNumber: receiptNo,
                  amount: mntStr,
                }),
              }).catch((emailErr) => console.error("Erreur lors de l'envoi du mail de solde:", emailErr));
            }

            // Afficher la fenêtre modale avec le récapitulatif complet du reçu pour l'administrateur
            setSettledReceiptModalData({
              player,
              payment: installmentPaymentForPdf,
              receiptBase64,
              blobUrl,
              receiptNumber: receiptNo,
              amountFormatted: mntStr,
              datePaiement: paymentDateToSave,
              methode: editingPayment.methode || "especes",
              emailSentTo,
            });
          } catch (pdfErr) {
            console.error("Erreur lors de la génération du reçu:", pdfErr);
          }
        }
      } else {
        // Simple modification des métadonnées de la transaction sélectionnée (date, plan, remarque)
        await updatePaymentInSupabase(editingPayment.id, {
          montant: editingPayment.montant,
          montantUS: editingPayment.montantUS,
          montantHTG: editingPayment.montantHTG,
          devise: targetDevise,
          taux: editTaux > 0 ? editTaux : editingPayment.taux,
          datePaiement: paymentDateToSave,
          remarque: finalRemarque,
        });
        setPayments((currentPayments) =>
          currentPayments.map((payment) =>
            payment.id === editingPayment.id
              ? { ...payment, datePaiement: paymentDateToSave, remarque: finalRemarque }
              : payment,
          ),
        );
      }

      // Fermeture propre du modal de saisie
      setEditingPayment(null);
      setEditError("");
      paymentPhotoPreviews.forEach((p) => {
        if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
      });
      setPaymentPhotos([]);
      setPaymentPhotoPreviews([]);
      setPaymentPhotoError(null);
    } catch (error: any) {
      console.error("Erreur complète:", error);
      setEditError(error?.message || "Impossible d'enregistrer la modification.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeSettledReceiptModal = () => {
    if (settledReceiptModalData?.blobUrl) {
      try {
        URL.revokeObjectURL(settledReceiptModalData.blobUrl);
      } catch {}
    }
    setSettledReceiptModalData(null);
  };

  const handleOpenReceiptTab = (blobUrl: string) => {
    try {
      window.open(blobUrl, "_blank");
    } catch (e) {
      console.error(e);
      alert("Impossible d'ouvrir le document");
    }
  };

  const handlePrintSettledReceipt = (blobUrl: string) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
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
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'impression du reçu");
    }
  };

  const handleDownloadSettledReceipt = (blobUrl: string, receiptNumber: string) => {
    try {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Erreur lors du téléchargement du reçu");
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
      // Si c'est une ligne cumulative avec des versements, cibler le dernier versement
      let targetPayment = payment;
      const pid = String(payment.id || "");
      const isSpecificTx = pid.endsWith("-init") || pid.includes("-v");
      const hasVersements = /\[VERSEMENT:[^\]]+\]/i.test(String(payment.remarque || ""));
      if (!isSpecificTx && hasVersements) {
        const decomposed = decomposePaymentTransactions([payment], [player]);
        if (decomposed.length > 0) {
          targetPayment = decomposed[decomposed.length - 1];
        }
      }

      const nomParts = (player.parentNomPrenom || "").split(" ");
      const parentNom = nomParts[0] || "";
      const parentPrenom = nomParts.slice(1).join(" ") || "";
      
      const proofUrls = extractPhotoUrlsFromRemark(payment.remarque);
      const proofBase64List: string[] = [];
      for (const proofUrl of proofUrls) {
        try {
          const res = await fetch(proofUrl);
          const blob = await res.blob();
          const b64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (b64) proofBase64List.push(b64);
        } catch (e) {
          console.warn("Erreur lors de la récupération de la preuve", proofUrl, e);
        }
      }
      
      // Extraire le total des rubriques depuis la remarque du paiement
      const totalRubriquesMatch = payment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      const totalRubriques = totalRubriquesMatch ? parseFloat(totalRubriquesMatch[1]) : undefined;
      const playerAllPayments = payments.filter((p) => p.playerId === payment.playerId);
      
      const receiptBase64 = await generateReceiptPDFBase64(
        player,
        [targetPayment],
        parentNom,
        parentPrenom,
        player.parentTelephone || player.telephone || "",
        player.parentEmail || player.email || "",
        player.parentAdresse || player.adresse || "",
        proofBase64List,
        false,
        totalRubriques,
        playerAllPayments
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
      const receiptNo = `RP-FCTORO-${String(targetPayment.id).slice(0, 10).toUpperCase()}`;
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
      // Si c'est une ligne cumulative avec des versements, cibler le dernier versement
      let targetPayment = payment;
      const pid = String(payment.id || "");
      const isSpecificTx = pid.endsWith("-init") || pid.includes("-v");
      const hasVersements = /\[VERSEMENT:[^\]]+\]/i.test(String(payment.remarque || ""));
      if (!isSpecificTx && hasVersements) {
        const decomposed = decomposePaymentTransactions([payment], [player]);
        if (decomposed.length > 0) {
          targetPayment = decomposed[decomposed.length - 1];
        }
      }

      const nomParts = (player.parentNomPrenom || "").split(" ");
      const parentNom = nomParts[0] || "";
      const parentPrenom = nomParts.slice(1).join(" ") || "";
      
      const proofUrls = extractPhotoUrlsFromRemark(payment.remarque);
      const proofBase64List: string[] = [];
      for (const proofUrl of proofUrls) {
        try {
          const res = await fetch(proofUrl);
          const blob = await res.blob();
          const b64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (b64) proofBase64List.push(b64);
        } catch (e) {
          console.warn("Erreur lors de la récupération de la preuve", proofUrl, e);
        }
      }
      
      // Extraire le total des rubriques depuis la remarque du paiement
      const totalRubriquesMatch = payment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      const totalRubriques = totalRubriquesMatch ? parseFloat(totalRubriquesMatch[1]) : undefined;
      const playerAllPayments = payments.filter((p) => p.playerId === payment.playerId);
      
      const receiptBase64 = await generateReceiptPDFBase64(
        player,
        [targetPayment],
        parentNom,
        parentPrenom,
        player.parentTelephone || player.telephone || "",
        player.parentEmail || player.email || "",
        player.parentAdresse || player.adresse || "",
        proofBase64List,
        true,
        totalRubriques,
        playerAllPayments
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

  const handlePrintPlayerHistory = async (
    player: (typeof players)[number],
    playerPayments: (typeof payments),
    metrics?: { totalUSD?: number; totalHTG?: number; count?: number; totalDue?: string; balance?: string; balanceNum?: number },
    contextTitle?: string
  ) => {
    if (!player || playerPayments.length === 0) return;
    try {
      const nomParts = (player.parentNomPrenom || "").split(" ");
      const parentNom = nomParts[0] || "";
      const parentPrenom = nomParts.slice(1).join(" ") || "";

      const historyBase64 = await generatePlayerHistoryPDFBase64(
        player,
        playerPayments,
        parentNom,
        parentPrenom,
        player.parentTelephone || player.telephone || "",
        player.parentEmail || player.email || "",
        player.parentAdresse || player.adresse || "",
        true,
        metrics,
        contextTitle
      );

      const base64Data = historyBase64.includes("base64,") ? historyBase64.split("base64,")[1] : historyBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Erreur lors de l'impression de la fiche financière via iframe", e);
          }
        }, 300);
      };
    } catch (err) {
      console.error("Erreur lors de l'impression de l'historique", err);
      alert("Erreur lors de l'impression de l'historique : " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDownloadPlayerHistoryPDF = async (
    player: (typeof players)[number],
    playerPayments: (typeof payments),
    metrics?: { totalUSD?: number; totalHTG?: number; count?: number; totalDue?: string; balance?: string; balanceNum?: number },
    contextTitle?: string
  ) => {
    if (!player || playerPayments.length === 0) return;
    try {
      const nomParts = (player.parentNomPrenom || "").split(" ");
      const parentNom = nomParts[0] || "";
      const parentPrenom = nomParts.slice(1).join(" ") || "";

      const historyBase64 = await generatePlayerHistoryPDFBase64(
        player,
        playerPayments,
        parentNom,
        parentPrenom,
        player.parentTelephone || player.telephone || "",
        player.parentEmail || player.email || "",
        player.parentAdresse || player.adresse || "",
        false,
        metrics,
        contextTitle
      );

      const base64Data = historyBase64.includes("base64,") ? historyBase64.split("base64,")[1] : historyBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      const safeMatricule = player.matricule || player.id;
      const suffix = contextTitle && contextTitle.includes("PROGRAMME") ? "-PROGRAMME" : "-SAISON";
      link.download = `RELEVE-TRANSACTIONS-${safeMatricule}${suffix}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error("Erreur lors du téléchargement de l'historique", err);
      alert("Erreur lors du téléchargement de l'historique : " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const codeTarget = codeUniqueFilter.trim().toLowerCase();

    const sorted = payments
      .filter((payment) => {
        // Exclure les paiements de programmes spéciaux de la cotisation de saison
        if (payment.remarque && payment.remarque.includes("[PROGRAMME:")) return false;

        if (methodeFilter !== "all") {
          const m = (payment.methode || "").toLowerCase().trim();
          const target = methodeFilter.toLowerCase().trim();
          if (m !== target) return false;
        }
        if (deviseFilter !== "all" && payment.devise !== deviseFilter) return false;

        // Filtrage par période (datePaiement YYYY-MM-DD)
        if (payment.datePaiement) {
          const pDate = payment.datePaiement.split("T")[0];
          if (startDate && pDate < startDate) return false;
          if (endDate && pDate > endDate) return false;
        } else if (startDate || endDate) {
          return false;
        }

        const player = playerMap.get(payment.playerId);
        if (!player) return false;

        const safeMatricule = (player.matricule && !player.matricule.includes("XXXX")
          ? player.matricule
          : generatePlayerMatricule(player.id, player.saison, player.sourceDetection)).toLowerCase();

        // Filtrage spécifique par code unique / matricule
        if (codeTarget) {
          const matchesCode =
            safeMatricule.includes(codeTarget) ||
            String(player.id).toLowerCase().includes(codeTarget) ||
            String(payment.id).toLowerCase().includes(codeTarget);
          if (!matchesCode) return false;
        }

        if (selectedSeason !== "all") {
          const normalizeSeason = (s: string) => String(s || "").replace(/^saison\s*/i, "").trim().toLowerCase();
          const targetSeasonNorm = normalizeSeason(selectedSeason);
          const seasonMatches =
            player.saison === selectedSeason ||
            (player.saison && normalizeSeason(player.saison) === targetSeasonNorm) ||
            (player.saisons && player.saisons.some(s => s === selectedSeason || normalizeSeason(s) === targetSeasonNorm));
          if (!seasonMatches) return false;
        }

        const playerName = getPlayerFullName(player).toLowerCase();
        // Recherche globale par nom, code unique / matricule ou ID
        return !query || playerName.includes(query) || safeMatricule.includes(query) || String(player.id).toLowerCase().includes(query);
      })
      .sort((a, b) => {
        const dateAStr = getLatestPaymentDate(a) || a.datePaiement || "0";
        const dateBStr = getLatestPaymentDate(b) || b.datePaiement || "0";
        const dateA = new Date(dateAStr).getTime();
        const dateB = new Date(dateBStr).getTime();
        if (dateB !== dateA) return dateB - dateA;
        const idA = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
        const idB = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
        return idB - idA;
      });

    // Chaque joueur/dossier n'apparaît strictement qu'une seule fois dans la table principale des paiements
    const seenPlayerIds = new Set<string>();
    const uniquePayments: typeof payments = [];

    for (const payment of sorted) {
      if (!seenPlayerIds.has(payment.playerId)) {
        seenPlayerIds.add(payment.playerId);

        const latestPDate = getLatestPaymentDate(payment) || payment.datePaiement;

        // Si le joueur possède d'autres versements de saison, consolider le montant affiché
        const playerAllP = payments.filter((p) => p.playerId === payment.playerId && !p.remarque?.includes("[PROGRAMME:"));
        if (playerAllP.length > 1) {
          let sumMontant = 0;
          let sumUS = 0;
          let sumHTG = 0;
          for (const item of playerAllP) {
            sumMontant += Number(item.montant) || 0;
            sumUS += Number(item.montantUS) || 0;
            sumHTG += Number(item.montantHTG) || 0;
          }
          uniquePayments.push({
            ...payment,
            datePaiement: latestPDate,
            montant: sumMontant,
            montantUS: sumUS > 0 ? sumUS : payment.montantUS,
            montantHTG: sumHTG > 0 ? sumHTG : payment.montantHTG,
          });
        } else {
          uniquePayments.push({
            ...payment,
            datePaiement: latestPDate,
          });
        }
      }
    }

    return uniquePayments;
  }, [payments, playerMap, searchQuery, codeUniqueFilter, startDate, endDate, methodeFilter, deviseFilter, selectedSeason]);

  // Helper pour extraire le nom du programme depuis la remarque
  const getProgrammeNameFromRemark = (remarque?: string) => {
    const m = (remarque || "").match(/\[PROGRAMME:\s*([^\]]+)\]/i);
    return m ? m[1].trim() : "Programme spécifique";
  };

  const getCleanDescriptionForProgramme = (remarque?: string) => {
    if (!remarque) return "-";
    let cleaned = remarque.replace(/\[.*?\]\s*/g, "").trim();
    cleaned = cleaned.replace(/Programme:\s*[^\s|]+/gi, "").trim();
    cleaned = cleaned.replace(/Rubriques:\s*/gi, "").trim();
    return cleaned || "-";
  };

  // Mode de paiement lisible
  const mapModeStr = (m: any) => {
    const s = String(m || "").toLowerCase().trim();
    if (s === "1" || s.includes("espece") || s.includes("espèce")) return "Espèces";
    if (s === "2" || s.includes("virement")) return "Virement";
    if (s === "3" || s.includes("cheque") || s.includes("chèque")) return "Chèque";
    if (s === "4" || s.includes("carte")) return "Carte";
    if (s === "5" || s.includes("depot") || s.includes("dépôt")) return "Dépôt bancaire";
    return String(m || "Espèces");
  };

  // Liste de TOUS les paiements de programmes spéciaux
  const allProgrammePayments = useMemo(() => {
    return payments.filter((p) => (p.remarque || "").includes("[PROGRAMME:"));
  }, [payments]);

  // Liste de tous les programmes créés ou présents dans les paiements
  const availableProgrammes = useMemo(() => {
    const set = new Set<string>();
    programmesList.forEach((p) => {
      if (p.nom) set.add(p.nom);
    });
    allProgrammePayments.forEach((p) => {
      const name = getProgrammeNameFromRemark(p.remarque);
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [programmesList, allProgrammePayments]);

  // Joueurs inscrits ou ayant payé pour le programme actuellement sélectionné
  const selectedProgrammeParticipants = useMemo(() => {
    if (selectedProgrammeFilter === "all") return [];
    const prog = programmesList.find(
      (p) => (p.nom || "").toLowerCase().trim() === selectedProgrammeFilter.toLowerCase().trim()
    );
    const enrolledSet = new Set<string>();
    (prog?.joueurs || []).forEach((id) => enrolledSet.add(String(id).trim()));
    allProgrammePayments.forEach((p) => {
      const pProg = getProgrammeNameFromRemark(p.remarque);
      if (pProg.toLowerCase().trim() === selectedProgrammeFilter.toLowerCase().trim()) {
        enrolledSet.add(String(p.playerId).trim());
      }
    });
    return players
      .filter((pl) => enrolledSet.has(String(pl.id).trim()))
      .sort((a, b) => getPlayerFullName(a).localeCompare(getPlayerFullName(b)));
  }, [selectedProgrammeFilter, programmesList, allProgrammePayments, players]);

  // Paiements filtrés pour l'onglet Programmes Spéciaux
  const filteredProgrammePayments = useMemo(() => {
    return allProgrammePayments
      .filter((p) => {
        if (selectedProgrammeFilter !== "all") {
          const prog = getProgrammeNameFromRemark(p.remarque).toLowerCase();
          if (prog !== selectedProgrammeFilter.toLowerCase()) return false;
        }
        if (methodeFilter !== "all") {
          const m = (p.methode || "").toLowerCase().trim();
          if (m !== methodeFilter.toLowerCase().trim()) return false;
        }
        if (deviseFilter !== "all" && p.devise !== deviseFilter) return false;
        if (startDate || endDate) {
          const pDate = p.datePaiement ? p.datePaiement.split("T")[0] : "";
          if (startDate && pDate < startDate) return false;
          if (endDate && pDate > endDate) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const pl = playerMap.get(p.playerId);
          const plName = pl ? getPlayerFullName(pl).toLowerCase() : "";
          const matricule = (pl?.matricule || "").toLowerCase();
          if (!plName.includes(q) && !matricule.includes(q) && !String(p.id).toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.datePaiement || 0).getTime() - new Date(a.datePaiement || 0).getTime());
  }, [allProgrammePayments, selectedProgrammeFilter, methodeFilter, deviseFilter, startDate, endDate, searchQuery, playerMap]);

  // Métriques financières pour le programme affiché
  const programmeMetrics = useMemo(() => {
    let totalUSD = 0;
    let totalHTG = 0;
    const playersSet = new Set<string>();

    filteredProgrammePayments.forEach((p) => {
      playersSet.add(p.playerId);
      if (p.devise === "HTG") {
        totalHTG += Number(p.montant) || 0;
      } else {
        totalUSD += Number(p.montant) || 0;
      }
    });

    return {
      totalUSD,
      totalHTG,
      count: filteredProgrammePayments.length,
      uniquePlayersCount: playersSet.size,
    };
  }, [filteredProgrammePayments]);

  // Pagination pour l'onglet Programmes Spéciaux
  const progTotalPages = Math.max(1, Math.ceil(filteredProgrammePayments.length / progCurrentPageSize));
  const progCurrentPageSafe = Math.min(progCurrentPage, progTotalPages);
  const paginatedProgrammePayments = useMemo(() => {
    const start = (progCurrentPageSafe - 1) * progCurrentPageSize;
    return filteredProgrammePayments.slice(start, start + progCurrentPageSize);
  }, [filteredProgrammePayments, progCurrentPageSafe, progCurrentPageSize]);

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

  const historyPlayer = useMemo(() => {
    return historyPlayerId ? playerMap.get(historyPlayerId) : null;
  }, [historyPlayerId, playerMap]);

  const historyPlayerPayments = useMemo(() => {
    if (!historyPlayerId) return [];
    const directPayments = payments
      .filter((p) => p.playerId === historyPlayerId)
      .sort((a, b) => {
        const dateA = new Date(a.datePaiement || 0).getTime();
        const dateB = new Date(b.datePaiement || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        const idA = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
        const idB = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
        return idB - idA;
      });

    // Décomposer également les versements archivés dans les remarques si présent
    const allTransactions: Array<(typeof payments)[number]> = [];

    directPayments.forEach((p) => {
      const remark = p.remarque || "";
      const versementRegex = /\[VERSEMENT:\s*([\d.]+)_([A-Za-z]+)(?:_TAUX:([\d.]+))?(?:_USD:([\d.]+))?_DATE:(\d{4}-\d{2}-\d{2})\]/gi;
      const soldeHtgRegex = /\[SOLDE_HTG:\s*([\d.]+)_TAUX:\s*([\d.]+)_USD:\s*([\d.]+)\]/gi;

      const versementMatches = [...remark.matchAll(versementRegex)];
      const soldeHtgMatches = [...remark.matchAll(soldeHtgRegex)];

      if (versementMatches.length === 0 && soldeHtgMatches.length === 0) {
        allTransactions.push(p);
        return;
      }

      let sumVersementsUSD = 0;
      let sumVersementsHTG = 0;

      const progMatch = remark.match(/\[PROGRAMME:\s*([^\]]+)\]/i);
      const progTag = progMatch ? ` [PROGRAMME:${progMatch[1]}]` : "";

      versementMatches.forEach((m, idx) => {
        const amt = parseFloat(m[1]) || 0;
        const devRaw = (m[2] || "US").toUpperCase();
        const dev: "US" | "HTG" = devRaw.includes("HTG") ? "HTG" : "US";
        const taux = m[3] ? parseFloat(m[3]) : (p.taux || 0);
        const amtUSD = m[4] ? parseFloat(m[4]) : (dev === "HTG" && taux > 0 ? amt / taux : amt);
        const amtHTG = dev === "HTG" ? amt : (taux > 0 ? amt * taux : 0);
        const vDate = m[5] || p.datePaiement || "";

        if (dev === "HTG") {
          sumVersementsHTG += amt;
        } else {
          sumVersementsUSD += amt;
        }

        allTransactions.push({
          ...p,
          id: `${p.id}-v${idx + 1}`,
          montant: amt,
          montantUS: amtUSD,
          montantHTG: amtHTG,
          devise: dev,
          taux: taux > 0 ? taux : undefined,
          datePaiement: vDate,
          remarque: `Versement solde #${idx + 1} (${formatClubDate(vDate)})${progTag}`,
        });
      });

      if (versementMatches.length === 0 && soldeHtgMatches.length > 0) {
        soldeHtgMatches.forEach((m, idx) => {
          const amtHTG = parseFloat(m[1]) || 0;
          const taux = parseFloat(m[2]) || p.taux || 0;
          const amtUSD = parseFloat(m[3]) || (taux > 0 ? amtHTG / taux : 0);
          const vDate = p.datePaiement || "";

          sumVersementsHTG += amtHTG;
          sumVersementsUSD += amtUSD;

          allTransactions.push({
            ...p,
            id: `${p.id}-solde-htg-${idx + 1}`,
            montant: amtHTG,
            montantUS: amtUSD,
            montantHTG: amtHTG,
            devise: "HTG",
            taux: taux > 0 ? taux : undefined,
            datePaiement: vDate,
            remarque: `Versement solde HTG #${idx + 1} (${formatClubDate(vDate)})${progTag}`,
          });
        });
      }

      // Reconstituer le paiement initial (déduction des versements ultérieurs du total cumulé)
      const initialDateMatch = remark.match(/\[DATE_INITIALE:(\d{4}-\d{2}-\d{2})\]/i);
      const playerObj = playerMap.get(p.playerId);
      const initialDate = initialDateMatch ? initialDateMatch[1] : (playerObj?.dateInscription ? playerObj.dateInscription.split("T")[0] : (p.datePaiement || ""));

      const totalUS = Number(p.montantUS) || (p.devise === "HTG" && p.taux ? p.montant / p.taux : Number(p.montant) || 0);
      const totalHTG = Number(p.montantHTG) || (p.devise === "HTG" ? Number(p.montant) || 0 : 0);

      const initialUS = Math.max(0, totalUS - sumVersementsUSD);
      const initialHTG = Math.max(0, totalHTG - sumVersementsHTG);
      const initialPrimary = p.devise === "HTG"
        ? initialHTG
        : (initialUS > 0 ? initialUS : (p.taux ? initialHTG / p.taux : (initialHTG > 0 ? initialHTG / 130 : 0)));

      if (initialPrimary > 0 || (initialUS === 0 && initialHTG === 0 && versementMatches.length === 0)) {
        allTransactions.push({
          ...p,
          id: `${p.id}-init`,
          montant: initialPrimary > 0 ? Number(initialPrimary.toFixed(2)) : p.montant,
          montantUS: initialUS > 0 ? Number(initialUS.toFixed(2)) : p.montantUS,
          montantHTG: initialHTG > 0 ? Math.round(initialHTG) : p.montantHTG,
          datePaiement: initialDate,
          remarque: (p.remarque || "")
            .replace(/\[VERSEMENT:[^\]]+\]/gi, "")
            .replace(/\[DERNIER_VERSEMENT:[^\]]+\]/gi, "")
            .replace(/\[SOLDE_HTG:[^\]]+\]/gi, "")
            .replace(/\[DATE_INITIALE:[^\]]+\]/gi, "")
            .trim() || "Paiement initial",
        });
      }
    });

    return allTransactions.sort((a, b) => {
      const dateA = new Date(a.datePaiement || 0).getTime();
      const dateB = new Date(b.datePaiement || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      const idA = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
      const idB = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
      return idB - idA;
    });
  }, [historyPlayerId, payments, playerMap]);

  const historySeasonPayments = useMemo(() => {
    return historyPlayerPayments.filter((p) => !p.remarque || !p.remarque.includes("[PROGRAMME:"));
  }, [historyPlayerPayments]);

  const historyAllProgrammePayments = useMemo(() => {
    return historyPlayerPayments.filter((p) => (p.remarque || "").includes("[PROGRAMME:"));
  }, [historyPlayerPayments]);

  const historyPlayerProgrammesList = useMemo(() => {
    const set = new Set<string>();
    historyAllProgrammePayments.forEach((p) => {
      const prog = getProgrammeNameFromRemark(p.remarque);
      if (prog) set.add(prog);
    });
    return Array.from(set).sort();
  }, [historyAllProgrammePayments]);

  const historyFilteredProgrammePayments = useMemo(() => {
    if (historySelectedProgramme === "all") return historyAllProgrammePayments;
    return historyAllProgrammePayments.filter((p) => {
      const prog = getProgrammeNameFromRemark(p.remarque);
      return prog.toLowerCase().trim() === historySelectedProgramme.toLowerCase().trim();
    });
  }, [historyAllProgrammePayments, historySelectedProgramme]);

  const activeHistoryPayments = useMemo(() => {
    if (historyTab === "saison") return historySeasonPayments;
    return historyFilteredProgrammePayments;
  }, [historyTab, historySeasonPayments, historyFilteredProgrammePayments]);

  const seasonHistoryMetrics = useMemo(() => {
    if (!historySeasonPayments.length) {
      return {
        totalUSD: 0,
        totalHTG: 0,
        count: 0,
        totalDue: "-",
        balance: "0",
        balanceNum: 0,
      };
    }

    let totalUSD = 0;
    let totalHTG = 0;
    historySeasonPayments.forEach((p) => {
      const amt = Number(p.montant) || 0;
      if (p.devise === "HTG") {
        totalHTG += amt;
      } else {
        totalUSD += amt;
      }
    });

    const latestPayment = historySeasonPayments[0];
    const b = calculateBalance(latestPayment);
    const totalDueMarker = latestPayment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i)?.[1];

    let totalDueStr = "-";
    if (totalDueMarker) {
      totalDueStr = formatClubCurrency(parseFloat(totalDueMarker), "US");
    } else if (b.isSpecial && b.balance > 0) {
      totalDueStr = formatClubCurrency(b.balance + (latestPayment.montant || 0), b.devise);
    }

    let balanceStr = "À jour (0)";
    if (b.balance > 0) {
      balanceStr = `${formatClubCurrency(b.balance, b.devise)}${b.moisRestants !== undefined ? ` (${b.moisRestants} mois restants)` : ""}`;
    } else if (b.balance < 0) {
      balanceStr = `Trop-perçu: ${formatClubCurrency(Math.abs(b.balance), b.devise)}`;
    } else if (b.moisRestants === 0) {
      balanceStr = "Soldé (12/12 mois)";
    }

    return {
      totalUSD,
      totalHTG,
      count: historySeasonPayments.length,
      totalDue: totalDueStr,
      balance: balanceStr,
      balanceNum: b.balance,
    };
  }, [historySeasonPayments, calculateBalance]);

  const programmeHistoryMetrics = useMemo(() => {
    if (!historyFilteredProgrammePayments.length) {
      return {
        totalUSD: 0,
        totalHTG: 0,
        count: 0,
        totalDue: "-",
        balance: "0",
        balanceNum: 0,
      };
    }

    let totalUSD = 0;
    let totalHTG = 0;
    let totalDueNum = 0;
    let explicitDueFound = false;

    historyFilteredProgrammePayments.forEach((p) => {
      const amt = Number(p.montant) || 0;
      if (p.devise === "HTG") {
        totalHTG += amt;
      } else {
        totalUSD += amt;
      }
      const dueMatch = p.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      if (dueMatch && !explicitDueFound) {
        totalDueNum = parseFloat(dueMatch[1]);
        explicitDueFound = true;
      }
    });

    if (totalDueNum === 0) totalDueNum = totalUSD;
    const balanceNum = Math.max(0, totalDueNum - totalUSD);
    const balanceStr = balanceNum > 0 ? formatClubCurrency(balanceNum, "US") : "À jour (0.00)";

    return {
      totalUSD,
      totalHTG,
      count: historyFilteredProgrammePayments.length,
      totalDue: formatClubCurrency(totalDueNum, "US"),
      balance: balanceStr,
      balanceNum,
    };
  }, [historyFilteredProgrammePayments]);

  const activeHistoryMetrics = useMemo(() => {
    return historyTab === "saison" ? seasonHistoryMetrics : programmeHistoryMetrics;
  }, [historyTab, seasonHistoryMetrics, programmeHistoryMetrics]);

  const activeHistoryTitle = useMemo(() => {
    if (historyTab === "saison") return "COTISATIONS DE SAISON";
    if (historySelectedProgramme === "all") return "PROGRAMMES SPÉCIAUX & TOURNOIS";
    return `PROGRAMME : ${historySelectedProgramme}`;
  }, [historyTab, historySelectedProgramme]);

  // Alias for backward compatibility
  const historyMetrics = activeHistoryMetrics;

  const getPaymentPlanLabel = (remark?: string) => {
    const remarkLower = (remark || "").toLowerCase();
    const moisMatch = remark?.match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || remark?.match(/(\d+)\s*mois/i);
    const restantsMatch = remark?.match(/\[MOIS_RESTANTS:\s*(\d+)\s*\]/i);
    const mois = moisMatch ? moisMatch[1] : null;

    if (remarkLower.includes("demi")) {
      return mois ? `Demi-bourse (${mois}/12 mois)` : "Demi-bourse (50%)";
    }

    if (remarkLower.includes("boursier") || remarkLower.includes("[plan:boursier]")) {
      return "Bourse (Montant défini)";
    }

    const isKitOnly = !remarkLower.includes("adhésion") && !remarkLower.includes("adhesion");
    if (isKitOnly) return "Aucun";
    
    return remark?.match(/\[PLAN:\s*(ANNUEL|SEMESTRIEL|MENSUEL)\]/i)?.[1] ||
      remark?.match(/plan\s*:\s*(annuel|semestriel|mensuel)/i)?.[1] ||
      "Aucun";
  };

  const getPaymentStatusLabel = (payment: (typeof payments)[number]) => {
    const b = calculateBalance(payment);
    if (b.isSpecial && b.moisRestants !== undefined) {
      return b.moisRestants === 0 ? "Soldé" : "En cours";
    }
    const marker = payment.remarque?.match(/\[STATUT:\s*(PAID|PENDING|LATE)\]/i)?.[1];
    const s = (marker?.toLowerCase() || payment.statut || "").toLowerCase();
    if (s === "paid") return "Payé";
    if (s === "pending") return "En attente";
    if (s === "late") return "En retard";
    return marker || payment.statut || "-";
  };



  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPayments = filteredPayments.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  const getExportDataRows = () => {
    return filteredPayments.map((payment) => {
      const player = playerMap.get(payment.playerId);
      const playerName = player ? getPlayerFullName(player) : "Joueur Inconnu";
      const playerMatricule = player?.matricule || "-";
      const playerCategory = player?.categorie || "-";

      const devise = (payment.devise || "US") as "US" | "HTG";
      const deviseVersement = devise === "HTG" ? "HTG" : "USD";
      const montantPaid = typeof payment.montant === "number" ? payment.montant : (parseFloat(payment.montant) || 0);

      const b = calculateBalance(payment);
      const totalDueUSD = payment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i)?.[1];
      
      let totalDueNum: number | "" = "";
      let totalDueDevise = deviseVersement;
      if (totalDueUSD) {
        totalDueNum = parseFloat(totalDueUSD);
        totalDueDevise = "USD";
      } else if (b.isSpecial && b.balance > 0) {
        totalDueNum = Math.round((b.balance + (Number(payment.montant) || 0)) * 100) / 100;
        totalDueDevise = b.devise === "HTG" ? "HTG" : "USD";
      }

      const balanceNum = typeof b.balance === "number" ? Math.round(b.balance * 100) / 100 : 0;
      const balanceDevise = b.devise === "HTG" ? "HTG" : "USD";
      const moisRestantsNum = b.moisRestants !== undefined ? b.moisRestants : 0;
      const statutReglement = b.balance > 0 ? "Solde dû" : (b.balance < 0 ? "Trop-perçu" : "À jour");

      const planLabel = getPaymentPlanLabel(payment.remarque);
      const moisMatch = payment.remarque?.match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || payment.remarque?.match(/(\d+)\s*mois/i);
      const moisPayes = moisMatch && moisMatch[1] ? parseInt(moisMatch[1], 10) : (planLabel.includes("Mensuel") ? 1 : 0);

      let cleanRubriques = (payment.remarque || "")
        .replace(/\[.*?\]\s*/g, '')
        .replace(/\s*\|\s*/g, ' - ')
        .replace(/Rubriques\s*:\s*/gi, '')
        .trim();
      if (!cleanRubriques) cleanRubriques = (payment as any).description || "Cotisation";

      const mapModeStr = (m: any) => {
        const s = String(m || "").toLowerCase().trim();
        if (s === "1" || s.includes("espece") || s.includes("espèce")) return "Espèces";
        if (s === "2" || s.includes("virement")) return "Virement";
        if (s === "3" || s.includes("cheque") || s.includes("chèque")) return "Chèque";
        if (s === "4" || s.includes("carte")) return "Carte";
        if (s === "5" || s.includes("depot") || s.includes("dépôt")) return "Dépôt bancaire";
        return String(m || "Espèces");
      };

      // Historique et cumul pour ce joueur
      const playerAllPayments = payments
        .filter((p) => p.playerId === payment.playerId)
        .sort((a, b) => new Date(a.datePaiement || 0).getTime() - new Date(b.datePaiement || 0).getTime());

      const playerCumulUSD = Math.round(
        playerAllPayments
          .filter((p) => (p.devise || "US") === "US")
          .reduce((sum, p) => sum + (Number(p.montant) || 0), 0) * 100
      ) / 100;

      const playerCumulHTG = Math.round(
        playerAllPayments
          .filter((p) => p.devise === "HTG")
          .reduce((sum, p) => sum + (Number(p.montant) || 0), 0) * 100
      ) / 100;

      const playerHistorySummary = playerAllPayments
        .map((p) => {
          const d = p.datePaiement ? formatClubDate(p.datePaiement) : "N/D";
          const dev = (p.devise || "US") === "US" ? "USD" : "HTG";
          return `[${d}: ${p.montant} ${dev} (${mapModeStr(p.methode)})]`;
        })
        .join(" | ");

      const photoMatches = extractPhotoUrlsFromRemark(payment.remarque);
      const justificatifs = photoMatches.length > 0 ? `Oui (${photoMatches.length} pièce(s))` : "Non";

      // Extraction rabais
      const rabaisMatch = payment.remarque?.match(/\[RABAIS:\s*(\d+)%?\]/i) || payment.remarque?.match(/\[REDUCTION_PERCENT:\s*(\d+)\]/i);
      let rabaisPctNum = 0;
      if (rabaisMatch && rabaisMatch[1]) {
        rabaisPctNum = parseInt(rabaisMatch[1], 10);
      } else if ((payment.remarque || "").toLowerCase().includes("[reduction:half]") || (payment.remarque || "").toLowerCase().includes("demi")) {
        rabaisPctNum = 50;
      } else if ((payment.remarque || "").toLowerCase().includes("[reduction:full]") || (payment.remarque || "").toLowerCase().includes("bourse")) {
        rabaisPctNum = 100;
      } else if (planLabel.toLowerCase().includes("annuel")) {
        rabaisPctNum = 10;
      } else if (planLabel.toLowerCase().includes("semestriel")) {
        rabaisPctNum = 5;
      }

      return [
        playerMatricule,
        playerName,
        playerCategory,
        planLabel,
        rabaisPctNum,
        cleanRubriques,
        moisPayes > 0 ? `${moisPayes} mois` : "-",
        montantPaid,
        deviseVersement,
        payment.taux ? Number(payment.taux) : "",
        totalDueNum,
        totalDueDevise,
        balanceNum,
        balanceDevise,
        moisRestantsNum,
        statutReglement,
        mapModeStr(payment.methode),
        payment.datePaiement ? formatClubDate(payment.datePaiement) : "-",
        playerCumulUSD,
        playerCumulHTG,
        playerAllPayments.length,
        playerHistorySummary,
        justificatifs,
      ];
    });
  };

  const exportHeaders = [
    "Matricule",
    "Joueur (Nom & Prénom)",
    "Catégorie",
    "Plan de Règlement",
    "Rabais (%)",
    "Articles / Rubriques Payés (Reçu)",
    "Nbre Mois Payés",
    "Montant Versé",
    "Devise Versement",
    "Taux de Change",
    "Montant Total Dû (Dossier)",
    "Devise Total Dû",
    "Solde Restant Dû (Balance)",
    "Devise Solde",
    "Mois Restants",
    "Statut Règlement",
    "Mode de Paiement",
    "Date du Paiement",
    "Cumul Payé Joueur (USD)",
    "Cumul Payé Joueur (HTG)",
    "Nbre Total de Versements",
    "Historique des Versements Joueur",
    "Justificatif Joint",
  ];

  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des paiements au format CSV ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
        let csvContent = exportHeaders.map((h) => `"${h}"`).join(",") + "\n";
        const rows = getExportDataRows();
        rows.forEach((row) => {
          const csvRow = row.map((field) => {
            if (typeof field === "number") return String(field);
            return `"${(field ?? "").toString().replace(/"/g, '""')}"`;
          });
          csvContent += csvRow.join(",") + "\n";
        });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `paiements_fc_toro_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
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
        const rows = getExportDataRows();

        const thead = exportHeaders.map((h) => `<th>${h}</th>`).join("");
        const tbody = rows
          .map((row) => {
            return `<tr>${row
              .map((field) => {
                if (typeof field === "number") {
                  return `<td style="text-align: right;" align="right">${field}</td>`;
                }
                return `<td>${(field ?? "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`;
              })
              .join("")}</tr>`;
          })
          .join("");

        const htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8" />
            <style>
              table { border-collapse: collapse; }
              td, th { border: 1px solid #dddddd; padding: 4px; }
              th { background-color: #f2f2f2; font-weight: bold; }
            </style>
          </head>
          <body>
            <table>
              <thead><tr>${thead}</tr></thead>
              <tbody>${tbody}</tbody>
            </table>
          </body>
          </html>
        `;

        const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `paiements_fc_toro_${new Date().toISOString().slice(0, 10)}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    });
  };

  const exportProgHeaders = [
    "Matricule",
    "Joueur (Nom & Prénom)",
    "Catégorie",
    "Programme",
    "Articles / Rubriques Payés",
    "Montant Versé",
    "Devise",
    "Taux de Change",
    "Mode de Paiement",
    "Date du Paiement",
    "Statut",
    "Justificatif Joint",
    "Remarque Complète",
  ];

  const getExportDataRowsForProgrammes = () => {
    return filteredProgrammePayments.map((p) => {
      const player = playerMap.get(p.playerId);
      const safeMatricule = player?.matricule || "";
      const playerName = player ? getPlayerFullName(player) : "Joueur inconnu";
      const cat = player?.categorie || "-";
      const progName = getProgrammeNameFromRemark(p.remarque);
      const cleanDesc = getCleanDescriptionForProgramme(p.remarque);
      const proofUrls = extractPhotoUrlsFromRemark(p.remarque);
      const hasProof = proofUrls.length > 0 ? `Oui (${proofUrls.length})` : "Non";
      return [
        safeMatricule,
        playerName,
        cat,
        progName,
        cleanDesc,
        p.montant,
        p.devise || "US",
        p.taux || "",
        mapModeStr(p.methode),
        p.datePaiement ? formatClubDate(p.datePaiement) : "-",
        p.statut === "paid" ? "Payé" : p.statut === "pending" ? "En attente" : "En retard",
        hasProof,
        p.remarque || "",
      ];
    });
  };

  const handleExportProgrammeCSV = () => {
    setIsProgExportOpen(false);
    confirm({
      title: "Exporter les paiements de programmes",
      message: "Voulez-vous exporter cette liste de paiements de programmes au format CSV ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
        let csvContent = exportProgHeaders.map((h) => `"${h}"`).join(",") + "\n";
        const rows = getExportDataRowsForProgrammes();
        rows.forEach((row) => {
          const csvRow = row.map((field) => {
            if (typeof field === "number") return String(field);
            return `"${(field ?? "").toString().replace(/"/g, '""')}"`;
          });
          csvContent += csvRow.join(",") + "\n";
        });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `paiements_programmes_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    });
  };

  const handleExportProgrammeExcel = () => {
    setIsProgExportOpen(false);
    confirm({
      title: "Exporter les paiements de programmes",
      message: "Voulez-vous exporter cette liste de paiements de programmes au format Excel ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
        const rows = getExportDataRowsForProgrammes();
        const thead = exportProgHeaders.map((h) => `<th>${h}</th>`).join("");
        const tbody = rows
          .map((row) => {
            return `<tr>${row
              .map((field) => {
                if (typeof field === "number") {
                  return `<td style="text-align: right;" align="right">${field}</td>`;
                }
                return `<td>${(field ?? "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`;
              })
              .join("")}</tr>`;
          })
          .join("");

        const htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8" />
            <style>
              table { border-collapse: collapse; }
              td, th { border: 1px solid #dddddd; padding: 4px; }
              th { background-color: #f2f2f2; font-weight: bold; }
            </style>
          </head>
          <body>
            <table>
              <thead><tr>${thead}</tr></thead>
              <tbody>${tbody}</tbody>
            </table>
          </body>
          </html>
        `;

        const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `paiements_programmes_${new Date().toISOString().slice(0, 10)}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    });
  };

  return (
    <div className="space-y-4">
      <PageBreadcrumb pageTitle="Paiements" />

      {/* Sélecteur d'onglets Corporate : Saison vs Programmes Spéciaux */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
        <div className="inline-flex p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("saison")}
            className={`inline-flex items-center gap-2.5 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "saison"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <svg
              className={`size-4.5 shrink-0 transition-colors ${activeTab === "saison" ? "text-brand-500" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Cotisations de Saison</span>
            <span
              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                activeTab === "saison"
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400"
                  : "bg-gray-200/80 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {payments.filter((p) => !p.remarque || !p.remarque.includes("[PROGRAMME:")).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("programmes")}
            className={`inline-flex items-center gap-2.5 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "programmes"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <svg
              className={`size-4.5 shrink-0 transition-colors ${activeTab === "programmes" ? "text-amber-500" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15a6 6 0 006-6V4H6v5a6 6 0 006 6zm0 0v4m-4 0h8M4 6H2v3a4 4 0 004 4h.34M20 6h2v3a4 4 0 01-4 4h-.34" />
            </svg>
            <span>Programmes Spéciaux & Tournois</span>
            <span
              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                activeTab === "programmes"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                  : "bg-gray-200/80 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {allProgrammePayments.length}
            </span>
          </button>
        </div>

        {activeTab === "programmes" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const targetProg =
                  selectedProgrammeFilter !== "all"
                    ? selectedProgrammeFilter
                    : availableProgrammes[0] || (programmesList[0]?.nom ?? "");
                setModalProgrammeNom(targetProg);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-theme-xs hover:bg-brand-600 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Nouveau paiement programme</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === "saison" && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] space-y-3">
        {/* Ligne 1: Recherche globale, Code Unique, Méthode, Devise, Saison */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Rechercher un joueur
            </label>
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Nom du joueur..."
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Code Unique / Matricule
            </label>
            <div className="relative">
              <input
                value={codeUniqueFilter}
                onChange={(event) => {
                  setCodeUniqueFilter(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Ex: FCT-2627-..."
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              {codeUniqueFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setCodeUniqueFilter("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Mode de paiement
            </label>
            <select
              value={methodeFilter}
              onChange={(event) => {
                setMethodeFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Tous les modes</option>
              <option value="especes">Cash / Espèces</option>
              <option value="virement">Virement bancaire</option>
              <option value="mobile">MonCash / Mobile</option>
              <option value="cheque">Chèque</option>
              <option value="carte">Carte bancaire</option>
              <option value="depot">Dépôt bancaire</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Devise
            </label>
            <select
              value={deviseFilter}
              onChange={(event) => {
                setDeviseFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes devises</option>
              <option value="US">USD</option>
              <option value="HTG">HTG</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Saison
            </label>
            <select
              value={selectedSeason}
              onChange={(event) => {
                setSelectedSeason(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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

        {/* Ligne 2: Filtrage par Période (Date début - Date fin) + Bouton action */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Période :
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">Du</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">Au</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium px-2 py-1 rounded bg-red-50 dark:bg-red-950/30"
              >
                Effacer dates
              </button>
            )}

            {(searchQuery || codeUniqueFilter || startDate || endDate || methodeFilter !== "all" || deviseFilter !== "all" || selectedSeason !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCodeUniqueFilter("");
                  setStartDate("");
                  setEndDate("");
                  setMethodeFilter("all");
                  setDeviseFilter("all");
                  setSelectedSeason("all");
                  setCurrentPage(1);
                }}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
              >
                Réinitialiser tous les filtres
              </button>
            )}
          </div>

          <div className="shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white shadow-theme-xs hover:bg-brand-600 cursor-pointer"
            >
              + Ajouter un paiement
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Paiements
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredPayments.length === payments.length
                ? `${payments.length} paiement(s)`
                : `${filteredPayments.length} sur ${payments.length} paiement(s)`}
              {filteredPayments.length !== payments.length && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCodeUniqueFilter("");
                    setStartDate("");
                    setEndDate("");
                    setMethodeFilter("all");
                    setDeviseFilter("all");
                    setSelectedSeason("all");
                    setCurrentPage(1);
                  }}
                  className="ml-2 text-xs text-brand-500 hover:underline font-medium"
                >
                  (Afficher tous les {payments.length} paiements)
                </button>
              )}
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
              {!hydrated && payments.length === 0 ? (
                <TableBodySkeleton rows={10} columns={4} />
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
                        <div className="flex flex-col">
                          <span className="font-semibold">{getPlayerFullName(player)}</span>
                          <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 font-medium">
                            {player.matricule && !player.matricule.includes("XXXX")
                              ? player.matricule
                              : generatePlayerMatricule(player.id, player.saison, player.sourceDetection)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-300 font-medium">
                        {(() => {
                          const latestDate = payment.datePaiement || getLatestPaymentDate(payment);
                          return latestDate ? formatClubDate(latestDate) : "-";
                        })()}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatClubCurrency(payment.montant, payment.devise)}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium capitalize">
                            {payment.methode === "especes" ? "Cash / Espèces" :
                             payment.methode === "virement" ? "Virement bancaire" :
                             payment.methode === "depot" ? "Dépôt bancaire" :
                             payment.methode === "mobile" ? "MonCash / Mobile" :
                             payment.methode === "cheque" ? "Chèque" :
                             payment.methode === "carte" ? "Carte bancaire" :
                             payment.methode || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm">
                        {balance.balance > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-error-600 dark:text-error-400">
                              {formatClubCurrency(balance.balance, balance.devise)} à payer
                            </span>
                            {balance.moisRestants !== undefined && balance.moisRestants > 0 && (
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                ({balance.moisRestants} mois restant{balance.moisRestants > 1 ? "s" : ""})
                              </span>
                            )}
                          </div>
                        ) : balance.moisRestants !== undefined && balance.moisRestants === 0 ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Soldé (12/12 mois)
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
                          const photoUrls = extractPhotoUrlsFromRemark(payment.remarque);
                          if (photoUrls.length === 0) return <span className="text-gray-400">-</span>;
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {photoUrls.map((url, idx) => {
                                const isPdf = isPdfProof(url);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPaymentImage(url);
                                      setIsImageModalOpen(true);
                                    }}
                                    className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded border transition-all focus:outline-none ${
                                      isPdf
                                        ? "flex-col border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30"
                                        : "border-gray-200 bg-gray-50 hover:border-brand-500 hover:opacity-90 dark:border-gray-700 dark:bg-gray-800"
                                    }`}
                                    title={isPdf ? `Voir le document PDF #${idx + 1}` : `Voir le justificatif #${idx + 1}`}
                                  >
                                    {isPdf ? (
                                      <>
                                        <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-[8px] font-bold text-red-700 dark:text-red-300">PDF</span>
                                      </>
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Justificatif ${idx + 1}`}
                                        className="h-full w-full object-cover"
                                      />
                                    )}
                                  </button>
                                );
                              })}
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
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryTab("saison");
                              setHistorySelectedProgramme("all");
                              setHistoryPlayerId(payment.playerId);
                            }}
                            className="inline-flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition cursor-pointer"
                            aria-label="Historique des paiements du joueur"
                            title="Historique des paiements du joueur"
                          >
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-payment-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 my-auto">
            <div className="mb-4 flex items-start justify-between gap-4 shrink-0 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 id="edit-payment-title" className="text-lg font-semibold text-gray-800 dark:text-white">
                  Modifier le paiement / Solde
                </h2>
                <p className="mt-1 text-base font-bold text-brand-600 dark:text-brand-400">
                  {getPlayerFullName(playerMap.get(editingPayment.playerId)!)}
                </p>
              </div>
              <button type="button" onClick={closeEditModal} className="text-xl text-gray-400 hover:text-gray-700" aria-label="Fermer">
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 pb-4 space-y-4 custom-scrollbar">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Joueur</label>
                <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {getPlayerFullName(playerMap.get(editingPayment.playerId)!)}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Montant à régler (Solde)</label>
                <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-900 dark:bg-gray-800 dark:text-white">
                  {(() => {
                    const b = calculateBalance(editingPayment);
                    if (b.balance <= 0) return formatClubCurrency(0, b.devise);
                    
                    const tauxEff = editTaux > 0 ? editTaux : (editingPayment.taux || 132);

                    let balUSD = 0;
                    let balHTG = 0;

                    if (b.devise === "HTG") {
                      balHTG = b.balance;
                      balUSD = tauxEff > 0 ? b.balance / tauxEff : 0;
                    } else {
                      balUSD = b.balance;
                      balHTG = tauxEff > 0 ? Math.round(b.balance * tauxEff) : 0;
                    }

                    const extraMonths = b.moisRestants !== undefined ? ` (${b.moisRestants} mois restants)` : "";

                    if (editDevise === "HTG") {
                      return `${balHTG.toLocaleString('fr-FR')} HTG (${formatClubCurrency(balUSD, "US")})${extraMonths}`;
                    }
                    return `${formatClubCurrency(balUSD, "US")}${balHTG > 0 ? ` (${balHTG.toLocaleString('fr-FR')} HTG)` : ""}${extraMonths}`;
                  })()}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Devise du versement</label>
                  <select
                    value={editDevise}
                    onChange={(event) => setEditDevise(event.target.value as "US" | "HTG")}
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="US">Dollar US ($)</option>
                    <option value="HTG">Gourde HTG (Gdes)</option>
                  </select>
                </div>
                {editDevise === "HTG" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Taux de change (ex: 132)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editTaux || ""}
                      onChange={(event) => setEditTaux(event.target.value === "" ? 0 : parseFloat(event.target.value) || 0)}
                      placeholder="Ex: 132"
                      className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                )}
              </div>
              {editDevise === "HTG" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-payment-amount" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Différence à ajouter (Gourdes)
                    </label>
                    <input
                      id="new-payment-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={newAmount === 0 ? "" : newAmount}
                      onChange={(event) => setNewAmount(event.target.value === "" ? 0 : Number(event.target.value))}
                      placeholder="Saisissez le montant..."
                      className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Équivalent (Dollars USD $)
                    </label>
                    <div className="h-11 w-full rounded-lg border border-emerald-300 bg-emerald-50/60 px-3 flex items-center text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                      {(() => {
                        const num = Number(newAmount) || 0;
                        if (num <= 0 || editTaux <= 0) return "$0.00 USD";
                        const valUS = num / editTaux;
                        return `$${valUS.toFixed(2)} USD`;
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="new-payment-amount" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Différence à ajouter (USD)
                  </label>
                  <input
                    id="new-payment-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newAmount === 0 ? "" : newAmount}
                    onChange={(event) => setNewAmount(event.target.value === "" ? 0 : Number(event.target.value))}
                    placeholder="Saisissez le montant..."
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}
              <div>
                <label htmlFor="new-payment-date" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Date du paiement</label>
                <input id="new-payment-date" type="date" value={newPaymentDate} onChange={(event) => setNewPaymentDate(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>

              {isMonthlyPlan && (
                <div>
                  <label htmlFor="nombre-mois-payes" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de mois payés</label>
                  <input id="nombre-mois-payes" type="number" min="1" step="1" value={nombreDeMois} onChange={(event) => setNombreDeMois(Math.max(1, parseInt(event.target.value) || 1))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
              )}

              {(() => {
                const existingPhotos = extractPhotoUrlsFromRemark(editingPayment.remarque);
                if (existingPhotos.length === 0) return null;
                return (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Justificatif(s) déjà joint(s) :</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {existingPhotos.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-brand-400">
                          📎 Document #{idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nouveau(x) justificatif(s) (Optionnel - JPG, PNG, PDF... max 10 Mo)
                  </label>
                  {paymentPhotoPreviews.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                      {paymentPhotoPreviews.length} pièce{paymentPhotoPreviews.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handlePaymentPhotoChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600 cursor-pointer"
                />
                {paymentPhotoError && <p className="mt-2 text-sm text-red-600">{paymentPhotoError}</p>}
                
                {paymentPhotoPreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {paymentPhotoPreviews.map((item, idx) => (
                      <div key={idx} className="relative flex items-center gap-2.5 p-2 rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-800">
                        {item.isPdf ? (
                          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-900/40">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                        ) : (
                          <img src={item.url} alt={item.name} className="h-10 w-10 shrink-0 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            Pièce #{idx + 1}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Supprimer cette pièce"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={closeEditModal} disabled={isSaving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
              <button type="button" onClick={handleSaveEdit} disabled={isSaving} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{isSaving ? "Enregistrement..." : "Enregistrer"}</button>
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
        </>
      )}

      {activeTab === "programmes" && (
        <div className="space-y-4">
          {/* Filtres de l'onglet Programmes Spéciaux */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] space-y-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Programme / Tournoi
                </label>
                <select
                  value={selectedProgrammeFilter}
                  onChange={(e) => {
                    setSelectedProgrammeFilter(e.target.value);
                    setProgCurrentPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 font-medium cursor-pointer"
                >
                  <option value="all">Tous les programmes ({availableProgrammes.length})</option>
                  {availableProgrammes.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {selectedProgrammeFilter !== "all" && selectedProgrammeParticipants.length > 0
                    ? `Joueur inscrit (${selectedProgrammeParticipants.length})`
                    : "Rechercher joueur / matricule"}
                </label>
                {selectedProgrammeFilter !== "all" && selectedProgrammeParticipants.length > 0 ? (
                  <select
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setProgCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 font-medium cursor-pointer"
                  >
                    <option value="">Tous les inscrits ({selectedProgrammeParticipants.length})</option>
                    {selectedProgrammeParticipants.map((pl) => (
                      <option key={pl.id} value={getPlayerFullName(pl)}>
                        {getPlayerFullName(pl)} {pl.matricule ? `(${pl.matricule})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setProgCurrentPage(1);
                    }}
                    placeholder="Nom du joueur, matricule..."
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Mode de paiement
                </label>
                <select
                  value={methodeFilter}
                  onChange={(e) => {
                    setMethodeFilter(e.target.value);
                    setProgCurrentPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                >
                  <option value="all">Tous les modes</option>
                  <option value="especes">Cash / Espèces</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="mobile">MonCash / Mobile</option>
                  <option value="cheque">Chèque</option>
                  <option value="carte">Carte bancaire</option>
                  <option value="depot">Dépôt bancaire</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Devise
                </label>
                <select
                  value={deviseFilter}
                  onChange={(e) => {
                    setDeviseFilter(e.target.value);
                    setProgCurrentPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                >
                  <option value="all">Toutes les devises</option>
                  <option value="US">USD ($)</option>
                  <option value="HTG">HTG (Gourdes)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Période (Du / Au)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setProgCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setProgCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                {(selectedProgrammeFilter !== "all" || searchQuery || methodeFilter !== "all" || deviseFilter !== "all" || startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProgrammeFilter("all");
                      setSearchQuery("");
                      setMethodeFilter("all");
                      setDeviseFilter("all");
                      setStartDate("");
                      setEndDate("");
                      setProgCurrentPage(1);
                    }}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold cursor-pointer"
                  >
                    ✕ Réinitialiser les filtres
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProgExportOpen(!isProgExportOpen)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Exporter</span>
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Dropdown
                    isOpen={isProgExportOpen}
                    onClose={() => setIsProgExportOpen(false)}
                    className="absolute right-0 top-full mt-1 w-44 z-20"
                  >
                    <DropdownItem onItemClick={handleExportProgrammeExcel} className="cursor-pointer">
                      📊 Format Excel (.xls)
                    </DropdownItem>
                    <DropdownItem onItemClick={handleExportProgrammeCSV} className="cursor-pointer">
                      📄 Format CSV (.csv)
                    </DropdownItem>
                  </Dropdown>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const targetProg =
                      selectedProgrammeFilter !== "all"
                        ? selectedProgrammeFilter
                        : availableProgrammes[0] || (programmesList[0]?.nom ?? "");
                    setModalProgrammeNom(targetProg);
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white shadow-theme-xs hover:bg-brand-600 transition cursor-pointer"
                >
                  + Nouveau paiement programme
                </button>
              </div>
            </div>
          </div>

          {/* Cartes KPI du programme sélectionné */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Programme Sélectionné
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xl font-bold text-gray-800 dark:text-white truncate">
                  {selectedProgrammeFilter === "all" ? "Tous les programmes" : selectedProgrammeFilter}
                </span>
              </div>
              <span className="mt-1 block text-xs text-gray-400">
                {filteredProgrammePayments.length} versement(s) répertorié(s)
              </span>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Total Encaissé (USD)
              </span>
              <div className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatClubCurrency(programmeMetrics.totalUSD, "US")}
              </div>
              <span className="mt-1 block text-xs text-gray-400">
                Devise US Dollars
              </span>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Total Encaissé (HTG)
              </span>
              <div className="mt-1.5 text-2xl font-bold text-brand-600 dark:text-brand-400">
                {formatClubCurrency(programmeMetrics.totalHTG, "HTG")}
              </div>
              <span className="mt-1 block text-xs text-gray-400">
                Devise Gourdes haïtiennes
              </span>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Participation Joueurs
              </span>
              <div className="mt-1.5 text-2xl font-bold text-gray-800 dark:text-white">
                {programmeMetrics.uniquePlayersCount}{" "}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  joueur{programmeMetrics.uniquePlayersCount > 1 ? "s" : ""}
                </span>
              </div>
              <span className="mt-1 block text-xs text-gray-400">
                Sur {programmeMetrics.count} versement{programmeMetrics.count > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Tableau des paiements de programmes */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Paiements des Programmes & Tournois
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {filteredProgrammePayments.length} versement(s) · Indépendant des cotisations annuelles
                </p>
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
                      Programme
                    </TableCell>
                    <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Rubrique / Objet
                    </TableCell>
                    <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Montant & Mode
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
                  {!hydrated && payments.length === 0 ? (
                    <TableBodySkeleton rows={5} columns={7} />
                  ) : paginatedProgrammePayments.length === 0 ? (
                    <TableRow>
                      <td colSpan={7} className="py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        <div className="mx-auto max-w-sm space-y-2">
                          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                            Aucun paiement de programme trouvé
                          </p>
                          <p className="text-xs text-gray-400">
                            Enregistrez un versement pour un tournoi ou camp en cliquant sur « + Nouveau paiement programme ».
                          </p>
                        </div>
                      </td>
                    </TableRow>
                  ) : (
                    paginatedProgrammePayments.map((payment) => {
                      const player = playerMap.get(payment.playerId);
                      const progName = getProgrammeNameFromRemark(payment.remarque);
                      const cleanDesc = getCleanDescriptionForProgramme(payment.remarque);
                      const photoUrls = extractPhotoUrlsFromRemark(payment.remarque);

                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                            <div className="flex flex-col">
                              <span className="font-semibold">{player ? getPlayerFullName(player) : "Joueur inconnu"}</span>
                              <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 font-medium">
                                {player?.matricule && !player.matricule.includes("XXXX")
                                  ? player.matricule
                                  : player ? generatePlayerMatricule(player.id, player.saison, player.sourceDetection) : "-"}
                              </span>
                              {player?.categorie && (
                                <span className="text-[10px] text-gray-400">{player.categorie}</span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-300 font-medium">
                            {payment.datePaiement ? formatClubDate(payment.datePaiement) : "-"}
                          </TableCell>

                          <TableCell className="py-3 text-theme-sm">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                              <svg className="size-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15a6 6 0 006-6V4H6v5a6 6 0 006 6zm0 0v4m-4 0h8M4 6H2v3a4 4 0 004 4h.34M20 6h2v3a4 4 0 01-4 4h-.34" />
                              </svg>
                              <span>{progName}</span>
                            </span>
                          </TableCell>

                          <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium text-xs block max-w-xs truncate" title={cleanDesc}>
                              {cleanDesc}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatClubCurrency(payment.montant, payment.devise)}
                              </span>
                              {payment.devise === "HTG" && payment.taux && (
                                <span className="text-[10px] text-gray-400">
                                  Taux: {payment.taux} HTG/$
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium capitalize">
                                {mapModeStr(payment.methode)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-theme-sm">
                            {photoUrls.length === 0 ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {photoUrls.map((url, idx) => {
                                  const isPdf = isPdfProof(url);
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setSelectedPaymentImage(url);
                                        setIsImageModalOpen(true);
                                      }}
                                      className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded border transition-all focus:outline-none cursor-pointer ${
                                        isPdf
                                          ? "flex-col border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30"
                                          : "border-gray-200 bg-gray-50 hover:border-brand-500 hover:opacity-90 dark:border-gray-700 dark:bg-gray-800"
                                      }`}
                                      title={isPdf ? `Voir le document PDF #${idx + 1}` : `Voir le justificatif #${idx + 1}`}
                                    >
                                      {isPdf ? (
                                        <>
                                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                          </svg>
                                          <span className="text-[8px] font-bold text-red-700 dark:text-red-300">PDF</span>
                                        </>
                                      ) : (
                                        <img src={url} alt={`Justificatif ${idx + 1}`} className="h-full w-full object-cover" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-theme-sm">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handlePrintSinglePaymentPDF(payment)}
                                className="inline-flex items-center justify-center text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition cursor-pointer"
                                aria-label="Imprimer le reçu"
                                title="Imprimer le reçu officiel du programme"
                              >
                                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadSinglePaymentPDF(payment)}
                                className="inline-flex items-center justify-center text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition cursor-pointer"
                                aria-label="Télécharger le reçu PDF"
                                title="Télécharger le reçu PDF"
                              >
                                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryTab("programmes");
                                  const progName = getProgrammeNameFromRemark(payment.remarque);
                                  if (progName) {
                                    setHistorySelectedProgramme(progName);
                                  } else {
                                    setHistorySelectedProgramme("all");
                                  }
                                  setHistoryPlayerId(payment.playerId);
                                }}
                                className="inline-flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition cursor-pointer"
                                aria-label="Historique des paiements"
                                title="Historique des versements du joueur"
                              >
                                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <Link
                                href={`/paiements/modifier/${payment.id}`}
                                className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                                aria-label="Modifier"
                                title="Modifier ce paiement"
                              >
                                <PencilIcon className="size-5" />
                              </Link>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                                onClick={() => handleDeletePayment(payment.id)}
                                aria-label="Supprimer"
                                title="Supprimer ce paiement"
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
          </div>

          {/* Pagination Programmes */}
          <div className="mt-4 flex justify-end print:hidden">
            <Pagination
              currentPage={progCurrentPageSafe}
              totalPages={progTotalPages}
              onPageChange={setProgCurrentPage}
              pageSize={progCurrentPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageSizeChange={(size) => {
                setProgCurrentPageSize(size);
                setProgCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      <PaymentAddModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalPlayerId(undefined);
          setModalProgrammeNom(undefined);
        }}
        initialPlayerId={modalPlayerId}
        initialProgrammeNom={modalProgrammeNom}
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

      {historyPlayerId && historyPlayer && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setHistoryPlayerId(null);
          }}
        >
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="history-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                      Historique des paiements
                    </h2>
                    {historyPlayer.matricule && (
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {historyPlayer.matricule}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Joueur : <span className="font-semibold text-gray-800 dark:text-gray-200">{getPlayerFullName(historyPlayer)}</span>
                    {historyPlayer.categorie && ` • ${historyPlayer.categorie}`}
                    {historyPlayer.statutJoueur && ` • ${historyPlayer.statutJoueur}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePrintPlayerHistory(historyPlayer, activeHistoryPayments, activeHistoryMetrics, activeHistoryTitle)}
                  className={`inline-flex items-center gap-1.5 rounded-lg text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer ${
                    historyTab === "saison" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                  title="Imprimer l'historique des transactions"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Imprimer l'historique</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPlayerHistoryPDF(historyPlayer, activeHistoryPayments, activeHistoryMetrics, activeHistoryTitle)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50 transition cursor-pointer"
                  title="Télécharger l'historique des transactions au format PDF"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>PDF Relevé</span>
                </button>
                <Link
                  href={`/joueurs/${historyPlayer.id}`}
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                >
                  <span>Fiche joueur</span>
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
                <button
                  type="button"
                  onClick={() => setHistoryPlayerId(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition text-lg cursor-pointer"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Onglets de séparation Saison vs Programmes */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/30">
              <div className="inline-flex p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryTab("saison");
                    setHistorySelectedProgramme("all");
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    historyTab === "saison"
                      ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <svg className={`size-3.5 shrink-0 ${historyTab === "saison" ? "text-brand-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Cotisations de Saison</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                    historyTab === "saison" ? "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400" : "bg-gray-200/80 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}>
                    {historySeasonPayments.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("programmes")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    historyTab === "programmes"
                      ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <svg className={`size-3.5 shrink-0 ${historyTab === "programmes" ? "text-amber-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15a6 6 0 006-6V4H6v5a6 6 0 006 6zm0 0v4m-4 0h8M4 6H2v3a4 4 0 004 4h.34M20 6h2v3a4 4 0 01-4 4h-.34" />
                  </svg>
                  <span>Programmes Spéciaux & Tournois</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                    historyTab === "programmes" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" : "bg-gray-200/80 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}>
                    {historyAllProgrammePayments.length}
                  </span>
                </button>
              </div>

              {historyTab === "programmes" && historyPlayerProgrammesList.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Tournoi / Programme :</label>
                  <select
                    value={historySelectedProgramme}
                    onChange={(e) => setHistorySelectedProgramme(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="all">Tous les programmes ({historyAllProgrammePayments.length})</option>
                    {historyPlayerProgrammesList.map((prog) => (
                      <option key={prog} value={prog}>
                        {prog}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Metric Cards Summary */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Card 1: Total Versé */}
                <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-800/80">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total déjà versé</span>
                  <div className="mt-1 flex flex-col">
                    {activeHistoryMetrics.totalUSD > 0 && (
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatClubCurrency(activeHistoryMetrics.totalUSD, "US")}
                      </span>
                    )}
                    {activeHistoryMetrics.totalHTG > 0 && (
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatClubCurrency(activeHistoryMetrics.totalHTG, "HTG")}
                      </span>
                    )}
                    {activeHistoryMetrics.totalUSD === 0 && activeHistoryMetrics.totalHTG === 0 && (
                      <span className="text-base font-bold text-gray-600 dark:text-gray-300">$0.00</span>
                    )}
                  </div>
                </div>

                {/* Card 2: Total Dû */}
                <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-800/80">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Total Dû ({historyTab === "saison" ? "Saison" : "Programme"})
                  </span>
                  <div className="mt-1">
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      {activeHistoryMetrics.totalDue}
                    </span>
                  </div>
                </div>

                {/* Card 3: Solde Restant */}
                <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-800/80">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Solde Restant Dû ({historyTab === "saison" ? "Saison" : "Programme"})
                  </span>
                  <div className="mt-1">
                    <span className={`text-base font-bold ${(activeHistoryMetrics.balanceNum || 0) > 0 ? "text-error-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {activeHistoryMetrics.balance}
                    </span>
                  </div>
                </div>

                {/* Card 4: Versements */}
                <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-800/80">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Versements</span>
                  <div className="mt-1">
                    <span className={`text-base font-bold ${historyTab === "saison" ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {activeHistoryMetrics.count} versement{activeHistoryMetrics.count > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              {activeHistoryPayments.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  {historyTab === "saison"
                    ? "Aucun versement de cotisation de saison enregistré pour ce joueur."
                    : "Aucun versement de programme spécial ou tournoi enregistré pour ce joueur."}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Montant Versé</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Rubriques / Détails</th>
                        <th className="px-4 py-3">Justificatif</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {activeHistoryPayments.map((p) => {
                        const proofUrls = extractPhotoUrlsFromRemark(p.remarque);
                        const cleanRub = (p.remarque || "")
                          .replace(/\[.*?\]\s*/g, "")
                          .replace(/\s*\|\s*/g, " - ")
                          .replace(/Rubriques\s*:\s*/gi, "")
                          .trim() || (p as any).description || "Cotisation";

                        return (
                          <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition">
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                              {p.datePaiement ? formatClubDate(p.datePaiement) : "N/D"}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                              {formatClubCurrency(p.montant, (p.devise || "US") as "US" | "HTG")}
                              {p.taux && p.taux > 1 && (
                                <span className="block text-[11px] font-normal text-gray-400">
                                  Taux : {p.taux}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                {(() => {
                                  const m = String(p.methode || "");
                                  if (m === "especes" || m === "1") return "Espèces";
                                  if (m === "virement" || m === "2") return "Virement";
                                  if (m === "cheque" || m === "3" || m === "6") return "Chèque";
                                  if (m === "carte" || m === "4") return "Carte";
                                  if (m === "mobile" || m === "5") return "MonCash / Mobile";
                                  if (m === "depot" || m === "7") return "Dépôt";
                                  return m || "Autre";
                                })()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title={cleanRub}>
                              {cleanRub}
                            </td>
                            <td className="px-4 py-3">
                              {proofUrls.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  {proofUrls.map((url, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setSelectedPaymentImage(url);
                                        setIsImageModalOpen(true);
                                      }}
                                      className="h-8 w-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-80 transition shrink-0 cursor-pointer"
                                      title={`Voir justificatif ${idx + 1}`}
                                    >
                                      {isPdfProof(url) ? (
                                        <div className="flex h-full w-full items-center justify-center bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                                          PDF
                                        </div>
                                      ) : (
                                        <img src={url} alt={`Preuve ${idx + 1}`} className="h-full w-full object-cover" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePrintSinglePaymentPDF(p)}
                                  className="inline-flex items-center justify-center p-1.5 text-brand-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg dark:hover:bg-brand-950/30 transition cursor-pointer"
                                  title="Imprimer le reçu"
                                >
                                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSinglePaymentPDF(p)}
                                  className="inline-flex items-center justify-center p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition cursor-pointer"
                                  title="Télécharger le reçu (PDF)"
                                >
                                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                                <Link
                                  href={`/paiements/modifier/${p.id}`}
                                  className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition cursor-pointer"
                                  title="Modifier ce paiement"
                                >
                                  <PencilIcon className="size-4" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <button
                type="button"
                onClick={() => handlePrintPlayerHistory(historyPlayer, activeHistoryPayments, activeHistoryMetrics, activeHistoryTitle)}
                className={`inline-flex items-center gap-1.5 rounded-lg text-white px-4 py-2 text-sm font-semibold shadow-xs transition cursor-pointer ${
                  historyTab === "saison" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimer l'historique</span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryPlayerId(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Récapitulatif Complet du Reçu lors du règlement de solde */}
      {settledReceiptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-emerald-50/70 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Solde Réglé — Reçu Disponible
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Versement enregistré avec succès
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSettledReceiptModal}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition cursor-pointer"
                title="Fermer"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Notification statut email */}
              {settledReceiptModalData.emailSentTo ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-300 text-xs font-medium">
                  <svg className="size-4 shrink-0 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>
                    Un exemplaire officiel a été automatiquement envoyé par courriel à : <strong>{settledReceiptModalData.emailSentTo}</strong>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 text-xs font-medium">
                  <svg className="size-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    Aucune adresse courriel parent trouvée. Le reçu officiel peut être consulté, imprimé ou téléchargé ci-dessous.
                  </span>
                </div>
              )}

              {/* Fiche récapitulative du Reçu */}
              <div className="border border-gray-200 dark:border-gray-700/80 rounded-2xl p-5 bg-gray-50/50 dark:bg-gray-800/40 space-y-4">
                
                {/* En-tête Reçu */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 dark:border-gray-700/80">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 block">
                      Numéro de Reçu
                    </span>
                    <span className="text-base font-black text-gray-900 dark:text-white font-mono">
                      {settledReceiptModalData.receiptNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 block">
                      Date du règlement
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {formatClubDate(settledReceiptModalData.datePaiement)}
                    </span>
                  </div>
                </div>

                {/* Détails Joueur & Parent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Bénéficiaire (Joueur)
                    </span>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {getPlayerFullName(settledReceiptModalData.player)}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Matricule : <strong className="text-blue-600 dark:text-blue-400">{settledReceiptModalData.player.matricule || "—"}</strong>
                    </p>
                    {settledReceiptModalData.player.categorie && (
                      <p className="text-gray-500 dark:text-gray-400">
                        Catégorie : {settledReceiptModalData.player.categorie}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Parent / Tuteur
                    </span>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {settledReceiptModalData.player.parentNomPrenom || "Parent / Tuteur"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Tél : {settledReceiptModalData.player.parentTelephone || settledReceiptModalData.player.telephone || "—"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 truncate">
                      Email : {settledReceiptModalData.player.parentEmail || settledReceiptModalData.player.email || "—"}
                    </p>
                  </div>
                </div>

                {/* Détails Financiers du Règlement */}
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
                      Montant Versé (Solde réglé)
                    </span>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                      {settledReceiptModalData.amountFormatted}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                      Mode de paiement
                    </span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">
                      {settledReceiptModalData.methode || "Espèces"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenReceiptTab(settledReceiptModalData.blobUrl)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
                  title="Ouvrir le document PDF complet dans un nouvel onglet"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Ouvrir le reçu (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintSettledReceipt(settledReceiptModalData.blobUrl)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3.5 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSettledReceipt(settledReceiptModalData.blobUrl, settledReceiptModalData.receiptNumber)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3.5 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Télécharger</span>
                </button>
              </div>
              <button
                type="button"
                onClick={closeSettledReceiptModal}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmComponent />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageContent />
    </Suspense>
  );
}
