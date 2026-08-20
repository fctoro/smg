"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { updatePaymentInSupabase } from "@/lib/club/supabase-crud";
import { validatePaymentPhotoFile, getPaymentPhotoPreviewUrl, uploadPaymentPhotoToSupabase, isPdfProof } from "@/lib/club/payment-photo-utils";
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

  const [totalDue, setTotalDue] = useState<number | "">("");
  const [rabaisType, setRabaisType] = useState<"percent" | "amount">("percent");
  const [rabaisValue, setRabaisValue] = useState<number>(0);
  const [baseTotalDueForRabais, setBaseTotalDueForRabais] = useState<number>(0);
  
  const [adhesionInfo, setAdhesionInfo] = useState<{ code: string; plan: string } | null>(null);

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

      let parsedTotalDue = 0;
      const dueMatch = rawRemarque.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      if (dueMatch && dueMatch[1]) {
        parsedTotalDue = parseFloat(dueMatch[1]);
        const remarkLower = rawRemarque.toLowerCase();
        const isKitOnly = !remarkLower.includes("adhésion") && !remarkLower.includes("adhesion");
        if (isKitOnly && parsedTotalDue >= 900) {
          // Ignore phantom debt
          setTotalDue("");
        } else {
          setTotalDue(parsedTotalDue);
        }
        rawRemarque = rawRemarque.replace(/\[TOTAL_DUE:\s*[\d.]+\s*\]/i, "").trim();
      } else {
        setTotalDue("");
      }

      let parsedRabaisType: "percent" | "amount" = "percent";
      let parsedRabaisValue = 0;
      
      const rabaisPctMatch = rawRemarque.match(/\[RABAIS:\s*([\d.]+)%\s*\]/i);
      if (rabaisPctMatch && rabaisPctMatch[1]) {
        parsedRabaisValue = parseFloat(rabaisPctMatch[1]);
        parsedRabaisType = "percent";
        rawRemarque = rawRemarque.replace(/\[RABAIS:\s*[\d.]+%\s*\]/i, "").trim();
      } else {
        const rabaisAmtMatch = rawRemarque.match(/\[RABAIS:\s*\$([\d.]+)\s*\]/i);
        if (rabaisAmtMatch && rabaisAmtMatch[1]) {
          parsedRabaisValue = parseFloat(rabaisAmtMatch[1]);
          parsedRabaisType = "amount";
          rawRemarque = rawRemarque.replace(/\[RABAIS:\s*\$[\d.]+\s*\]/i, "").trim();
        }
      }
      
      setRabaisType(parsedRabaisType);
      setRabaisValue(parsedRabaisValue);

      if (parsedTotalDue > 0) {
        if (parsedRabaisType === "percent" && parsedRabaisValue > 0 && parsedRabaisValue < 100) {
          setBaseTotalDueForRabais(parsedTotalDue / (1 - parsedRabaisValue / 100));
        } else if (parsedRabaisType === "amount" && parsedRabaisValue > 0) {
          setBaseTotalDueForRabais(parsedTotalDue + parsedRabaisValue);
        } else {
          setBaseTotalDueForRabais(parsedTotalDue);
        }
      }

      const adhesionMatch = rawRemarque.match(/\[ADHESION:\s*([A-Z_]+)\s*\]/i);
      const planMatch = rawRemarque.match(/\[PLAN:\s*([A-Z]+)\s*\]/i);
      
      let currentBaseAdhesion = 0;
      if (adhesionMatch && planMatch) {
        setAdhesionInfo({ code: adhesionMatch[1], plan: planMatch[1] });
      }

      // Strip the tags from description
      rawRemarque = rawRemarque.replace(/\[ADHESION:\s*[A-Z_]+\s*\]/gi, "");
      rawRemarque = rawRemarque.replace(/\[PLAN:\s*[A-Z]+\s*\]/gi, "");
      rawRemarque = rawRemarque.replace(/\[STATUT:\s*[A-Z]+\s*\]/gi, "");

      setDescription(rawRemarque.replace(/\s+/g, " ").trim());
      setPeriode(payment.periode || "");
      setStatut(payment.statut);
      setMethode(payment.methode);
      setDatePaiement(payment.datePaiement || "");
    }
    setLoading(false);
  }, [resolvedParams.id, payments]);

  const handleRabaisChange = (val: number, type: "percent" | "amount") => {
    const safeVal = isNaN(val) ? 0 : val;
    setRabaisValue(safeVal);
    setRabaisType(type);
    
    if (baseTotalDueForRabais > 0) {
      if (type === "percent") {
        setTotalDue(baseTotalDueForRabais * (1 - (safeVal / 100)));
      } else {
        setTotalDue(Math.max(0, baseTotalDueForRabais - safeVal));
      }
    }
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
      const adhesionPart = adhesionInfo ? `[ADHESION:${adhesionInfo.code}] [PLAN:${adhesionInfo.plan}] ` : "";
      const rabaisPart = rabaisValue > 0 ? `[RABAIS:${rabaisType === "percent" ? `${rabaisValue}%` : `$${rabaisValue}`}] ` : "";
      const totalDuePart = typeof totalDue === "number" ? `[TOTAL_DUE:${totalDue}] ` : "";
      
      let finalRemarque = `${adhesionPart}${rabaisPart}${totalDuePart}${description.trim()}`.trim() || "Paiement complémentaire";
      
      const photoUrlToSave = paymentPhotoUrl || existingPhotoUrl;
      if (photoUrlToSave) {
        const paymentPhotoNote = ` [JUSTIFICATIF:${photoUrlToSave}]`;
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
        datePaiement: datePaiement || undefined,
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
            <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-400">
              <span>Montant total dû (USD)</span>
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={totalDue === "" ? "" : totalDue}
              onChange={(event) => {
                const val = event.target.value ? Number(event.target.value) : "";
                setTotalDue(val);
                if (val !== "") {
                  setBaseTotalDueForRabais(val);
                  setRabaisValue(0); // Reset rabais because they are manually overriding
                }
              }}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-400">
              <span>Rabais accordé</span>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => handleRabaisChange(rabaisValue, "percent")}
                  className={`px-2 py-0.5 ${rabaisType === "percent" ? "bg-indigo-500 text-white" : "text-gray-600 dark:text-gray-400"}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => handleRabaisChange(rabaisValue, "amount")}
                  className={`px-2 py-0.5 ${rabaisType === "amount" ? "bg-indigo-500 text-white" : "text-gray-600 dark:text-gray-400"}`}
                >
                  $ USD
                </button>
              </div>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={rabaisType === "percent" ? 100 : undefined}
                value={rabaisValue || ""}
                onChange={(event) => {
                  const val = event.target.value ? parseFloat(event.target.value) : 0;
                  handleRabaisChange(val, rabaisType);
                }}
                className={inputClassName}
                placeholder={rabaisType === "percent" ? "Ex: 10" : "Ex: 150"}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 sm:text-sm">{rabaisType === "percent" ? "%" : "$"}</span>
              </div>
            </div>
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
              <option value="mobile">Dépôt bancaire</option>
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

        {typeof totalDue === "number" && totalDue >= 0 && (
          <div className="mt-6 rounded-xl border border-indigo-100 bg-white shadow-sm dark:border-indigo-900/50 dark:bg-[#1a2332] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-indigo-50 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900/40 dark:bg-indigo-900/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">Bilan Financier</h4>
                <p className="text-xs text-indigo-600/80 dark:text-indigo-300/80">Solde après ce paiement</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 px-4 py-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800/60 dark:bg-gray-800/30">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Dette Actuelle
                </p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {devise === "HTG" && taux > 0 
                    ? `${(totalDue * taux).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`
                    : `$${totalDue.toFixed(2)}`}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800/60 dark:bg-gray-800/30">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Acompte (Ce paiement)
                </p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  -{devise === "HTG" 
                    ? `${montant.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`
                    : `$${montant.toFixed(2)}`}
                </p>
              </div>
              <div className={`col-span-2 rounded-xl border p-3 md:col-span-1 ${
                (totalDue - (devise === "HTG" && taux > 0 ? montant / taux : devise === "US" ? montant : 0)) > 0
                  ? "border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-900/20"
                  : "border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/20"
              }`}>
                <p className={`text-[11px] font-medium uppercase tracking-wide ${
                  (totalDue - (devise === "HTG" && taux > 0 ? montant / taux : devise === "US" ? montant : 0)) > 0
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-green-600 dark:text-green-400"
                }`}>
                  Nouveau Solde Restant
                </p>
                <p className={`mt-1 text-2xl font-bold ${
                  (totalDue - (devise === "HTG" && taux > 0 ? montant / taux : devise === "US" ? montant : 0)) > 0
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-green-600 dark:text-green-400"
                }`}>
                  {devise === "HTG" && taux > 0
                    ? `${Math.max(0, (totalDue * taux) - montant).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`
                    : `$${Math.max(0, totalDue - (devise === "HTG" && taux > 0 ? montant / taux : devise === "US" ? montant : 0)).toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>
        )}

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
                  <div className="relative h-16 w-16 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center">
                    {isPdfProof(paymentPhoto?.name || activePhotoUrl) ? (
                      <a
                        href={activePhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center text-red-600 hover:text-red-700 p-1"
                        title="Ouvrir le document PDF"
                      >
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[9px] font-bold text-red-700 dark:text-red-300">PDF</span>
                      </a>
                    ) : (
                      <img src={activePhotoUrl} alt="Justificatif" className="h-full w-full object-cover" />
                    )}
                  </div>
                )}
                
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
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
                      <span>Aucun justificatif sélectionné. Formats: JPG, PNG, PDF... (max 10 Mo)</span>
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