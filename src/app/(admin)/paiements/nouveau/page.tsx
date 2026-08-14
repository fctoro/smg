"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus, Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { addPaymentToSupabase, addInvoiceToSupabase } from "@/lib/club/supabase-crud";
import { validatePaymentPhotoFile, getPaymentPhotoPreviewUrl, uploadPaymentPhotoToSupabase } from "@/lib/club/payment-photo-utils";

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
}

interface PaymentPlan {
  id: string;
  plan: string;
  modalites: string;
  montantFCToro: number;
  montantTIToro: number;
  avantage: string;
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
  },
  {
    id: "semestriel",
    plan: "Semestriel",
    modalites: "2 versements égaux : inscription & janvier",
    montantFCToro: 641.25,
    montantTIToro: 475,
    avantage: "5% de rabais",
  },
  {
    id: "mensuel",
    plan: "Mensuel",
    modalites: "9 versements, de septembre à mai, payables avant le 10 de chaque mois",
    montantFCToro: 155,
    montantTIToro: 115,
    avantage: "Mensualité",
  },
];

export default function NewPaymentPage() {
  const router = useRouter();
  const { players, setPayments, rubriques } = useClubData();

  const pricingItems = useMemo(() => {
    return (rubriques || []).filter((item) => item.actif !== false);
  }, [rubriques]);

  const [playerId, setPlayerId] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [montant, setMontant] = useState(180);
  const [devise, setDevise] = useState<"US" | "HTG">("US");
  const [taux, setTaux] = useState(0);
  const [description, setDescription] = useState("");
  const [periode, setPeriode] = useState(currentPeriod());
  const [statut, setStatut] = useState<PaymentStatus>("pending");
  const [methode, setMethode] = useState<PaymentMethod>("virement");
  const [datePaiement, setDatePaiement] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedPricing, setSelectedPricing] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isUserEditedMontantDonne, setIsUserEditedMontantDonne] = useState(false);
  const [montantDonne, setMontantDonne] = useState<number>(0);
  const [error, setError] = useState<string>("");

  const [paymentPhoto, setPaymentPhoto] = useState<File | null>(null);
  const [paymentPhotoPreview, setPaymentPhotoPreview] = useState<string | null>(null);
  const [paymentPhotoError, setPaymentPhotoError] = useState<string | null>(null);

  const playerOptions = useMemo(() => players, [players]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const playerInputRef = useRef<HTMLInputElement>(null);
  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [players, playerId]
  );

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) return playerOptions.slice(0, 20);
    return playerOptions.filter((player) => {
      const fullName = getPlayerFullName(player).toLowerCase();
      const matricule = (player.matricule || "").toLowerCase();
      return fullName.includes(query) || matricule.includes(query);
    });
  }, [playerOptions, playerSearch]);

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

  useEffect(() => {
    if (playerInputRef.current && selectedPlayer) {
      playerInputRef.current.style.fontWeight = 'bold';
      playerInputRef.current.style.color = 'black';
    } else if (playerInputRef.current) {
      playerInputRef.current.style.fontWeight = '';
      playerInputRef.current.style.color = '';
    }
  }, [selectedPlayer]);



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

  const handleSubmit = async () => {
    setError("");

    // Validation basique
    if (!playerId) {
      const msg = "❌ Erreur: Veuillez sélectionner un joueur.";
      setError(msg);
      alert(msg);
      return;
    }
    if (!periode) {
      const msg = "❌ Erreur: Veuillez entrer la période (format: YYYY-MM).";
      setError(msg);
      alert(msg);
      return;
    }
    const hasAdhesion = selectedPricingItems.some((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");
    if (!hasAdhesion) {
      const msg = "❌ Erreur: Veuillez sélectionner une adhésion FC TORO ou TI TORO.";
      setError(msg);
      alert(msg);
      return;
    }
    if (!selectedPlan) {
      const msg = "❌ Erreur: Veuillez sélectionner un plan de paiement.";
      setError(msg);
      alert(msg);
      return;
    }

    // Si montantDonne est 0 mais qu'il y a un totalRubriques, utiliser totalRubriques
    const finalMontant = montantDonne > 0 ? montantDonne : totalRubriques;
    if (finalMontant <= 0) {
      const msg = "❌ Erreur: Veuillez entrer un montant donné ou sélectionner des rubriques/plan.";
      setError(msg);
      alert(msg);
      return;
    }

    try {
      console.log("🔄 Début de l'ajout du paiement...", {
        playerId,
        paymentAmount: finalMontant,
        devise,
        taux,
        periode,
        statut,
        methode,
        description
      });

      // Use the final calculated amount
      const paymentAmount = finalMontant;
      
      // Convert to USD for storage if in HTG
      const montantUS = devise === "US" ? paymentAmount : (taux > 0 ? paymentAmount / taux : 0);
      const montantHTG = devise === "HTG" ? paymentAmount : 0;
      
      // Only transactions explicitly marked as paid affect the balance.
      const paymentStatus: PaymentStatus = statut;

      const planRemark = selectedPlan ? `Plan: ${paymentPlans.find(p => p.id === selectedPlan)?.plan}` : "";
      const selectedAdhesionItem = selectedPricingItems.find((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");
      const isTiToro = selectedAdhesionItem ? selectedAdhesionItem.rubrique.toLowerCase().includes("ti toro") : false;
      const adhesionRemark = isTiToro ? "Adhésion: TI TORO" : "Adhésion: FC TORO";
      const adhesionCode = isTiToro ? "TI_TORO" : "FC_TORO";
      const planCode = selectedPlan.toUpperCase();
      const statusCode = paymentStatus.toUpperCase();
      const paymentMarkers = `[ADHESION:${adhesionCode}] [PLAN:${planCode}] [STATUT:${statusCode}]`;
      const finalRemarque = `${paymentMarkers} ${description.trim()} ${adhesionRemark} ${planRemark}`.trim();
      const uploadPromise = paymentPhoto ? uploadPaymentPhotoToSupabase(paymentPhoto) : Promise.resolve(null);

      // Create invoice first
      const invoiceData = {
        noFacture: `FAC-${Date.now()}`,
        playerId,
        sessionId: "1",
        montantAPayer: paymentAmount,
        montantPaye: paymentAmount,
        devise,
        dateFacture: new Date().toISOString(),
        datePaiement: datePaiement || new Date().toISOString().split("T")[0],
        remarque: finalRemarque, // We skip the photo in invoice remark to run concurrently
        statut: paymentStatus,
        montantUS: montantUS,
        montantHTG: montantHTG,
      };

      console.log("📄 Création de la facture et upload photo...");
      const [paymentPhotoUrl, invoice] = await Promise.all([
        uploadPromise,
        addInvoiceToSupabase(invoiceData)
      ]);
      console.log("✅ Facture créée:", invoice);

      const paymentPhotoNote = paymentPhotoUrl ? ` [JUSTIFICATIF:${paymentPhotoUrl}]` : paymentPhoto ? ` [JUSTIFICATIF:${paymentPhoto.name}]` : "";
      const finalRemarqueWithPhoto = `${finalRemarque}${paymentPhotoNote}`.trim();

      const dataToInsert = {
        playerId,
        montant: paymentAmount,
        montantUS,
        montantHTG,
        devise,
        taux: devise === "HTG" ? taux : undefined,
        statut: paymentStatus,
        periode,
        methode,
        remarque: finalRemarqueWithPhoto,
        datePaiement: datePaiement || new Date().toISOString().split("T")[0],
        factureId: invoice.Id, // Link to the created invoice
      };

      console.log("📤 Données à insérer:", dataToInsert);

      const inserted = await addPaymentToSupabase(dataToInsert);
      console.log("✅ Réponse de l'insertion:", inserted);
      
      if (!inserted) {
        throw new Error("Paiement non cree. La base de données n'a pas retourné de résultat.");
      }

      setPayments((prevPayments) => [
        {
          id: inserted.Id.toString(),
          ...dataToInsert,
        },
        ...prevPayments,
      ]);


      
      console.log("✅ Paiement ajouté avec succès, redirection...");
      router.push("/paiements");
    } catch (error) {
      const errorMsg = `❌ Erreur lors de l'ajout du paiement:\n${error instanceof Error ? error.message : "Erreur inconnue"}\n\nVérifiez la console pour plus de détails.`;
      console.error("❌ Erreur complète:", error);
      setError(errorMsg);
      alert(errorMsg);
    }
  };

  const handleSelectPlayer = (player: Player) => {
    console.log("✅ Joueur sélectionné:", player.id, getPlayerFullName(player));
    setPlayerId(player.id);
    setPlayerSearch("");
    setShowPlayerDropdown(false);
  };

  const handlePricingChange = (pricingId: string) => {
    setSelectedPricing((prev) => {
      const clickedItem = pricingItems.find((r: PricingItem) => r.id === pricingId);
      const isAdhesion = clickedItem?.estAdhesion || pricingId === "adhesion-fc" || pricingId === "adhesion-ti";

      if (isAdhesion) {
        const otherAdhesionIds = pricingItems
          .filter((r: PricingItem) => r.estAdhesion || r.id === "adhesion-fc" || r.id === "adhesion-ti")
          .map((r: PricingItem) => r.id);
        return [...prev.filter((id) => !otherAdhesionIds.includes(id)), pricingId];
      }
      if (prev.includes(pricingId)) {
        return prev.filter((id) => id !== pricingId);
      }
      return [...prev, pricingId];
    });
  };

  const selectedPricingItems = pricingItems.filter((p) => selectedPricing.includes(p.id));

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
  };

  const totalRubriques = useMemo(() => {
    if (selectedPricingItems.length === 0 && !selectedPlan) {
      return 0;
    }

    const nonAdhesionSum = selectedPricingItems
      .filter((item) => !item.estAdhesion && item.id !== "adhesion-fc" && item.id !== "adhesion-ti")
      .reduce((sum, item) => sum + item.montant, 0);

    const selectedAdhesionItem = selectedPricingItems.find((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");
    const isTiToro = selectedAdhesionItem ? selectedAdhesionItem.rubrique.toLowerCase().includes("ti toro") : false;

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

    const totalUSD = adhesionAmount + nonAdhesionSum;
    if (devise === "HTG" && taux > 0) {
      return totalUSD * taux;
    }
    return totalUSD;
  }, [selectedPricingItems, selectedPlan, devise, taux]);

  const planInstallmentAmount = useMemo(() => {
    if (!selectedPlan) return 0;
    const plan = paymentPlans.find((p) => p.id === selectedPlan);
    if (!plan) return 0;

    const selectedAdhesionItem = selectedPricingItems.find((item) => item.estAdhesion || item.id === "adhesion-fc" || item.id === "adhesion-ti");
    const isTiToro = selectedAdhesionItem ? selectedAdhesionItem.rubrique.toLowerCase().includes("ti toro") : false;

    const installmentUSD = isTiToro ? plan.montantTIToro : plan.montantFCToro;
    if (devise === "HTG" && taux > 0) {
      return installmentUSD * taux;
    }
    return installmentUSD;
  }, [selectedPlan, selectedPricingItems, devise, taux]);

  const montantRestant = useMemo(() => {
    return Math.max(0, totalRubriques - montantDonne);
  }, [totalRubriques, montantDonne]);

  const hasPricingItems = selectedPricingItems.length > 0;

  // Pre-fill montantDonne with totalRubriques if not manually edited by user
  useEffect(() => {
    if (isUserEditedMontantDonne) return; // Preserve manual user input

    if (hasPricingItems) {
      setMontantDonne(totalRubriques);
    } else {
      setMontantDonne(0);
    }
  }, [totalRubriques, isUserEditedMontantDonne, hasPricingItems]);

  // Convert montantDonne to HTG if needed
  const montantDonneConverti = useMemo(() => {
    if (devise === "HTG" && taux > 0 && montantDonne > 0) {
      return montantDonne / taux;
    }
    return montantDonne;
  }, [devise, taux, montantDonne]);
  const getPlayerStatusInfo = (status: string | null | undefined) => {
    const baseClassName =
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";

    if (!status?.trim()) {
      return {
        label: "Aucun statut",
        className: `${baseClassName} border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`,
      };
    }

    const statut = status.toLowerCase();
    if (statut.includes("bourse") || statut.includes("boursier")) {
      return {
        label: "Bourse (100%)",
        className: `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400`,
      };
    }
    if (statut.includes("demi")) {
      return {
        label: "Demi-bourse (50%)",
        className: `${baseClassName} border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400`,
      };
    }
    if (statut === "inactif" || statut === "normal" || statut === "aucun") {
      return {
        label: statut === "aucun" ? "Aucun statut" : status,
        className: `${baseClassName} border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`,
      };
    }

    return {
      label: status,
      className: `${baseClassName} border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400`,
    };
  };

  const playerStatusInfo = getPlayerStatusInfo(selectedPlayer?.statutJoueur);
  return (
      <div className="space-y-6">
      <PageBreadcrumb pageTitle="Ajouter un paiement" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Joueur
            </label>
            <div ref={searchContainerRef} className="relative">
              <input
                ref={playerInputRef}
                type="text"
                value={selectedPlayer ? getPlayerFullName(selectedPlayer) : playerSearch}
                onChange={(event) => {
                  setPlayerSearch(event.target.value);
                  setShowPlayerDropdown(true);
                }}
                onFocus={() => {
                  setShowPlayerDropdown(true);
                  if (selectedPlayer) {
                    setPlayerSearch(getPlayerFullName(selectedPlayer));
                  }
                }}
                placeholder={selectedPlayer ? "" : "Rechercher un joueur..."}
                className={inputClassName}
              />
              {showPlayerDropdown && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {filteredPlayers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      Aucun joueur trouve.
                    </div>
                  ) : (
                      filteredPlayers.map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleSelectPlayer(player);
                          }}
                          className={`flex w-full flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            player.id === playerId
                              ? "bg-brand-50 dark:bg-brand-500/10"
                              : ""
                          }`}
                        >
                        <span className={`${player.id === playerId ? "font-bold text-black dark:text-black" : "font-medium text-gray-900 dark:text-white"}`}>
                          {getPlayerFullName(player)}
                        </span>
                        <span className={`text-xs ${player.id === playerId ? "font-medium text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
                          {player.matricule
                            ? `Code: ${player.matricule}`
                            : "Sans code"}
                          {` • ${player.categorie} • ${player.poste}`}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedPlayer && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/60">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Statut joueur:
                </span>
                <span className={playerStatusInfo.className}>
                  {playerStatusInfo.label}
                </span>
              </div>
            )}
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Rubriques
            </label>
            <div className="max-h-48 overflow-auto rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
              {pricingItems.map((item) => (
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
            {selectedPricingItems.length > 0 && (
              <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 dark:bg-brand-500/10">
                <p className="text-sm font-medium text-brand-900 dark:text-brand-100">
                  Total rubriques: ${totalRubriques.toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Montant donné
            </label>
            <input
              type="number"
              min={0}
              value={montantDonne || ""}
              onChange={(event) => {
                setMontantDonne(Number(event.target.value));
                setIsUserEditedMontantDonne(true);
              }}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Montant total dû
            </label>
            <input
              type="number"
              min={0}
              value={totalRubriques || ""}
              onChange={(event) => setMontant(Number(event.target.value))}
              className={`${inputClassName} bg-gray-100 dark:bg-gray-800`}
              readOnly
            />
            {selectedPlan && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {paymentPlans.find((p) => p.id === selectedPlan)?.modalites}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Montant restant
            </label>
            <input
              type="number"
              min={0}
              value={montantRestant}
              className={`${inputClassName} bg-gray-100 dark:bg-gray-800`}
              readOnly
            />
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
              <option value="US">Dollar US</option>
              <option value="HTG">Gourde HTG</option>
            </select>
          </div>
          {devise === "HTG" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Taux
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
          ) : null}

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Description / Notes
            </label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Raison du paiement, notes supplémentaires..."
              className={inputClassName}
            />
            {selectedPlayer && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                    {getPlayerFullName(selectedPlayer)}
                  </p>
                  <p className="text-xs text-brand-700 dark:text-brand-300">
                    {selectedPlayer.matricule
                      ? `Code: ${selectedPlayer.matricule}`
                      : "Sans code"}
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Periode (YYYY-MM)
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
              <option value="paid">Paye</option>
              <option value="pending">En attente</option>
              <option value="late">En retard</option>
            </select>
          </div>
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
              Methode
            </label>
            <select
              value={methode}
              onChange={(event) => setMethode(event.target.value as PaymentMethod)}
              className={selectClassName}
            >
              <option value="virement">Virement</option>
              <option value="carte">Carte</option>
              <option value="especes">Especes</option>
              <option value="cheque">Chèque</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Date paiement
            </label>
            <input
              type="date"
              value={datePaiement}
              onChange={(event) => setDatePaiement(event.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
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

        {error && (
          <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/paiements")}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
