"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus } from "@/types/club";
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
  const [montant, setMontant] = useState(180);
  const [devise, setDevise] = useState<"US" | "HTG">("US");
  const [taux, setTaux] = useState(0);
  const [description, setDescription] = useState("");
  const [periode, setPeriode] = useState(currentPeriod());
  const [statut, setStatut] = useState<PaymentStatus>("pending");
  const [methode, setMethode] = useState<PaymentMethod>("virement");
  const [datePaiement, setDatePaiement] = useState("");

  const playerOptions = useMemo(() => players, [players]);

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

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Ajouter un paiement" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Joueur
            </label>
            <select
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              className={selectClassName}
            >
              {playerOptions.map((player) => (
                <option key={player.id} value={player.id}>
                  {getPlayerFullName(player)}
                </option>
              ))}
            </select>
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
