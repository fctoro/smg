"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus, Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { addPaymentToSupabase, addInvoiceToSupabase, updatePlayerInSupabase } from "@/lib/club/supabase-crud";
import { getCurrentSeason } from "@/lib/club/season";
import { validatePaymentPhotoFile, getPaymentPhotoPreviewUrl, uploadPaymentPhotosToSupabase, isPdfProof, filesToBase64 } from "@/lib/club/payment-photo-utils";
import { calculateDiscountedAmount } from "@/lib/club/payment-reduction-utils";
import { generateReceiptPDFBase64 } from "@/lib/club/pdf-generator";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

interface PricingItem {
  id: string;
  rubrique: string;
  montant: number;
  devise: "US" | "HTG";
  precision: string;
  categorie?: string;
  estAdhesion?: boolean;
  actif?: boolean;
}

interface PaymentPlan {
  id: string;
  plan: string;
  modalites: string;
  montantFCToro: number;
  montantTIToro: number;
  avantage: string;
  nombreVersements: number;
}

const pricingItems: PricingItem[] = [
  {
    id: "inscription",
    rubrique: "Frais d'inscription / réinscription",
    montant: 75,
    devise: "US",
    precision: "Applicables à tous les joueurs, nouveaux et anciens",
  },
  {
    id: "adhesion-fc",
    rubrique: "Adhésion annuelle - FC TORO",
    montant: 1350,
    devise: "US",
    precision: "Catégories École de Football / Académie / Élite, hors uniformes",
    categorie: "FC TORO",
  },
  {
    id: "adhesion-ti",
    rubrique: "Adhésion annuelle - TI TORO",
    montant: 1000,
    devise: "US",
    precision: "Catégorie Ti Toro / U6-U8, hors uniformes",
    categorie: "TI TORO",
  },
  {
    id: "uniforme-jeux1",
    rubrique: "Uniforme – Jeux 1",
    montant: 80,
    devise: "US",
    precision: "Jeux Entrainement - Obligatoire",
  },
  {
    id: "uniforme-jeux2",
    rubrique: "Uniforme – Jeux 2",
    montant: 100,
    devise: "US",
    precision: "Jeux Match 1 - Obligatoire",
  },
  {
    id: "uniforme-jeux3",
    rubrique: "Uniforme – Jeux 3",
    montant: 100,
    devise: "US",
    precision: "Jeux Match 2 - Obligatoire",
  },
  {
    id: "tracksuit",
    rubrique: "Tracksuit",
    montant: 150,
    devise: "US",
    precision: "Jacket & Jogger – Facultatif",
  },
  {
    id: "backpack",
    rubrique: "Backpack",
    montant: 90,
    devise: "US",
    precision: "Sac à dos – Facultatif",
  },
];

const paymentPlans: PaymentPlan[] = [
  {
    id: "annuel",
    plan: "Annuel",
    modalites: "Un versement unique à l'inscription",
    montantFCToro: 1215,
    montantTIToro: 900,
    avantage: "10% de rabais",
    nombreVersements: 1,
  },
  {
    id: "semestriel",
    plan: "Semestriel",
    modalites: "2 versements égaux : inscription & janvier",
    montantFCToro: 641.25,
    montantTIToro: 475,
    avantage: "5% de rabais",
    nombreVersements: 2,
  },
  {
    id: "mensuel",
    plan: "Mensuel",
    modalites: "9 versements, de septembre à mai, payables avant le 10 de chaque mois",
    montantFCToro: 155,
    montantTIToro: 115,
    avantage: "Mensualité",
    nombreVersements: 9,
  },
];

const isPlayerTiToro = (player: Player | null | undefined): boolean => {
  if (!player) return false;
  const prog = (player.programme || "").toLowerCase().trim();
  const cat = (player.categorie || "").toLowerCase().trim();
  if (prog.includes("ti toro") || prog.includes("ti") || prog === "titoro") return true;
  if (cat.includes("ti toro") || cat.includes("ti") || cat === "titoro") return true;
  if (["u6", "u7", "u8"].includes(cat)) return true;
  return false;
};

const getAdhesionIdForPlayer = (player: Player, options: PricingItem[]): string => {
  const isTi = isPlayerTiToro(player);
  if (isTi) {
    const tiItem = options.find(
      (r) =>
        r.id === "adhesion-ti" ||
        (r.estAdhesion && (r.rubrique.toLowerCase().includes("ti toro") || r.categorie?.toLowerCase().includes("ti")))
    );
    return tiItem?.id || "adhesion-ti";
  } else {
    const fcItem = options.find(
      (r) =>
        r.id === "adhesion-fc" ||
        (r.estAdhesion && (r.rubrique.toLowerCase().includes("fc toro") || r.categorie?.toLowerCase().includes("fc")))
    );
    return fcItem?.id || "adhesion-fc";
  }
};

const applyAutoAdhesionForPlayer = (
  player: Player,
  currentPricing: string[],
  options: PricingItem[]
): string[] => {
  const isBoursier = (player.statutJoueur || "").toLowerCase().includes("bourse");
  if (isBoursier) return currentPricing;

  const targetAdhesionId = getAdhesionIdForPlayer(player, options);
  const otherAdhesionIds = options
    .filter((r) => r.estAdhesion || r.id === "adhesion-fc" || r.id === "adhesion-ti")
    .map((r) => r.id);

  const filteredPricing = currentPricing.filter((id) => !otherAdhesionIds.includes(id));
  return [...filteredPricing, targetAdhesionId];
};

interface PaymentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlayerId?: string;
}

export function PaymentAddModal({ isOpen, onClose, initialPlayerId }: PaymentAddModalProps) {
  const { players, setPlayers, payments, setPayments, rubriques, refreshRubriques } = useClubData();

  useEffect(() => {
    if (isOpen && refreshRubriques) {
      refreshRubriques();
    }
  }, [isOpen, refreshRubriques]);

  const rubricOptions = useMemo(() => {
    return (rubriques || []).filter((item) => item.actif !== false && item.categorie !== "Payroll");
  }, [rubriques]);

  const adhesionOptions = useMemo(() => {
    return rubricOptions.filter(
      (item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti"
    );
  }, [rubricOptions]);

  const [playerId, setPlayerId] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");

  useEffect(() => {
    if (isOpen && initialPlayerId) {
      setPlayerId(initialPlayerId);
      const player = players.find((p) => p.id === initialPlayerId);
      if (player) {
        setSelectedPricing((current) => applyAutoAdhesionForPlayer(player, current, rubricOptions));
      }
    }
  }, [isOpen, initialPlayerId, players, rubricOptions]);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [montantDuManuel, setMontantDuManuel] = useState<number | "">("");
  const [montantDonne, setMontantDonne] = useState<number | "">("");
  const [devise, setDevise] = useState<"US" | "HTG">("US");
  const [taux, setTaux] = useState(0);
  const [description, setDescription] = useState("");
  const [periode, setPeriode] = useState(currentPeriod());
  const [statut, setStatut] = useState<PaymentStatus>("pending");
  const [methode, setMethode] = useState<PaymentMethod>("virement");
  const [datePaiement, setDatePaiement] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedPricing, setSelectedPricing] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [nombreDeMois, setNombreDeMois] = useState<number>(1);
  const [rabaisPercent, setRabaisPercent] = useState<number>(0);
  const [isUserEditedMontantDonne, setIsUserEditedMontantDonne] = useState(false);
  const [isUserEditedMontantDu, setIsUserEditedMontantDu] = useState(false);
  const [paymentPhotos, setPaymentPhotos] = useState<File[]>([]);
  const [paymentPhotoPreviews, setPaymentPhotoPreviews] = useState<{ file: File; url: string; name: string; isPdf: boolean }[]>([]);
  const [paymentPhotoError, setPaymentPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [players, playerId]
  );



  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) return players.slice(0, 20);
    return players.filter((player) => {
      const fullName = getPlayerFullName(player).toLowerCase();
      const matricule = (player.matricule || "").toLowerCase();
      return fullName.includes(query) || matricule.includes(query);
    });
  }, [players, playerSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowPlayerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setPlayerId("");
    setPlayerSearch("");
    setShowPlayerDropdown(false);
    setMontantDuManuel("");
    setMontantDonne("");
    setDevise("US");
    setTaux(0);
    setDescription("");
    setPeriode(currentPeriod());
    setStatut("pending");
    setMethode("virement");
    setDatePaiement(new Date().toISOString().split("T")[0]);
    setSelectedPricing([]);
    setSelectedPlan("");
    setRabaisPercent(0);
    setNombreDeMois(1);
    setIsUserEditedMontantDonne(false);
    setIsUserEditedMontantDu(false);
    paymentPhotoPreviews.forEach((p) => {
      if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
    });
    setPaymentPhotos([]);
    setPaymentPhotoPreviews([]);
    setPaymentPhotoError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const isBoursierPlayer = !!(selectedPlayer && (selectedPlayer.statutJoueur || "").toLowerCase().includes("bourse"));

    if (!playerId || !periode) {
      setToast({ message: "Veuillez remplir le joueur et la période.", type: "error" });
      return;
    }

    if (!isBoursierPlayer) {
      // Validations uniquement pour les joueurs non-boursiers
      if (montantDonne === "" || montantDonne <= 0 || (devise === "HTG" && taux <= 0)) {
        setToast({ message: "Veuillez remplir le montant payé et le taux de change.", type: "error" });
        return;
      }
      if (selectedPricingItems.length === 0 && !selectedPlan) {
        setToast({ message: "Veuillez sélectionner au moins une rubrique ou un plan de paiement.", type: "error" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const plan = isBoursierPlayer ? null : paymentPlans.find((item) => item.id === selectedPlan);
      const selectedAdhesionItem = selectedPricingItems.find((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");
      const isTiToro = selectedAdhesionItem ? (selectedAdhesionItem.rubrique.toLowerCase().includes("ti toro") || selectedAdhesionItem.id === "adhesion-ti") : false;
      const nonAdhesionSum = selectedPricingItems
        .filter((item) => !item.estAdhesion && item.id !== "adhesion-fc" && item.id !== "adhesion-ti")
        .reduce((sum, item) => sum + item.montant, 0);
      const planBaseAmount = plan ? (isTiToro ? plan.montantTIToro : plan.montantFCToro) : 0;
      const finalPlanAmount = (plan && selectedPlan === "mensuel") ? planBaseAmount * nombreDeMois : planBaseAmount;
      // Le total dû est basé sur les rubriques sélectionnées, pas sur le montant du plan
      const totalDue = isBoursierPlayer
        ? nombreDeMois * 2500
        : baseTotalDue;
      
      // Pour les boursiers: montant toujours en HTG, pas de taux
      const mDuManuelNum = Number(montantDuManuel) || 0;
      const mDonneNum = Number(montantDonne) || 0;
      
      const finalMontantAPayer = isBoursierPlayer ? totalDue : mDuManuelNum;
      const paymentAmount = isBoursierPlayer ? totalDue : mDonneNum;
      const actualDevise = isBoursierPlayer ? "HTG" : devise;
      const montantUS = isBoursierPlayer ? 0 : (actualDevise === "US" ? paymentAmount : (taux > 0 ? paymentAmount / taux : 0));
      const montantHTG = isBoursierPlayer ? paymentAmount : (actualDevise === "HTG" ? paymentAmount : 0);
      const adhesionCode = isBoursierPlayer ? "BOURSE" : (selectedAdhesionItem ? (isTiToro ? "TI_TORO" : "FC_TORO") : "");
      const selectedRubricsLabel = selectedPricingItems
        .filter((item) => !item.estAdhesion && item.id !== "adhesion-fc" && item.id !== "adhesion-ti")
        .map((item) => item.rubrique)
        .filter(Boolean).join(", ");
      // TOTAL_DUE doit refléter montantDuManuel (source de vérité), converti en USD si HTG
      const totalDueInUSD = (actualDevise === "HTG" && taux > 0)
        ? mDuManuelNum / taux
        : actualDevise === "HTG"
          ? baseTotalDue          // fallback si pas de taux
          : mDuManuelNum;      // USD : déjà en USD
      const rabaisMarker = (!isBoursierPlayer && rabaisPercent > 0) ? ` [RABAIS:${rabaisPercent}%]` : "";
      const tauxMarker = (!isBoursierPlayer && actualDevise === "HTG" && taux > 0) ? ` [TAUX:${taux}]` : "";
      const moisMarker = selectedPlan === "mensuel" ? ` [MOIS_PAYES:${nombreDeMois}]` : "";
      const paymentMarkers = isBoursierPlayer
        ? `[ADHESION:${adhesionCode}] [PLAN:BOURSIER] [STATUT:${statut.toUpperCase()}] [TOTAL_DUE:${totalDue}]`
        : `${adhesionCode ? `[ADHESION:${adhesionCode}] ` : ""}[PLAN:${selectedPlan ? selectedPlan.toUpperCase() : "AUCUN"}]${moisMarker} [STATUT:${statut.toUpperCase()}]${rabaisMarker}${tauxMarker} [TOTAL_DUE:${totalDueInUSD}]`;
      const adhesionLabel = isBoursierPlayer
        ? `Boursier: ${nombreDeMois} mois × 2,500 HTG`
        : (selectedAdhesionItem ? (isTiToro ? "Adhésion: TI TORO" : "Adhésion: FC TORO") : "");
      const finalRemarque = `${paymentMarkers} ${description.trim()} ${adhesionLabel}${selectedRubricsLabel ? ` | Rubriques: ${selectedRubricsLabel}` : ""}${plan ? ` Plan: ${plan.plan}` : ""}`.trim();
      
      const actualDatePaiement = datePaiement || new Date().toISOString().split("T")[0];
      const uploadPromise = paymentPhotos.length > 0 ? uploadPaymentPhotosToSupabase(paymentPhotos) : Promise.resolve([]);
      const invoiceData = {
        noFacture: `FAC-${Date.now()}`,
        playerId,
        sessionId: "1",
        remarque: finalRemarque,
        montantAPayer: finalMontantAPayer,
        montantPaye: paymentAmount,
        montantUS,
        montantHTG,
        devise,
        statut,
        dateFacture: new Date().toISOString(),
        datePaiement: actualDatePaiement,
      };

        const [paymentPhotoUrls] = await Promise.all([
          uploadPromise,
          addInvoiceToSupabase(invoiceData).catch((err) => {
            console.warn("Erreur lors de la création de la facture (silencieuse):", err);
            return null;
          })
        ]);
        
        const paymentPhotoNotes = (paymentPhotoUrls && paymentPhotoUrls.length > 0)
          ? paymentPhotoUrls.map((url) => ` [JUSTIFICATIF:${url}]`).join("")
          : paymentPhotos.map((p) => ` [JUSTIFICATIF:${p.name}]`).join("");
        const finalRemarqueWithPhoto = `${finalRemarque}${paymentPhotoNotes}`.trim();
        
        const dataToInsert = {
          playerId,
          montant: paymentAmount,
          montantUS,
          montantHTG,
          devise: actualDevise,
          taux: (!isBoursierPlayer && actualDevise === "HTG") ? taux : undefined,
          statut,
          periode,
          methode,
          remarque: finalRemarqueWithPhoto,
          datePaiement: actualDatePaiement,
        };

        const inserted = await addPaymentToSupabase(dataToInsert);
        if (!inserted) {
          throw new Error("Paiement non créé.");
        }

        const latestSeason = getCurrentSeason(new Date(actualDatePaiement));
        updatePlayerInSupabase(playerId, { saison: latestSeason }).catch((err) => {
          console.warn("Erreur mise à jour saison joueur:", err);
        });

        setPlayers((prevPlayers) =>
          prevPlayers.map((p) =>
            p.id === playerId ? { ...p, saison: latestSeason } : p
          )
        );

        setPayments((prevPayments) => [
          {
            id: inserted.Id.toString(),
            ...dataToInsert,
          },
          ...prevPayments,
        ]);
      // --- SEND EMAIL LOGIC ---
      try {
        if (selectedPlayer) {
          const paymentForPdf = {
            id: inserted.Id.toString(),
            ...dataToInsert,
          };

          const nomParts = (selectedPlayer.parentNomPrenom || "").split(" ");
          const parentNom = nomParts[0] || "";
          const parentPrenom = nomParts.slice(1).join(" ") || "";

          const proofBase64List = await filesToBase64(paymentPhotos);

          const receiptBase64 = await generateReceiptPDFBase64(
            selectedPlayer,
            [paymentForPdf],
            parentNom,
            parentPrenom,
            selectedPlayer.parentTelephone || "",
            selectedPlayer.parentEmail || selectedPlayer.email || "",
            selectedPlayer.parentAdresse || selectedPlayer.adresse || "",
            proofBase64List,
            false,
            discountedDue
          );

          // Print the generated PDF receipt on the same page using a hidden iframe
          try {
            const base64Data = receiptBase64.includes("base64,") ? receiptBase64.split("base64,")[1] : receiptBase64;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: 'application/pdf'});
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
                  console.error("Erreur lors de l'impression via iframe", e);
                }
              }, 300);
            };
          } catch (pdfErr) {
            console.error("Erreur lors de l'impression du PDF :", pdfErr);
          }

          const emailToSend = selectedPlayer.parentEmail || selectedPlayer.email;
          if (emailToSend) {
            const mntStr = devise === "HTG" ? `${mDonneNum} HTG` : `${mDonneNum} USD`;
            await fetch("/api/send-receipt", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: emailToSend,
                parentName: selectedPlayer.parentNomPrenom || getPlayerFullName(selectedPlayer),
                receiptBase64,
                receiptNumber: `FAC-${Date.now()}`,
                amount: mntStr,
              }),
            });
          }
        }
      } catch (err) {
        console.error("Erreur lors de l'envoi du recu par email:", err);
      }
      handleClose();
    } catch (error) {
      console.error(error);
      setToast({ message: "Erreur lors de l'ajout du paiement. Veuillez réessayer.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPlayer = (player: Player) => {
    setPlayerId(player.id);
    setPlayerSearch("");
    setShowPlayerDropdown(false);

    // Auto-select adhesion based on player category/programme
    setSelectedPricing((current) => applyAutoAdhesionForPlayer(player, current, rubricOptions));
  };

  const handlePricingChange = (itemId: string) => {
    setSelectedPricing((current) => {
      if (current.includes(itemId)) {
        return current.filter((value) => value !== itemId);
      }

      const clickedItem = rubricOptions.find((r) => r.id === itemId);
      const isAdhesion = clickedItem?.estAdhesion || itemId === "adhesion-fc" || itemId === "adhesion-ti";
      
      if (isAdhesion) {
        const otherAdhesionIds = rubricOptions
          .filter((r) => r.estAdhesion || r.id === "adhesion-fc" || r.id === "adhesion-ti")
          .map((r) => r.id);
        return [...current.filter((value) => !otherAdhesionIds.includes(value)), itemId];
      }

      return [...current, itemId];
    });
  };

  const selectedPricingItems = rubricOptions.filter((item) => selectedPricing.includes(item.id));
  const selectedAdhesionItem = selectedPricingItems.find((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);

    const plan = paymentPlans.find((p) => p.id === planId);
    if (plan && selectedPlayer) {
      setDevise("US");
      setSelectedPricing((current) => applyAutoAdhesionForPlayer(selectedPlayer, current, rubricOptions));
    }
  };

  const selectedPlanData = paymentPlans.find((plan) => plan.id === selectedPlan);
  const isTiToro = selectedAdhesionItem ? (selectedAdhesionItem.rubrique.toLowerCase().includes("ti toro") || selectedAdhesionItem.id === "adhesion-ti") : false;

  const baseTotalDue = useMemo(() => {
    if (selectedPricingItems.length === 0 && !selectedPlan) {
      return 0;
    }

    const nonAdhesionSum = selectedPricingItems
      .filter((item) => !item.estAdhesion && item.id !== "adhesion-fc" && item.id !== "adhesion-ti")
      .reduce((sum, item) => sum + item.montant, 0);

    let adhesionBase = 0;
    if (selectedPlanData) {
      const isTi = selectedAdhesionItem
        ? (selectedAdhesionItem.rubrique.toLowerCase().includes("ti toro") || selectedAdhesionItem.id === "adhesion-ti")
        : ((selectedPlayer?.categorie || "").toLowerCase().includes("ti toro") || (selectedPlayer?.programme || "").toLowerCase().includes("ti toro"));
      
      const fullPlanYearUSD = isTi ? selectedPlanData.montantTIToro : selectedPlanData.montantFCToro;
      adhesionBase = (selectedPlanData.id === "semestriel" || selectedPlanData.id === "mensuel")
        ? fullPlanYearUSD * selectedPlanData.nombreVersements
        : fullPlanYearUSD;
    } else if (selectedAdhesionItem) {
      adhesionBase = selectedAdhesionItem.montant;
    } else if (selectedPricingItems.some((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti")) {
      adhesionBase = isTiToro ? 1000 : 1350;
    }

    // Additional discount applied on top of adhesionBase
    const extraRabaisDecimal = Math.max(0, Math.min(100, rabaisPercent || 0)) / 100;
    const extraRabaisAmount = adhesionBase * extraRabaisDecimal;
    const adhesionAfterExtraRabais = Math.max(0, adhesionBase - extraRabaisAmount);

    return adhesionAfterExtraRabais + nonAdhesionSum;
  }, [selectedPricingItems, selectedPlan, selectedPlanData, selectedPlayer, isTiToro, selectedAdhesionItem, rabaisPercent]);

  // Filter past payments for selected player
  const playerPastPayments = useMemo(() => {
    if (!playerId) return [];
    return (payments || []).filter(
      (p: any) => String(p.etudiantId) === String(playerId) || String(p.etudiant_id) === String(playerId)
    );
  }, [payments, playerId]);

  // Calculate cumulative paid in USD from past payments
  const pastPaidUSD = useMemo(() => {
    return playerPastPayments.reduce((sum: number, p: any) => {
      const pTaux = Number(p.taux) || 0;
      let valUS = 0;
      if (p.devise === "US" || p.montantUS || p.MntPayeUS) {
        valUS = Number(p.montantUS || p.MntPayeUS || p.montant || 0);
      } else if (p.devise === "HTG" || p.montantHTG || p.MntPayeGd) {
        const valHTG = Number(p.montantHTG || p.MntPayeGd || p.montant || 0);
        valUS = pTaux > 0 ? valHTG / pTaux : (taux > 0 ? valHTG / taux : 0);
      }
      return sum + valUS;
    }, 0);
  }, [playerPastPayments, taux]);

  // Balance remaining in USD BEFORE this current payment
  const currentSoldeDueUSD = useMemo(() => {
    return Math.max(0, baseTotalDue - pastPaidUSD);
  }, [baseTotalDue, pastPaidUSD]);

  // Solde converted to selected devise (US or HTG)
  const currentSoldeDueInSelectedDevise = useMemo(() => {
    if (devise === "HTG") {
      return taux > 0 ? currentSoldeDueUSD * taux : 0;
    }
    return currentSoldeDueUSD;
  }, [currentSoldeDueUSD, devise, taux]);

  // Amount paid TODAY converted to USD
  const amountGivenUSD = useMemo(() => {
    const mDonneNum = Number(montantDonne) || 0;
    if (devise === "HTG") {
      return taux > 0 ? mDonneNum / taux : 0;
    }
    return mDonneNum;
  }, [montantDonne, devise, taux]);

  // Balance remaining AFTER this current payment
  const soldeAfterPaymentUSD = useMemo(() => {
    return Math.max(0, currentSoldeDueUSD - amountGivenUSD);
  }, [currentSoldeDueUSD, amountGivenUSD]);

  const soldeAfterPaymentHTG = useMemo(() => {
    return taux > 0 ? soldeAfterPaymentUSD * taux : 0;
  }, [soldeAfterPaymentUSD, taux]);

  const discountedDue = baseTotalDue; // rétrocompatibilité interne

  const isBoursier = useMemo(() => {
    return !!(selectedPlayer && (selectedPlayer.statutJoueur || "").toLowerCase().includes("bourse"));
  }, [selectedPlayer]);

  const hasPricingItems = selectedPricingItems.length > 0 || !!selectedPlan;

  // Réinitialiser le verrou si la devise, le taux, ou le solde change
  useEffect(() => {
    setIsUserEditedMontantDu(false);
  }, [devise, taux, baseTotalDue, currentSoldeDueInSelectedDevise]);

  useEffect(() => {
    if (isBoursier) return;

    if (hasPricingItems) {
      if (!isUserEditedMontantDu) {
        setMontantDuManuel(currentSoldeDueInSelectedDevise);
      }
    } else {
      if (!isUserEditedMontantDu) setMontantDuManuel("");
      if (!isUserEditedMontantDonne) setMontantDonne("");
    }
  }, [isBoursier, hasPricingItems, currentSoldeDueInSelectedDevise, devise, taux, isUserEditedMontantDonne, isUserEditedMontantDu]);

  const remainingAmount = Math.max(0, (Number(montantDuManuel) || 0) - (Number(montantDonne) || 0));

  const getPlayerStatusInfo = (status: string | null | undefined) => {
    const baseClassName =
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";

    if (!status?.trim()) {
      return {
        label: "Aucun statut",
        className: `${baseClassName} border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`,
      };
    }

    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus.includes("demi")) {
      return {
        label: "Demi-bourse (50%)",
        className: `${baseClassName} border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400`,
      };
    }

    if (normalizedStatus.includes("bourse") || normalizedStatus.includes("boursier")) {
      return {
        label: "Bourse (100%)",
        className: `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400`,
      };
    }

    if (normalizedStatus === "inactif" || normalizedStatus === "normal" || normalizedStatus === "aucun") {
      return {
        label: normalizedStatus === "aucun" ? "Aucun statut" : status,
        className: `${baseClassName} border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`,
      };
    }

    return {
      label: status,
      className: `${baseClassName} border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400`,
    };
  };

  const playerStatusInfo = getPlayerStatusInfo(selectedPlayer?.statutJoueur);



  const handlePaymentPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const newPreviews: { file: File; url: string; name: string; isPdf: boolean }[] = [];
    let hasError = false;

    for (const file of selectedFiles) {
      const validation = validatePaymentPhotoFile(file);
      if (!validation.valid) {
        setPaymentPhotoError(validation.error ?? "Erreur de validation d'un fichier.");
        hasError = true;
        break;
      }
      newPreviews.push({
        file,
        url: getPaymentPhotoPreviewUrl(file) || "",
        name: file.name,
        isPdf: isPdfProof(file.name),
      });
    }

    if (!hasError) {
      setPaymentPhotos((prev) => [...prev, ...selectedFiles]);
      setPaymentPhotoPreviews((prev) => [...prev, ...newPreviews]);
      setPaymentPhotoError(null);
    }
    event.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPaymentPhotoPreviews((prev) => {
      const item = prev[index];
      if (item?.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== index);
    });
    setPaymentPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => {
      paymentPhotoPreviews.forEach((p) => {
        if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
      });
    };
  }, [paymentPhotoPreviews]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-7xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Ajouter un paiement
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Saisissez les informations du nouveau paiement
            </p>
          </div>
        </div>

        {toast && (
          <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Recherche Joueur */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Joueur
              </label>
              <div ref={searchContainerRef} className="relative">
                <input
                  type="text"
                  value={playerSearch}
                  onChange={(event) => {
                    setPlayerSearch(event.target.value);
                    setShowPlayerDropdown(true);
                  }}
                  onFocus={() => setShowPlayerDropdown(true)}
                  placeholder={
                    selectedPlayer
                      ? `${getPlayerFullName(selectedPlayer)}${
                          selectedPlayer.matricule ? ` (${selectedPlayer.matricule})` : ""
                        }`
                      : "Rechercher un joueur..."
                  }
                  className={inputClassName}
                />
                {showPlayerDropdown && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {filteredPlayers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        Aucun joueur trouvé.
                      </div>
                    ) : (
                      filteredPlayers.map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelectPlayer(player)}
                          className={`flex w-full flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            player.id === playerId
                              ? "bg-brand-50 dark:bg-brand-500/10"
                              : ""
                          }`}
                        >
                          <span className={`font-medium text-gray-800 dark:text-white/90 ${player.id === playerId ? "font-semibold" : ""}`}>
                            {getPlayerFullName(player)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {player.matricule ? `Code: ${player.matricule}` : "Sans code"}
                            {` • ${player.categorie} • ${player.poste}`}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedPlayer && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                      <span className="font-bold">{getPlayerFullName(selectedPlayer)}</span>
                    </p>
                    <p className="text-xs text-brand-700 dark:text-brand-300">
                      {selectedPlayer.matricule ? `Code: ${selectedPlayer.matricule}` : "Sans code"}
                      {` • ${selectedPlayer.categorie} • ${selectedPlayer.poste}`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-brand-700 dark:text-brand-300">
                        Statut joueur:
                      </span>
                      <span className={playerStatusInfo.className}>
                        {playerStatusInfo.label}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerId("");
                      setPlayerSearch("");
                      const otherAdhesionIds = rubricOptions
                        .filter((r) => r.estAdhesion || r.id === "adhesion-fc" || r.id === "adhesion-ti")
                        .map((r) => r.id);
                      setSelectedPricing((current) => current.filter((id) => !otherAdhesionIds.includes(id)));
                    }}
                    className="rounded-full p-1 text-brand-600 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-500/20"
                    title="Changer de joueur"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                 </div>
               )}
            </div>

            {/* Rubriques (masquées pour les boursiers) */}
            {!isBoursier && (
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Rubriques
                </label>
                <div className="max-h-48 overflow-auto rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                  {rubricOptions.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-3 border-b border-gray-100 px-4 py-2.5 last:border-b-0 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPricing.includes(item.id)}
                        onChange={() => handlePricingChange(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {item.rubrique}
                          </span>
                          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                            ${item.montant}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {item.precision}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Choisissez une adhésion FC/TI et autant d'autres rubriques que nécessaire.
                </p>
                {selectedPricingItems.length > 0 && (
                  <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 dark:bg-brand-500/10">
                    <p className="text-sm font-medium text-brand-900 dark:text-brand-100">
                      Sélection: {selectedPricingItems.map((item) => item.rubrique).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Rabais sur adhésion */}
            {!isBoursier && (
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Rabais additionnel (%)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative max-w-[140px]">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rabaisPercent === 0 ? "" : rabaisPercent}
                      onChange={(event) => setRabaisPercent(event.target.value === "" ? 0 : Number(event.target.value))}
                      className={inputClassName}
                      placeholder="Ex: 10"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 font-medium sm:text-sm">%</span>
                    </div>
                  </div>
                  
                  {rabaisPercent > 0 && (() => {
                    const isTi = selectedAdhesionItem
                      ? (selectedAdhesionItem.rubrique.toLowerCase().includes("ti toro") || selectedAdhesionItem.id === "adhesion-ti")
                      : ((selectedPlayer?.categorie || "").toLowerCase().includes("ti toro") || (selectedPlayer?.programme || "").toLowerCase().includes("ti toro"));
                    const basePlanVal = selectedPlanData
                      ? (selectedPlanData.id === "semestriel" || selectedPlanData.id === "mensuel"
                          ? (isTi ? selectedPlanData.montantTIToro : selectedPlanData.montantFCToro) * selectedPlanData.nombreVersements
                          : (isTi ? selectedPlanData.montantTIToro : selectedPlanData.montantFCToro))
                      : (selectedAdhesionItem ? selectedAdhesionItem.montant : (isTi ? 1000 : 1350));
                    const rabaisAmt = +(basePlanVal * rabaisPercent / 100).toFixed(2);
                    const afterRabais = +(basePlanVal - rabaisAmt).toFixed(2);
                    return (
                      <div className="flex items-center gap-3 pl-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                          <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                            Nouveau tarif adhésion : ${afterRabais}
                          </span>
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            Remise de ${rabaisAmt} <span className="ml-1 line-through opacity-70">${basePlanVal}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  Ce rabais additionnel (ex: 10% rabais de fratrie / promotion) s'applique en plus du tarif du plan sélectionné.
                </p>
              </div>
            )}

            {/* Montant dû, montant versé, devise (masqués pour les boursiers) */}
            {!isBoursier && (
              <>
                <div className="md:col-span-2 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/40 dark:bg-brand-950/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-brand-100 dark:border-brand-900/30 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-900 dark:text-brand-300">
                      Calcul & Conversion du Solde
                    </span>
                    {pastPaidUSD > 0 && (
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Historique déjà réglé : <strong className="text-emerald-600">${pastPaidUSD.toFixed(2)} USD</strong>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Devise du règlement actuel
                      </label>
                      <select
                        value={devise}
                        onChange={(event) => setDevise(event.target.value as "US" | "HTG")}
                        className={selectClassName}
                      >
                        <option value="US">Dollar US ($)</option>
                        <option value="HTG">Gourde HTG (Gdes)</option>
                      </select>
                    </div>

                    {devise === "HTG" ? (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Taux de change (ex: 132 HTG / 1$)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={taux || ""}
                          onChange={(event) => setTaux(event.target.value === "" ? 0 : parseFloat(event.target.value) || 0)}
                          placeholder="Ex: 132"
                          className={inputClassName}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col justify-end text-xs text-gray-500 pb-1">
                        <span>Paiement direct en Dollars US ($)</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Taux par défaut : 1 USD = 1 USD</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-brand-100 dark:border-brand-900/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-gray-500">Solde avant ce paiement :</span>
                      <strong className="text-sm text-gray-900 dark:text-white">
                        {devise === "HTG" && taux > 0
                          ? `${(currentSoldeDueUSD * taux).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Gdes ($${currentSoldeDueUSD.toFixed(2)})`
                          : `$${currentSoldeDueUSD.toFixed(2)} USD`}
                      </strong>
                    </div>

                    {montantDonne !== "" && Number(montantDonne) > 0 && (
                      <div>
                        <span className="block text-gray-500">Solde restant APRÈS ce versement :</span>
                        <strong className={`text-sm ${soldeAfterPaymentUSD <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {soldeAfterPaymentUSD <= 0
                            ? "RÉGLÉ EN TOTALITÉ (0.00)"
                            : (devise === "HTG" && taux > 0
                                ? `${soldeAfterPaymentHTG.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Gdes ($${soldeAfterPaymentUSD.toFixed(2)})`
                                : `$${soldeAfterPaymentUSD.toFixed(2)} USD`)}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Montant Dû
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montantDuManuel === 0 ? "" : montantDuManuel}
                    onChange={(event) => {
                      const val = event.target.value;
                      setMontantDuManuel(val === "" ? 0 : Number(val));
                      setIsUserEditedMontantDu(true);
                    }}
                    placeholder="0.00"
                    className={inputClassName}
                  />
                </div>

                {devise === "HTG" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                        Montant Versé Aujourd'hui (Gourdes)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={montantDonne === 0 ? "" : montantDonne}
                        onChange={(event) => {
                          const val = event.target.value;
                          setMontantDonne(val === "" ? 0 : Number(val));
                          setIsUserEditedMontantDonne(true);
                        }}
                        placeholder="0.00"
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                        Équivalent (Dollars USD $)
                      </label>
                      <div className="h-11 w-full rounded-lg border border-emerald-300 bg-emerald-50/60 px-3 flex items-center text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {(() => {
                          const num = Number(montantDonne) || 0;
                          if (num <= 0 || taux <= 0) return "$0.00 USD";
                          const valUS = num / taux;
                          return `$${valUS.toFixed(2)} USD`;
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Montant Versé Aujourd'hui (USD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={montantDonne === 0 ? "" : montantDonne}
                      onChange={(event) => {
                        const val = event.target.value;
                        setMontantDonne(val === "" ? 0 : Number(val));
                        setIsUserEditedMontantDonne(true);
                      }}
                      placeholder="0.00"
                      className={inputClassName}
                    />
                  </div>
                )}
              </>
            )}

            {/* Description */}
            <div className={!isBoursier && devise === "HTG" ? "" : "md:col-span-2"}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Description
              </label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex: Cotisation mensuelle, frais d'inscription..."
                className={inputClassName}
              />
            </div>

            {/* Periode & Statut */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Période (YYYY-MM)
              </label>
              <input
                value={periode}
                onChange={(event) => setPeriode(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Statut
              </label>
              <select
                value={statut}
                onChange={(event) => setStatut(event.target.value as PaymentStatus)}
                className={selectClassName}
              >
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
                <option value="late">En retard</option>
              </select>
            </div>

            {/* Tarif Boursier Spécial OU Plan de paiement standard */}
            {isBoursier ? (
              <div className="md:col-span-2 rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500"></span>
                  <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                    Tarif Boursier (2,500 HTG / mois)
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Mensualité Boursier
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="2,500 HTG / mois"
                      className="h-10 w-full rounded-lg border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-950 shadow-sm dark:border-emerald-700 dark:bg-gray-800 dark:text-emerald-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Nombre de mois payés
                    </label>
                    <select
                      value={nombreDeMois}
                      onChange={(e) => setNombreDeMois(Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-950 shadow-sm dark:border-emerald-700 dark:bg-gray-800 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                        <option key={m} value={m}>
                          {m} mois ({(m * 2500).toLocaleString()} HTG)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-emerald-100/70 p-2.5 dark:bg-emerald-900/40">
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    💡 Total Boursier dû :{" "}
                    <span className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                      {(nombreDeMois * 2500).toLocaleString()} HTG
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Plan de paiement
                </label>
                <select
                  value={selectedPlan}
                  onChange={(event) => handlePlanChange(event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Sélectionner un plan</option>
                  {paymentPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.plan} - {plan.avantage}
                    </option>
                  ))}
                </select>

                {selectedPlan === "mensuel" && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Nombre de mois réglés
                    </label>
                    <select
                      value={nombreDeMois}
                      onChange={(e) => setNombreDeMois(Number(e.target.value))}
                      className={selectClassName}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                        <option key={m} value={m}>
                          {m} mois ({m} × ${isTiToro ? 115 : 155} = ${m * (isTiToro ? 115 : 155)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedPlanData && selectedPlan !== "annuel" && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800/60 dark:bg-gray-800/20">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white">{selectedPlanData.plan}</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{selectedPlanData.modalites}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 px-4 py-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {selectedPlan === "mensuel" ? "Mensualité" : "Acompte requis"}
                        </p>
                        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                          {devise === "HTG" 
                            ? `${(selectedPlan === "mensuel" ? (Number(montantDuManuel) || 0) / 9 : (Number(montantDuManuel) || 0) / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`
                            : `$${(selectedPlan === "mensuel" ? (Number(montantDuManuel) || 0) / 9 : (Number(montantDuManuel) || 0) / 2).toFixed(2)}`}
                        </p>
                        <span className="mt-1.5 inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                          {selectedPlanData.avantage}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Dette Annuelle
                        </p>
                        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                          {devise === "HTG"
                            ? `${(Number(montantDuManuel) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`
                            : `$${(Number(montantDuManuel) || 0).toFixed(2)}`}
                        </p>
                        <span className="mt-1.5 block text-[10px] text-gray-400 dark:text-gray-500">
                          {selectedPlan === "mensuel" ? "Total sur 9 mois" : "Total sur 2 versements"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Méthode de paiement
              </label>
              <select
                value={methode}
                onChange={(event) => setMethode(event.target.value as PaymentMethod)}
                className={selectClassName}
              >
                <option value="virement">Virement</option>
                <option value="carte">Carte bancaire</option>
                <option value="especes">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="mobile">Dépôt bancaire</option>
              </select>
            </div>


            {/* Date Paiement */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Date de paiement
              </label>
              <input
                type="date"
                value={datePaiement}
                onChange={(event) => setDatePaiement(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                Pièces justificatives / documents scannés (JPG, PNG, PDF... max 10 Mo par fichier)
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
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {paymentPhotoPreviews.map((item, idx) => (
                  <div key={idx} className="relative flex items-center gap-2.5 p-2 rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-800">
                    {item.isPdf ? (
                      <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-900/40">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    ) : (
                      <img src={item.url} alt={item.name} className="h-12 w-12 shrink-0 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Pièce #{idx + 1} • {item.isPdf ? "PDF" : "Image"}
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

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
