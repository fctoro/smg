"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus, Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { addPaymentToSupabase, addInvoiceToSupabase } from "@/lib/club/supabase-crud";
import { validatePaymentPhotoFile, getPaymentPhotoPreviewUrl, uploadPaymentPhotoToSupabase } from "@/lib/club/payment-photo-utils";
import { calculateDiscountedAmount, serializeReductionMetadata, type PaymentReductionType } from "@/lib/club/payment-reduction-utils";
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

interface PaymentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentAddModal({ isOpen, onClose }: PaymentAddModalProps) {
  const { players, setPayments, rubriques } = useClubData();

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
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [montantDuManuel, setMontantDuManuel] = useState(0);
  const [montantDonne, setMontantDonne] = useState(0);
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
  const [isUserEditedMontantDonne, setIsUserEditedMontantDonne] = useState(false);
  const [reductionType, setReductionType] = useState<PaymentReductionType>("none");
  const [customReductionPercent, setCustomReductionPercent] = useState(0);
  const [paymentPhoto, setPaymentPhoto] = useState<File | null>(null);
  const [paymentPhotoPreview, setPaymentPhotoPreview] = useState<string | null>(null);
  const [paymentPhotoError, setPaymentPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [players, playerId]
  );

  // Cocher automatiquement l'adhésion Ti Toro ou FC Toro lors du choix d'un joueur
  useEffect(() => {
    if (!selectedPlayer) return;
    const cat = (selectedPlayer.categorie || "").toLowerCase();
    const isTiToroPlayer = cat.includes("ti toro") || cat.includes("titoro") || cat.includes("u6-u8");
    const targetAdhesion = adhesionOptions.find((item) => {
      const name = (item.rubrique || "").toLowerCase();
      return isTiToroPlayer
        ? name.includes("ti toro") || item.id === "adhesion-ti"
        : (name.includes("fc toro") && !name.includes("ti")) || item.id === "adhesion-fc";
    });
    if (targetAdhesion) {
      setSelectedPricing((prev) => {
        const otherPricing = prev.filter(
          (id) => !adhesionOptions.some((adh) => adh.id === id)
        );
        return [...otherPricing, targetAdhesion.id];
      });
    }
  }, [selectedPlayer, adhesionOptions]);

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
    setMontantDuManuel(0);
    setMontantDonne(0);
    setDevise("US");
    setTaux(0);
    setDescription("");
    setPeriode(currentPeriod());
    setStatut("pending");
    setMethode("virement");
    setDatePaiement(new Date().toISOString().split("T")[0]);
    setSelectedPricing([]);
    setSelectedPlan("");
    setIsUserEditedMontantDonne(false);
    setReductionType("none");
    setCustomReductionPercent(0);
    setPaymentPhoto(null);
    setPaymentPhotoPreview(null);
    setPaymentPhotoError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!playerId || !periode || montantDonne <= 0 || (devise === "HTG" && taux <= 0)) {
      setToast({ message: "Veuillez remplir le joueur, la période et le montant payé.", type: "error" });
      return;
    }
    const hasAdhesion = selectedPricingItems.some((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");
    if (!hasAdhesion) {
      setToast({ message: "Veuillez sélectionner une adhésion FC TORO ou TI TORO.", type: "error" });
      return;
    }
    if (!selectedPlan) {
      setToast({ message: "Veuillez sélectionner un plan de paiement.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const plan = paymentPlans.find((item) => item.id === selectedPlan)!;
      const selectedAdhesionItem = selectedPricingItems.find((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");
      const isTiToro = selectedAdhesionItem ? (selectedAdhesionItem.rubrique.toLowerCase().includes("ti toro") || selectedAdhesionItem.id === "adhesion-ti") : false;
      const nonAdhesionSum = selectedPricingItems
        .filter((item) => !item.estAdhesion && item.id !== "adhesion-fc" && item.id !== "adhesion-ti")
        .reduce((sum, item) => sum + item.montant, 0);
      const totalDue = plan ? (isTiToro ? plan.montantTIToro : plan.montantFCToro) : (selectedAdhesionItem?.montant || 0) + nonAdhesionSum;
      const discountedDue = calculateDiscountedAmount(totalDue, reductionType, customReductionPercent);
      
      const finalMontantAPayer = devise === "HTG" ? montantDuManuel : montantDuManuel;
      const paymentAmount = devise === "HTG" ? montantDonne : montantDonne;
      const montantUS = devise === "US" ? paymentAmount : (taux > 0 ? paymentAmount / taux : 0);
      const montantHTG = devise === "HTG" ? paymentAmount : 0;
      const adhesionCode = isTiToro ? "TI_TORO" : "FC_TORO";
      const selectedAdhesionTitle = selectedAdhesionItem?.rubrique || "Adhésion";
      const selectedRubricsLabel = selectedPricingItems
        .filter((item) => !item.estAdhesion && item.id !== "adhesion-fc" && item.id !== "adhesion-ti")
        .map((item) => item.rubrique)
        .filter(Boolean).join(", ");
      const reductionMetadata = serializeReductionMetadata(reductionType, customReductionPercent);
      const paymentMarkers = `[ADHESION:${adhesionCode}] [PLAN:${selectedPlan.toUpperCase()}] [STATUT:${statut.toUpperCase()}]`;
      const adhesionLabel = isTiToro ? "Adhésion: TI TORO" : "Adhésion: FC TORO";
      const finalRemarque = `${paymentMarkers} ${reductionMetadata ? `${reductionMetadata} ` : ""}${description.trim()} ${adhesionLabel}${selectedRubricsLabel ? ` | Rubriques: ${selectedRubricsLabel}` : ""} Plan: ${plan.plan}`.trim();
      
      const actualDatePaiement = datePaiement || new Date().toISOString().split("T")[0];
      const uploadPromise = paymentPhoto ? uploadPaymentPhotoToSupabase(paymentPhoto) : Promise.resolve(null);
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

        const [paymentPhotoUrl] = await Promise.all([
          uploadPromise,
          addInvoiceToSupabase(invoiceData).catch((err) => {
            console.warn("Erreur lors de la création de la facture (silencieuse):", err);
            return null;
          })
        ]);
        
        const paymentPhotoNote = paymentPhotoUrl ? ` [JUSTIFICATIF:${paymentPhotoUrl}]` : paymentPhoto ? ` [JUSTIFICATIF:${paymentPhoto.name}]` : "";
        const finalRemarqueWithPhoto = `${finalRemarque}${paymentPhotoNote}`.trim();
        
        const dataToInsert = {
          playerId,
          montant: paymentAmount,
          montantUS,
          montantHTG,
          devise,
          taux: devise === "HTG" ? taux : undefined,
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

          const receiptBase64 = await generateReceiptPDFBase64(
            selectedPlayer,
            [paymentForPdf],
            parentNom,
            parentPrenom,
            selectedPlayer.parentTelephone || "",
            selectedPlayer.parentEmail || selectedPlayer.email || "",
            selectedPlayer.parentAdresse || selectedPlayer.adresse || "",
            paymentPhotoPreview
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
            const mntStr = devise === "HTG" ? `${montantDonne} HTG` : `${montantDonne} USD`;
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

    const hasAdhesion = selectedPricingItems.some((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");

    let adhesionAmount = 0;
    if (hasAdhesion || selectedPlan) {
      adhesionAmount = isTiToro ? 1000 : 1350;
      if (selectedPlan === "annuel") {
        adhesionAmount = isTiToro ? 900 : 1215;
      } else if (selectedAdhesionItem) {
        adhesionAmount = selectedAdhesionItem.montant;
      }
    }

    return adhesionAmount + nonAdhesionSum;
  }, [selectedPricingItems, selectedPlan, isTiToro, selectedAdhesionItem]);

  const discountedDue = useMemo(() => {
    return calculateDiscountedAmount(baseTotalDue, reductionType, customReductionPercent);
  }, [baseTotalDue, reductionType, customReductionPercent]);

  const isBoursier = useMemo(() => {
    return !!(selectedPlayer && (selectedPlayer.statutJoueur || "").toLowerCase().includes("bourse"));
  }, [selectedPlayer]);

  const computedDue = useMemo(() => {
    if (isBoursier) {
      const boursierHTG = nombreDeMois * 2500;
      return boursierHTG; // Toujours en HTG pour les boursiers
    }
    if (devise === "HTG" && taux > 0) {
      return discountedDue * taux;
    }
    return discountedDue;
  }, [isBoursier, nombreDeMois, discountedDue, devise, taux]);

  useEffect(() => {
    setMontantDuManuel(computedDue);
    setMontantDonne(computedDue);
  }, [computedDue]);

  const hasPricingItems = selectedPricingItems.length > 0;

  useEffect(() => {
    if (isBoursier) return; // Preserve boursier computed amount
    if (isUserEditedMontantDonne) return; // Preserve manual user input

    if (hasPricingItems) {
      setMontantDonne(computedDue);
    } else {
      setMontantDonne(0);
    }
  }, [isBoursier, hasPricingItems, computedDue, isUserEditedMontantDonne]);

  const remainingAmount = Math.max(0, montantDuManuel - montantDonne);

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
    const file = event.target.files?.[0] ?? null;
    const validation = validatePaymentPhotoFile(file);

    if (!validation.valid) {
      setPaymentPhoto(null);
      setPaymentPhotoPreview(null);
      setPaymentPhotoError(validation.error ?? "Erreur de validation du fichier.");
      return;
    }

    if (paymentPhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(paymentPhotoPreview);
    }

    const previewUrl = getPaymentPhotoPreviewUrl(file);
    setPaymentPhoto(file);
    setPaymentPhotoPreview(previewUrl);
    setPaymentPhotoError(null);
  };

  useEffect(() => {
    return () => {
      if (paymentPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(paymentPhotoPreview);
      }
    };
  }, [paymentPhotoPreview]);

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

            {/* Montant dû, montant versé, devise (masqués pour les boursiers) */}
            {!isBoursier && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Montant dû
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montantDuManuel || ""}
                    onChange={(event) => setMontantDuManuel(Number(event.target.value))}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Montant donné</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montantDonne || ""}
                    onChange={(event) => {
                      setMontantDonne(Number(event.target.value));
                      setIsUserEditedMontantDonne(true);
                    }}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Montant restant</label>
                  <input type="number" value={remainingAmount} className={inputClassName} readOnly />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Devise
                  </label>
                  <select
                    value={devise}
                    onChange={(event) => setDevise(event.target.value as "US" | "HTG")}
                    className={selectClassName}
                  >
                    <option value="US">Dollar US ($)</option>
                    <option value="HTG">Gourde HTG (G)</option>
                  </select>
                </div>
                {devise === "HTG" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Taux de change
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={taux || ""}
                      onChange={(event) => setTaux(Number(event.target.value))}
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
                <option value="mobile">Paiement Mobile</option>
              </select>
            </div>

            {!isBoursier && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Réduction
                  </label>
                  <select
                    value={reductionType}
                    onChange={(event) => setReductionType(event.target.value as PaymentReductionType)}
                    className={selectClassName}
                  >
                    <option value="none">Aucune réduction</option>
                    <option value="full">Bourse 100%</option>
                    <option value="half">Demi-bourse 50%</option>
                    <option value="custom">Spécial</option>
                  </select>
                </div>
                {reductionType === "custom" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Pourcentage spécial
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="1"
                      value={customReductionPercent}
                      onChange={(event) => setCustomReductionPercent(Number(event.target.value))}
                      className={inputClassName}
                    />
                  </div>
                )}
              </>
            )}

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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Photo du paiement / justificatif (JPG, PNG, WEBP, max 5 Mo)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handlePaymentPhotoChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600"
            />
            {paymentPhotoError && <p className="mt-2 text-sm text-red-600">{paymentPhotoError}</p>}
            {paymentPhoto && !paymentPhotoError && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">Fichier sélectionné : {paymentPhoto.name}</span>
                {paymentPhotoPreview && (
                  <img src={paymentPhotoPreview} alt="Aperçu du justificatif" className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                )}
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
