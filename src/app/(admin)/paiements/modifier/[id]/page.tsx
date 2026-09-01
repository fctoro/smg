"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { PaymentMethod, PaymentStatus } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { updatePaymentInSupabase } from "@/lib/club/supabase-crud";
import { validatePaymentPhotoFile, getPaymentPhotoPreviewUrl, uploadPaymentPhotosToSupabase, isPdfProof, extractPhotoUrlsFromRemark } from "@/lib/club/payment-photo-utils";
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
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPaymentPhotos, setNewPaymentPhotos] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<{ file: File; url: string; name: string; isPdf: boolean }[]>([]);
  const [paymentPhotoError, setPaymentPhotoError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [planPaiement, setPlanPaiement] = useState<string>("annuel");
  const [nombreDeMois, setNombreDeMois] = useState<number>(1);

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
      
      const proofMatches = extractPhotoUrlsFromRemark(rawRemarque);
      if (proofMatches.length > 0) {
        setExistingPhotoUrls(proofMatches);
        rawRemarque = rawRemarque.replace(/\[JUSTIFICATIF:.+?\]/g, "").trim();
      }

      const adhesionMatch = rawRemarque.match(/\[ADHESION:\s*([A-Z_]+)\s*\]/i);
      const planMatch = rawRemarque.match(/\[PLAN:\s*([A-Z]+)\s*\]/i);
      const adhesionCode = adhesionMatch ? adhesionMatch[1] : "";
      const planCode = planMatch ? planMatch[1] : "";
      if (adhesionCode || planCode) {
        setAdhesionInfo({ code: adhesionCode, plan: planCode });
      }

      let parsedRabaisType: "percent" | "amount" = "percent";
      let parsedRabaisValue = 0;
      let hasExplicitRabais = false;
      
      const rabaisPctMatch = rawRemarque.match(/\[RABAIS:\s*([\d.]+)%\s*\]/i);
      if (rabaisPctMatch && rabaisPctMatch[1]) {
        parsedRabaisValue = parseFloat(rabaisPctMatch[1]);
        parsedRabaisType = "percent";
        hasExplicitRabais = true;
        rawRemarque = rawRemarque.replace(/\[RABAIS:\s*[\d.]+%\s*\]/i, "").trim();
      } else {
        const rabaisAmtMatch = rawRemarque.match(/\[RABAIS:\s*\$([\d.]+)\s*\]/i);
        if (rabaisAmtMatch && rabaisAmtMatch[1]) {
          parsedRabaisValue = parseFloat(rabaisAmtMatch[1]);
          parsedRabaisType = "amount";
          hasExplicitRabais = true;
          rawRemarque = rawRemarque.replace(/\[RABAIS:\s*\$[\d.]+\s*\]/i, "").trim();
        }
      }

      if (!hasExplicitRabais && planCode) {
        if (planCode === "ANNUEL") {
          parsedRabaisValue = 10;
          parsedRabaisType = "percent";
        } else if (planCode === "SEMESTRIEL") {
          parsedRabaisValue = 5;
          parsedRabaisType = "percent";
        }
      }

      setRabaisType(parsedRabaisType);
      setRabaisValue(parsedRabaisValue);

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

      let calculatedBase = 0;
      if (parsedTotalDue > 0) {
        if (parsedRabaisType === "percent" && parsedRabaisValue > 0 && parsedRabaisValue < 100) {
          calculatedBase = Math.round((parsedTotalDue / (1 - parsedRabaisValue / 100)) * 100) / 100;
        } else if (parsedRabaisType === "amount" && parsedRabaisValue > 0) {
          calculatedBase = Math.round((parsedTotalDue + parsedRabaisValue) * 100) / 100;
        } else {
          calculatedBase = parsedTotalDue;
        }
      } else if (adhesionCode === "TI_TORO") {
        calculatedBase = 1000;
      } else if (adhesionCode === "FC_TORO") {
        calculatedBase = 1350;
      }
      setBaseTotalDueForRabais(calculatedBase);

      let initialPlan = "annuel";
      if (planMatch && planMatch[1]) {
        initialPlan = planMatch[1].toLowerCase();
      } else {
        const remarkLower = rawRemarque.toLowerCase();
        if (remarkLower.includes("boursier") || remarkLower.includes("bourse")) initialPlan = "boursier";
        else if (remarkLower.includes("semestriel")) initialPlan = "semestriel";
        else if (remarkLower.includes("mensuel")) initialPlan = "mensuel";
      }
      setPlanPaiement(initialPlan);

      const moisMatch = rawRemarque.match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || rawRemarque.match(/(\d+)\s*mois/i);
      if (moisMatch && moisMatch[1]) {
        setNombreDeMois(parseInt(moisMatch[1], 10) || 1);
        rawRemarque = rawRemarque.replace(/\[MOIS_PAYES:\s*\d+\s*\]/gi, "").trim();
      }

      // Strip the tags from description
      rawRemarque = rawRemarque.replace(/\[ADHESION:\s*[A-Z_]+\s*\]/gi, "");
      rawRemarque = rawRemarque.replace(/\[PLAN:\s*[A-Z_]+\s*\]/gi, "");
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

    const base = baseTotalDueForRabais > 0 ? baseTotalDueForRabais : (typeof totalDue === "number" ? totalDue : 0);
    if (base > 0) {
      setBaseTotalDueForRabais(base);
      if (type === "percent") {
        const newTotal = Math.round((base * (1 - safeVal / 100)) * 100) / 100;
        setTotalDue(newTotal);
      } else {
        const newTotal = Math.max(0, Math.round((base - safeVal) * 100) / 100);
        setTotalDue(newTotal);
      }
    }
  };

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
      setNewPaymentPhotos((prev) => [...prev, ...selectedFiles]);
      setNewPhotoPreviews((prev) => [...prev, ...newPreviews]);
      setPaymentPhotoError(null);
    }
    event.target.value = "";
  };

  const handleRemoveExistingPhoto = (index: number) => {
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotoPreviews((prev) => {
      const item = prev[index];
      if (item?.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== index);
    });
    setNewPaymentPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => {
      newPhotoPreviews.forEach((p) => {
        if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
      });
    };
  }, [newPhotoPreviews]);

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

      // Upload newly added photos if any
      const newlyUploadedUrls = newPaymentPhotos.length > 0
        ? await uploadPaymentPhotosToSupabase(newPaymentPhotos)
        : [];

      // Combine preserved existing URLs + newly uploaded URLs
      const allPhotoUrls = [...existingPhotoUrls, ...newlyUploadedUrls];

      // Build remark with photo URLs
      const adhesionPart = adhesionInfo ? `[ADHESION:${adhesionInfo.code}] ` : "";
      const planPart = `[PLAN:${planPaiement.toUpperCase()}] `;
      const moisPart = planPaiement === "mensuel" ? `[MOIS_PAYES:${nombreDeMois}] ` : "";
      const rabaisPart = rabaisValue > 0 ? `[RABAIS:${rabaisType === "percent" ? `${rabaisValue}%` : `$${rabaisValue}`}] ` : "";
      const totalDuePart = typeof totalDue === "number" ? `[TOTAL_DUE:${totalDue}] ` : "";
      
      let finalRemarque = `${adhesionPart}${planPart}${moisPart}${rabaisPart}${totalDuePart}${description.trim()}`.trim() || "Paiement complémentaire";
      
      if (allPhotoUrls.length > 0) {
        const paymentPhotoNotes = allPhotoUrls.map((u) => ` [JUSTIFICATIF:${u}]`).join("");
        finalRemarque = `${finalRemarque}${paymentPhotoNotes}`.trim();
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
                  if (rabaisValue > 0) {
                    if (rabaisType === "percent" && rabaisValue < 100) {
                      setBaseTotalDueForRabais(Math.round((val / (1 - rabaisValue / 100)) * 100) / 100);
                    } else if (rabaisType === "amount") {
                      setBaseTotalDueForRabais(Math.round((val + rabaisValue) * 100) / 100);
                    } else {
                      setBaseTotalDueForRabais(val);
                    }
                  } else {
                    setBaseTotalDueForRabais(val);
                  }
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
              Plan de paiement
            </label>
            <select
              value={planPaiement}
              onChange={(event) => setPlanPaiement(event.target.value)}
              className={selectClassName}
            >
              <option value="annuel">Annuel - 10% de rabais</option>
              <option value="semestriel">Semestriel - 5% de rabais</option>
              <option value="mensuel">Mensuel - Tarif régulier</option>
              <option value="boursier">Boursier</option>
            </select>
          </div>
          {planPaiement === "mensuel" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Nombre de mois réglés
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={nombreDeMois}
                onChange={(event) => setNombreDeMois(Math.max(1, parseInt(event.target.value) || 1))}
                className={inputClassName}
              />
            </div>
          )}
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
              Pièces justificatives / documents scannés (JPG, PNG, PDF... max 10 Mo par fichier)
            </label>
            {(existingPhotoUrls.length + newPhotoPreviews.length) > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                {existingPhotoUrls.length + newPhotoPreviews.length} pièce{(existingPhotoUrls.length + newPhotoPreviews.length) > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40 space-y-3">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
              onChange={handlePaymentPhotoChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600 cursor-pointer"
            />
            {paymentPhotoError && <p className="text-xs text-red-650 font-semibold">{paymentPhotoError}</p>}
            
            {/* Grid of existing + newly added proofs */}
            {(existingPhotoUrls.length > 0 || newPhotoPreviews.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                {/* Existing uploaded photos */}
                {existingPhotoUrls.map((url, idx) => {
                  const isPdf = isPdfProof(url);
                  return (
                    <div key={`existing-${idx}`} className="relative flex items-center gap-2.5 p-2 rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-800">
                      {isPdf ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-12 w-12 shrink-0 flex flex-col items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900/40"
                          title="Ouvrir le PDF"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[8px] font-bold">PDF</span>
                        </a>
                      ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="h-12 w-12 shrink-0">
                          <img src={url} alt="Justificatif" className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                        </a>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          Justificatif #{idx + 1}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Enregistré sur le serveur
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingPhoto(idx)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Supprimer cette pièce"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}

                {/* Newly added photos */}
                {newPhotoPreviews.map((item, idx) => (
                  <div key={`new-${idx}`} className="relative flex items-center gap-2.5 p-2 rounded-xl border border-brand-200 bg-brand-50/40 shadow-xs dark:border-brand-800 dark:bg-brand-950/20">
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
                      <p className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                        Nouveau à téléverser
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewPhoto(idx)}
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