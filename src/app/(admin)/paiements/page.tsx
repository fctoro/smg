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

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const urlMethode = searchParams.get("methode") || "all";

  const { payments, players, parents, setPayments, hydrated, rubriques } = useClubData();
  const { confirm, ConfirmComponent } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [methodeFilter, setMethodeFilter] = useState(urlMethode);
  const [deviseFilter, setDeviseFilter] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");

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

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const parentMap = useMemo(
    () => new Map((parents || []).map((parent) => [parent.id, parent])),
    [parents],
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

    const planLabel = getPaymentPlanLabel(payment.remarque);
    const remarkLower = (payment.remarque || "").toLowerCase();
    let rawPlan = planLabel.toLowerCase();
    if (rawPlan === "aucun") {
      if (remarkLower.includes("boursier") || remarkLower.includes("bourse")) rawPlan = "boursier";
      else if (remarkLower.includes("semestriel")) rawPlan = "semestriel";
      else if (remarkLower.includes("mensuel")) rawPlan = "mensuel";
      else rawPlan = "annuel";
    }
    setEditPlan(rawPlan);

    const isMonthly = rawPlan === "mensuel" || remarkLower.includes("[plan:mensuel]") || remarkLower.includes("mensuel");
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

      // On préserve la devise initiale du dossier (US par défaut) pour ne pas altérer l'affichage principal
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

      if (editDevise === "HTG" && newAmountNum > 0) {
        baseRemarque += ` [SOLDE_HTG:${newAmountNum}_TAUX:${editTaux}_USD:${addedUSD.toFixed(2)}]`;
      }

      const finalRemarque = `${baseRemarque}${paymentPhotoNotes}`.trim();

      await updatePaymentInSupabase(editingPayment.id, {
        montant: newPrimaryAmount,
        montantUS: totalMontantUS,
        montantHTG: totalMontantHTG,
        devise: targetDevise,
        taux: editTaux > 0 ? editTaux : editingPayment.taux,
        datePaiement: newPaymentDate,
        remarque: finalRemarque,
      });
      setPayments((currentPayments) =>
        currentPayments.map((payment) =>
          payment.id === editingPayment.id
            ? { ...payment, montant: newPrimaryAmount, montantUS: totalMontantUS, montantHTG: totalMontantHTG, devise: targetDevise, taux: editTaux > 0 ? editTaux : editingPayment.taux, datePaiement: newPaymentDate, remarque: finalRemarque }
            : payment,
        ),
      );

      // Fermeture immédiate du modal et mise à jour UI instantanée !
      closeEditModal();

      // Envoi du mail de reçu en arrière-plan (sans faire attendre l'utilisateur)
      (async () => {
        const player = playerMap.get(editingPayment.playerId);
        if (!player) return;
        const emailToSend = player.parentEmail || player.email;
        if (!emailToSend) return;

        try {
          const updatedPaymentForPdf = {
            id: editingPayment.id,
            playerId: editingPayment.playerId,
            montant: newPrimaryAmount,
            montantUS: totalMontantUS,
            montantHTG: totalMontantHTG,
            devise: targetDevise,
            datePaiement: newPaymentDate,
            remarque: finalRemarque,
          };
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

          const receiptBase64 = await generateReceiptPDFBase64(
            player,
            [updatedPaymentForPdf],
            parentNom,
            parentPrenom,
            player.parentTelephone || player.telephone || "",
            emailToSend,
            player.parentAdresse || player.adresse || "",
            allProofBase64List,
            false,
            totalRubriques
          );

          const mntStr = targetDevise === "HTG" ? `${newAmount} HTG` : `${newAmount} USD`;
          await fetch("/api/send-receipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: emailToSend,
              parentName: player.parentNomPrenom || getPlayerFullName(player),
              receiptBase64,
              receiptNumber: `SOLDE-${Date.now()}`,
              amount: mntStr,
            }),
          });
        } catch (emailErr) {
          console.error("Erreur lors de l'envoi du mail de solde:", emailErr);
        }
      })();
    } catch (error: any) {
      console.error("Erreur complète:", error);
      setEditError(error?.message || "Impossible d'enregistrer la modification.");
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
      
      const receiptBase64 = await generateReceiptPDFBase64(
        player,
        [payment],
        parentNom,
        parentPrenom,
        player.parentTelephone || player.telephone || "",
        player.parentEmail || player.email || "",
        player.parentAdresse || player.adresse || "",
        proofBase64List,
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
      
      const receiptBase64 = await generateReceiptPDFBase64(
        player,
        [payment],
        parentNom,
        parentPrenom,
        player.parentTelephone || player.telephone || "",
        player.parentEmail || player.email || "",
        player.parentAdresse || player.adresse || "",
        proofBase64List,
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
        if (methodeFilter !== "all") {
          const m = (payment.methode || "").toLowerCase().trim();
          const target = methodeFilter.toLowerCase().trim();
          if (m !== target) return false;
        }
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
  }, [payments, playerMap, searchQuery, methodeFilter, deviseFilter, selectedSeason]);

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

  const getExportDataRows = () => {
    return filteredPayments.map((payment) => {
      const player = playerMap.get(payment.playerId);
      const playerName = player ? getPlayerFullName(player) : "Joueur Inconnu";
      const playerMatricule = player?.matricule || "-";
      const playerCategory = player?.categorie || "-";
      const playerPoste = player?.poste || "-";
      const playerDob = player?.dateNaissance ? formatClubDate(player.dateNaissance) : "-";
      const playerStatusPlan = (player as any)?.statutJoueur || player?.planPaiement || "Standard";

      const parentId = (player as any)?.parentId || (player as any)?.tuteur_id;
      const parent = parentId ? parentMap.get(String(parentId)) : undefined;
      const parentName = parent ? `${parent.nom || ""} ${parent.prenom || ""}`.trim() : (player?.parentNomPrenom || "-");
      const parentPhone = parent?.telephone || player?.parentTelephone || "-";

      const devise = (payment.devise || "US") as "US" | "HTG";
      const montantPaid = payment.montant;

      const b = calculateBalance(payment);
      const totalDueUSD = payment.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i)?.[1];
      const totalDueFormatted = totalDueUSD ? formatClubCurrency(parseFloat(totalDueUSD), "US") : "-";
      const balanceFormatted = b.balance > 0 ? formatClubCurrency(b.balance, b.devise) : (b.balance < 0 ? `Trop-perçu: ${formatClubCurrency(Math.abs(b.balance), b.devise)}` : "0");
      const statutReglement = b.balance > 0 ? `Solde dû (${formatClubCurrency(b.balance, b.devise)})` : "À jour";

      const remarkLower = (payment.remarque || "").toLowerCase();
      const planLabel = remarkLower.includes("mensuel") ? "Mensuel" : (remarkLower.includes("annuel") ? "Annuel" : (remarkLower.includes("semestriel") ? "Semestriel" : "Comptant"));
      const moisMatch = payment.remarque?.match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || payment.remarque?.match(/(\d+)\s*mois/i);
      const moisPayes = moisMatch && moisMatch[1] ? `${moisMatch[1]} mois` : (planLabel === "Mensuel" ? "1 mois" : "-");

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

      const photoMatches = extractPhotoUrlsFromRemark(payment.remarque);
      const justificatifs = photoMatches.length > 0 ? `Oui (${photoMatches.length} pièce(s))` : "Non";

      return [
        playerMatricule,
        playerName,
        playerCategory,
        planLabel,
        cleanRubriques,
        moisPayes,
        `${montantPaid} ${devise}`,
        devise,
        payment.taux ? String(payment.taux) : "-",
        totalDueFormatted,
        balanceFormatted,
        mapModeStr(payment.methode),
        justificatifs,
        payment.datePaiement ? formatClubDate(payment.datePaiement) : "-",
      ];
    });
  };

  const exportHeaders = [
    "Matricule",
    "Joueur (Nom & Prénom)",
    "Catégorie",
    "Plan de Règlement",
    "Articles / Rubriques Payés (Reçu)",
    "Nbre Mois Payés",
    "Montant Versé",
    "Devise",
    "Taux de Change",
    "Montant Total Dû (Dossier)",
    "Solde Restant Dû (Balance)",
    "Mode de Paiement",
    "Justificatif Joint",
    "Date du Paiement",
  ];

  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des paiements au format CSV ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
        let csvContent = exportHeaders.map(h => `"${h}"`).join(",") + "\n";
        const rows = getExportDataRows();
        rows.forEach((row) => {
          const csvRow = row.map((field) => `"${(field || "").toString().replace(/"/g, '""')}"`);
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
        
        const thead = exportHeaders.map(h => `<th>${h}</th>`).join("");
        const tbody = rows.map(row => {
          return `<tr>${row.map(field => `<td>${(field || "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`;
        }).join("");

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

  return (
    <div className="space-y-4">
      <PageBreadcrumb pageTitle="Paiements" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
            value={methodeFilter}
            onChange={(event) => {
              setMethodeFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">Tous les modes de paiements</option>
            <option value="especes">Cash / Espèces</option>
            <option value="virement">Virement bancaire</option>
            <option value="mobile">MonCash / Mobile</option>
            <option value="cheque">Chèque</option>
            <option value="carte">Carte bancaire</option>
            <option value="depot">Dépôt bancaire</option>
          </select>
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
              {filteredPayments.length === payments.length
                ? `${payments.length} paiement(s)`
                : `${filteredPayments.length} sur ${payments.length} paiement(s)`}
              {filteredPayments.length !== payments.length && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDeviseFilter("all");
                    setSelectedSeason("all");
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
                        <span className="font-semibold">{getPlayerFullName(player)}</span>
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-300 font-medium">
                        {payment.datePaiement ? formatClubDate(payment.datePaiement) : "-"}
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

                    if (editDevise === "HTG") {
                      return `${balHTG.toLocaleString('fr-FR')} HTG (${formatClubCurrency(balUSD, "US")})`;
                    }
                    return `${formatClubCurrency(balUSD, "US")}${balHTG > 0 ? ` (${balHTG.toLocaleString('fr-FR')} HTG)` : ""}`;
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

      <PaymentAddModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalPlayerId(undefined);
        }}
        initialPlayerId={modalPlayerId}
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

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageContent />
    </Suspense>
  );
}
