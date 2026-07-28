"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
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

export default function NewPaymentPage() {
  const router = useRouter();
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

  const playerOptions = useMemo(() => players, [players]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async () => {
    if (!playerId || !periode || montant <= 0 || (devise === "HTG" && taux <= 0)) {
      return;
    }

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
        throw new Error("Paiement non cree.");
      }

      setPayments((prevPayments) => [
        {
          id: inserted.Id.toString(),
          ...dataToInsert,
        },
        ...prevPayments,
      ]);
      router.push("/paiements");
    } catch (error) {
      alert("Erreur lors de l'ajout du paiement. Veuillez reessayer.");
    }
  };

  const handleSelectPlayer = (player: Player) => {
    setPlayerId(player.id);
    setPlayerSearch("");
    setShowPlayerDropdown(false);
  };

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
                type="text"
                value={playerSearch}
                onChange={(event) => {
                  setPlayerSearch(event.target.value);
                  setShowPlayerDropdown(true);
                }}
                onFocus={() => setShowPlayerDropdown(true)}
                placeholder={
                  selectedPlayer
                    ? `${getPlayerFullName(selectedPlayer)}${selectedPlayer.matricule ? ` (${selectedPlayer.matricule})` : ""}`
                    : "Rechercher un joueur..."
                }
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
          </div>
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
                value={taux}
                onChange={(event) => setTaux(Number(event.target.value))}
                className={inputClassName}
              />
            </div>
          ) : null}
          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Description
            </label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Statut joueur: boursier, demi-bourse, special..."
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
