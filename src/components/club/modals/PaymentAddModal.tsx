"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus, Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { addPaymentToSupabase, addInvoiceToSupabase, updatePlayerInSupabase } from "@/lib/club/supabase-crud";
import { validatePaymentPhotoFile, getPaymentPhotoPreviewUrl, uploadPaymentPhotoToSupabase } from "@/lib/club/payment-photo-utils";
import { calculateDiscountedAmount, serializeReductionMetadata, type PaymentReductionType } from "@/lib/club/payment-reduction-utils";
import { generateReceiptPDFBase64 } from "@/lib/club/pdf-generator";

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

const adhesionOptions = pricingItems.filter((item) => item.id === "adhesion-fc" || item.id === "adhesion-ti");
const rubricOptions = pricingItems;

export function PaymentAddModal({ isOpen, onClose }: PaymentAddModalProps) {
  const { players, setPayments, setPlayers } = useClubData();
  const [playerId, setPlayerId] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [montantDonne, setMontantDonne] = useState(0);
  const [devise, setDevise] = useState<"US" | "HTG">("US");
  const [taux, setTaux] = useState(0);
  const [description, setDescription] = useState("");
  const [periode, setPeriode] = useState(currentPeriod());
  const [statut, setStatut] = useState<PaymentStatus>("pending");
  const [methode, setMethode] = useState<PaymentMethod>("virement");
  const [datePaiement, setDatePaiement] = useState("");
  const [selectedPricing, setSelectedPricing] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [reductionType, setReductionType] = useState<PaymentReductionType>("none");
  const [customReductionPercent, setCustomReductionPercent] = useState(0);
  const [playerStatus, setPlayerStatus] = useState("");
  const [customStatuses, setCustomStatuses] = useState(["Boursier", "Demi-bourse", "Joueur spécial"]);
  const [newStatus, setNewStatus] = useState("");
  const [paymentPhoto, setPaymentPhoto] = useState<File | null>(null);
  const [paymentPhotoPreview, setPaymentPhotoPreview] = useState<string | null>(null);
  const [paymentPhotoError, setPaymentPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setMontantDonne(0);
    setDevise("US");
    setTaux(0);
    setDescription("");
    setPeriode(currentPeriod());
    setStatut("pending");
    setMethode("virement");
    setDatePaiement("");
    setSelectedPricing([]);
    setSelectedPlan("");
    setReductionType("none");
    setCustomReductionPercent(0);
    setPlayerStatus("");
    setNewStatus("");
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
      alert("Veuillez remplir le joueur, la période et le montant payé.");
      return;
    }
    const hasAdhesion = selectedPricing.some((item) => item === "adhesion-fc" || item === "adhesion-ti");
    if (!hasAdhesion) {
      alert("Veuillez sélectionner une adhésion FC TORO ou TI TORO.");
      return;
    }
    if (!selectedPlan) {
      alert("Veuillez sélectionner un plan de paiement.");
      return;
    }

    setIsSubmitting(true);
    try {
      const plan = paymentPlans.find((item) => item.id === selectedPlan)!;
      const selectedAdhesion = selectedPricing.find((item) => item === "adhesion-fc" || item === "adhesion-ti");
      const isTiToro = selectedAdhesion === "adhesion-ti";
      const totalDue = (isTiToro ? plan.montantTIToro : plan.montantFCToro) * plan.nombreVersements;
      const discountedDue = calculateDiscountedAmount(totalDue, reductionType, customReductionPercent);
      const paymentAmount = devise === "HTG" ? montantDonne : montantDonne;
      const montantUS = devise === "US" ? paymentAmount : (taux > 0 ? paymentAmount / taux : 0);
      const montantHTG = devise === "HTG" ? paymentAmount : 0;
      const adhesionCode = isTiToro ? "TI_TORO" : "FC_TORO";
      const reductionMetadata = serializeReductionMetadata(reductionType, customReductionPercent);
      const selectedRubricsLabel = selectedPricing.filter((item) => item !== "adhesion-fc" && item !== "adhesion-ti").map((item) => pricingItems.find((pricingItem) => pricingItem.id === item)?.rubrique).filter(Boolean).join(", ");
      const paymentMarkers = `[ADHESION:${adhesionCode}] [PLAN:${selectedPlan.toUpperCase()}] [STATUT:${statut.toUpperCase()}]`;
      const adhesionLabel = isTiToro ? "Adhésion: TI TORO" : "Adhésion: FC TORO";
      const finalRemarque = `${paymentMarkers} ${reductionMetadata ? `${reductionMetadata} ` : ""}${playerStatus ? `[${playerStatus}] ` : ""}${description.trim()} ${adhesionLabel}${selectedRubricsLabel ? ` | Rubriques: ${selectedRubricsLabel}` : ""} Plan: ${plan.plan}`.trim();
      const paymentPhotoUrl = paymentPhoto ? await uploadPaymentPhotoToSupabase(paymentPhoto) : null;
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
        datePaiement: statut === "paid" ? datePaiement || undefined : undefined,
      };

      await addInvoiceToSupabase({
        noFacture: `FAC-${Date.now()}`,
        playerId,
        sessionId: "1",
        remarque: finalRemarque,
        montantAPayer: discountedDue,
        montantPaye: paymentAmount,
        montantUS,
        montantHTG,
        devise,
        statut,
        dateFacture: new Date().toISOString(),
        datePaiement: dataToInsert.datePaiement,
      });
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
            selectedPlayer.parentAdresse || selectedPlayer.adresse || ""
          );
          
          const emailToSend = selectedPlayer.parentEmail || selectedPlayer.email;
          if (emailToSend) {
            const mntStr = devise === "HTG" ? montantDonne + " HTG" : montantDonne + " USD";
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
                amount: mntStr
              }),
            });
          }
        }
      } catch (err) {
        console.error("Erreur lors de l'envoi du reçu par email:", err);
      }
      // ------------------------

      if (playerStatus) {
        await updatePlayerInSupabase(playerId, { statutJoueur: playerStatus });
        setPlayers((prevPlayers) => prevPlayers.map((player) =>
          player.id === playerId ? { ...player, statutJoueur: playerStatus } : player,
        ));
      }
      handleClose();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajout du paiement. Veuillez réessayer.");
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

      const isAdhesion = itemId === "adhesion-fc" || itemId === "adhesion-ti";
      if (isAdhesion) {
        return [...current.filter((value) => value !== "adhesion-fc" && value !== "adhesion-ti"), itemId];
      }

      return [...current, itemId];
    });
  };

  const selectedPricingItems = rubricOptions.filter((item) => selectedPricing.includes(item.id));
  const selectedAdhesionItem = adhesionOptions.find((item) => item.id === selectedPricing.find((value) => value === "adhesion-fc" || value === "adhesion-ti"));

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    const plan = paymentPlans.find((p) => p.id === planId);
    if (plan && selectedPlayer) {
      setDevise("US");
    }
  };

  const selectedPlanData = paymentPlans.find((plan) => plan.id === selectedPlan);
  const selectedAdhesion = selectedPricing.find((item) => item === "adhesion-fc" || item === "adhesion-ti");
  const isTiToro = selectedAdhesion === "adhesion-ti";
  const totalDue = selectedPlanData
    ? (isTiToro ? selectedPlanData.montantTIToro : selectedPlanData.montantFCToro) * selectedPlanData.nombreVersements
    : 0;
  const discountedDue = selectedPlanData
    ? calculateDiscountedAmount(
        (isTiToro ? selectedPlanData.montantTIToro : selectedPlanData.montantFCToro) * selectedPlanData.nombreVersements,
        reductionType,
        customReductionPercent,
      )
    : 0;
  const remainingAmount = Math.max(0, discountedDue - montantDonne);

  const handleAddStatus = () => {
    const value = newStatus.trim();
    if (value && !customStatuses.includes(value)) setCustomStatuses((current) => [...current, value]);
    if (value) setPlayerStatus(value);
    setNewStatus("");
  };

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
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-3xl">
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

            {/* Rubriques */}
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
                Choisissez une adhésion FC/TI et autant d’autres rubriques que nécessaire.
              </p>
              {selectedPricingItems.length > 0 && (
                <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 dark:bg-brand-500/10">
                  <p className="text-sm font-medium text-brand-900 dark:text-brand-100">
                    Sélection: {selectedPricingItems.map((item) => item.rubrique).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Montant dû, montant versé et balance */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Montant dû
              </label>
              <input
                type="number"
                value={discountedDue}
                className={inputClassName}
                readOnly
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Montant donné</label>
              <input type="number" min={0} step="0.01" value={montantDonne} onChange={(event) => setMontantDonne(Number(event.target.value))} className={inputClassName} />
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
                  value={taux}
                  onChange={(event) => setTaux(Number(event.target.value))}
                  className={inputClassName}
                />
              </div>
            )}

            {/* Description */}
            <div className={devise === "HTG" ? "" : "md:col-span-2"}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Description / Remarque
              </label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex: Cotisation mensuelle, Boursier..."
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

            {/* Plan de paiement & Methode */}
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
                <option value="mobile">Paiement Mobile</option>
              </select>
            </div>

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

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Statut du joueur</label>
              <select value={playerStatus} onChange={(event) => setPlayerStatus(event.target.value)} className={selectClassName}>
                <option value="">Sélectionner un statut</option>
                {customStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <input value={newStatus} onChange={(event) => setNewStatus(event.target.value)} placeholder="Nouveau statut..." className={inputClassName} />
              <button type="button" onClick={handleAddStatus} className="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white">Ajouter</button>
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
