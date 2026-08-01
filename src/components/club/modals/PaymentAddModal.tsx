"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus, Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { addPaymentToSupabase } from "@/lib/club/supabase-crud";

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

interface PaymentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentAddModal({ isOpen, onClose }: PaymentAddModalProps) {
  const { players, setPayments } = useClubData();
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [playerSearch, setPlayerSearch] = useState("");
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [montant, setMontant] = useState(180);
  const [devise, setDevise] = useState<"US" | "HTG">("US");
  const [taux, setTaux] = useState(0);
  const [description, setDescription] = useState("");
  const [periode, setPeriode] = useState(currentPeriod());
  const [statut, setStatut] = useState<PaymentStatus>("pending");
  const [methode, setMethode] = useState<PaymentMethod>("virement");
  const [datePaiement, setDatePaiement] = useState("");
  const [selectedPricing, setSelectedPricing] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");
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
    setPlayerId(players[0]?.id ?? "");
    setPlayerSearch("");
    setShowPlayerDropdown(false);
    setMontant(180);
    setDevise("US");
    setTaux(0);
    setDescription("");
    setPeriode(currentPeriod());
    setStatut("pending");
    setMethode("virement");
    setDatePaiement("");
    setSelectedPricing("");
    setSelectedPlan("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!playerId || !periode || montant <= 0 || (devise === "HTG" && taux <= 0)) {
      alert("Veuillez remplir correctement les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);
    try {
      const montantUS = devise === "US" ? montant : 0;
      const montantHTG = devise === "HTG" ? montant : 0;
      const dataToInsert = {
        playerId,
        montant,
        montantUS,
        montantHTG,
        devise,
        taux: devise === "HTG" ? taux : undefined,
        statut,
        periode,
        methode,
        remarque: description.trim(),
        datePaiement: statut === "paid" ? datePaiement || undefined : undefined,
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

  const handlePricingChange = (pricingId: string) => {
    setSelectedPricing(pricingId);
    const pricing = pricingItems.find((p) => p.id === pricingId);
    if (pricing) {
      setMontant(pricing.montant);
      setDevise(pricing.devise);
    }
  };

  const selectedPricingItem = pricingItems.find((p) => p.id === selectedPricing);

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    const plan = paymentPlans.find((p) => p.id === planId);
    if (plan && selectedPlayer) {
      const isFCToro =
        selectedPlayer.categorie === "FC TORO" ||
        selectedPlayer.categorie === "Académie" ||
        selectedPlayer.categorie === "Élite" ||
        selectedPlayer.categorie === "École de Football";
      const planAmount = isFCToro ? plan.montantFCToro : plan.montantTIToro;
      setMontant(planAmount);
      setDevise("US");
    }
  };

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
                          <span className="font-medium text-gray-800 dark:text-white/90">
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
                      {getPlayerFullName(selectedPlayer)}
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

            {/* Rubrique */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Rubrique
              </label>
              <select
                value={selectedPricing}
                onChange={(event) => handlePricingChange(event.target.value)}
                className={selectClassName}
              >
                <option value="">Sélectionner une rubrique</option>
                {pricingItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.rubrique} - ${item.montant}
                  </option>
                ))}
              </select>
              {selectedPricingItem && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedPricingItem.precision}
                </p>
              )}
            </div>

            {/* Montant & Devise */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Montant
              </label>
              <input
                type="number"
                min={0}
                value={montant}
                onChange={(event) => setMontant(Number(event.target.value))}
                className={inputClassName}
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
