"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { updatePaymentInSupabase } from "@/lib/club/supabase-crud";
import { validatePaymentPhotoFile, getPaymentPhotoPreviewUrl, uploadPaymentPhotoToSupabase } from "@/lib/club/payment-photo-utils";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function ModifyPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { payments, players, setPayments } = useClubData();
  const [playerId, setPlayerId] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [montant, setMontant] = useState(0);
  const [devise, setDevise] = useState<"US" | "HTG">("US");
  const [taux, setTaux] = useState(0);
  const [description, setDescription] = useState("");
  const [periode, setPeriode] = useState("");
  const [statut, setStatut] = useState<PaymentStatus>("pending");
  const [methode, setMethode] = useState<PaymentMethod>("virement");
  const [datePaiement, setDatePaiement] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [paymentPhoto, setPaymentPhoto] = useState<File | null>(null);
  const [paymentPhotoPreview, setPaymentPhotoPreview] = useState<string | null>(null);
  const [paymentPhotoError, setPaymentPhotoError] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);

  const searchContainerRef = { current: null as HTMLDivElement | null };

  const selectedPlayer = players.find((p) => p.id === playerId) ?? null;

  const filteredPlayers = players.filter((player) => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) return false;
    const fullName = getPlayerFullName(player).toLowerCase();
    const matricule = (player.matricule || "").toLowerCase();
    return fullName.includes(query) || matricule.includes(query);
  });

  useEffect(() => {
    // Load existing payment data
    const payment = payments.find(p => p.id === resolvedParams.id);
    if (payment) {
      setPlayerId(payment.playerId);
      setMontant(payment.montant);
      setDevise(payment.devise);
      setTaux(payment.taux || 0);
      let rawRemarque = payment.remarque || "";
      const proofMatch = rawRemarque.match(/\[JUSTIFICATIF:(.+?)\]/);
      if (proofMatch) {
        setExistingPhotoUrl(proofMatch[1]);
        rawRemarque = rawRemarque.replace(/\[JUSTIFICATIF:.+?\]/, "").trim();
      }
      setDescription(rawRemarque);
      setPeriode(payment.periode || "");
      setStatut(payment.statut);
      setMethode(payment.methode);
      setDatePaiement(payment.datePaiement || "");
    }
    setLoading(false);
  }, [resolvedParams.id, payments]);

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

  const handleRemovePhoto = () => {
    if (paymentPhoto) {
      setPaymentPhoto(null);
      setPaymentPhotoPreview(null);
    } else {
      setExistingPhotoUrl(null);
    }
  };

  const activePhotoUrl = paymentPhotoPreview || existingPhotoUrl;

  const handleSubmit = async () => {
    setError("");

    if (!playerId) {
      setError("Veuillez sélectionner un joueur.");
      return;
    }
    if (montant <= 0) {
      setError("Le montant doit être supérieur à 0.");
      return;
    }

    try {
      const montantUS = devise === "US" ? montant : (taux > 0 ? montant / taux : 0);
      const montantHTG = devise === "HTG" ? montant : 0;

      // Upload photo if provided
      let paymentPhotoUrl = null;
      if (paymentPhoto) {
        paymentPhotoUrl = await uploadPaymentPhotoToSupabase(paymentPhoto);
      }

      // Build remark with photo URL if provided or preserved
      let finalRemarque = description.trim() || "Paiement complémentaire";
      const activePhotoUrl = paymentPhotoUrl || existingPhotoUrl;
      if (activePhotoUrl) {
        const paymentPhotoNote = ` [JUSTIFICATIF:${activePhotoUrl}]`;
        finalRemarque = `${finalRemarque}${paymentPhotoNote}`.trim();
      }

      const paymentData = {
        playerId,
        montant,
        montantUS,
        montantHTG,
        devise,
        taux: devise === "HTG" ? taux : undefined,
        statut,
        periode,
        methode,
        remarque: finalRemarque,
        datePaiement: statut === "paid" ? datePaiement || undefined : undefined,
      };

      await updatePaymentInSupabase(resolvedParams.id, paymentData);

      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.id === resolvedParams.id ? { ...payment, ...paymentData } : payment,
        ),
      );

      router.push("/paiements");
    } catch (error) {
      console.error("Error updating payment:", error);
      const errorMsg = error instanceof Error 
        ? error.message 
        : (error as any)?.message 
          ? (error as any).message 
          : "Erreur inconnue";
      setToast({ message: `Erreur lors de la modification du paiement: ${errorMsg}`, type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Modifier un paiement" />
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Joueur:</strong> {selectedPlayer ? getPlayerFullName(selectedPlayer) : "Non sélectionné"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Montant donné
            </label>
            <input
              type="number"
              min={0}
              value={montant || ""}
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
              placeholder="Raison du paiement complémentaire..."
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

        {/* Photo upload section */}
        <div className="md:col-span-2 xl:col-span-3">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Justificatif de paiement (optionnel)
          </label>
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="flex flex-row items-center justify-between gap-4">
              {/* Left: Preview & Input */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 min-w-0">
                {activePhotoUrl && (
                  <div className="relative h-16 w-16 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white">
                    <img src={activePhotoUrl} alt="Justificatif" className="h-full w-full object-cover" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePaymentPhotoChange}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600"
                  />
                  
                  {paymentPhotoError && <p className="text-xs text-red-650 font-semibold">{paymentPhotoError}</p>}
                  
                  {/* Status text */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {paymentPhoto ? (
                      <span className="text-brand-650 font-bold">Nouveau fichier : {paymentPhoto.name}</span>
                    ) : existingPhotoUrl ? (
                      <span>Justificatif actuellement enregistré.</span>
                    ) : (
                      <span>Aucun justificatif sélectionné. Formats: JPG, PNG, WEBP (max 5 Mo)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions Column */}
              {activePhotoUrl && (
                <div className="shrink-0 flex items-center border-l border-gray-200 dark:border-gray-700 pl-4 h-12">
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    title="Supprimer le justificatif"
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
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