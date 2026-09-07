"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { AquaSpaceMember, AquaSpacePayment } from "@/types/club";

interface AquaSpacePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paymentData: Omit<AquaSpacePayment, "id">) => Promise<void>;
  members: AquaSpaceMember[];
  preselectedMemberId?: string | null;
}

export const AquaSpacePaymentModal: React.FC<AquaSpacePaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  members,
  preselectedMemberId,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [montant, setMontant] = useState<number | "">("");
  const [devise, setDevise] = useState<"US" | "HTG">("HTG");
  const [periode, setPeriode] = useState<string>("");
  const [typePaiement, setTypePaiement] = useState<"Cotisation" | "Inscription" | "Session" | "Autre">("Cotisation");
  const [methode, setMethode] = useState<"especes" | "virement" | "carte" | "cheque" | "mobile">("especes");
  const [statut, setStatut] = useState<"paid" | "pending">("paid");
  const [datePaiement, setDatePaiement] = useState<string>(new Date().toISOString().split("T")[0]);
  const [remarque, setRemarque] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Quick period helper
  useEffect(() => {
    const now = new Date();
    const monthNames = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    setPeriode(`${monthNames[now.getMonth()]} ${now.getFullYear()}`);
  }, []);

  useEffect(() => {
    if (preselectedMemberId) {
      setSelectedMemberId(preselectedMemberId);
    } else if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [preselectedMemberId, members]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const filteredMembers = members.filter((m) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      m.nom.toLowerCase().includes(q) ||
      m.prenom.toLowerCase().includes(q) ||
      m.matricule.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedMember) {
      setErrorMsg("Veuillez sélectionner un membre.");
      return;
    }

    if (!montant || Number(montant) <= 0) {
      setErrorMsg("Veuillez saisir un montant supérieur à 0.");
      return;
    }

    if (!periode.trim()) {
      setErrorMsg("Veuillez spécifier la période.");
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentData: Omit<AquaSpacePayment, "id"> = {
        memberId: selectedMember.id,
        etudiantId: selectedMember.etudiantId || null,
        nomMembre: `${selectedMember.prenom} ${selectedMember.nom}`.trim(),
        matricule: selectedMember.matricule,
        montant: Number(montant),
        devise,
        periode: periode.trim(),
        typePaiement,
        methode,
        statut,
        datePaiement,
        remarque: remarque.trim() || undefined,
        recuNumero: `REC-AQ-${Date.now().toString().slice(-6)}`,
      };

      await onSave(paymentData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement du paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-cyan-600/10 to-blue-600/10 dark:from-cyan-900/20 dark:to-blue-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Encaisser un paiement - Aqua Space
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enregistrez une cotisation, inscription ou session de natation
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Member Selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Membre nageur <span className="text-red-500">*</span>
            </label>

            {members.length > 5 && (
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Rechercher un membre par nom ou matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            )}

            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">-- Choisir un nageur --</option>
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom.toUpperCase()} {m.prenom} (Matricule: {m.matricule}) - {m.niveau}
                </option>
              ))}
            </select>

            {selectedMember && (
              <div className="mt-2 p-3 rounded-lg bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-800 flex items-center justify-center font-bold text-cyan-700 dark:text-cyan-200 uppercase">
                    {selectedMember.prenom[0]}
                    {selectedMember.nom[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {selectedMember.prenom} {selectedMember.nom}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      Matricule: <span className="font-mono font-medium text-cyan-600 dark:text-cyan-400">{selectedMember.matricule}</span> • Niveau: {selectedMember.niveau}
                    </div>
                  </div>
                </div>
                {selectedMember.etudiantId && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium">
                    Joueur Club
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Montant & Devise */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Montant <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputClass}
                  required
                />
                <span className="absolute right-3 top-2.5 font-bold text-gray-400">
                  {devise === "US" ? "USD" : "HTG"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Devise <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800 h-11">
                <button
                  type="button"
                  onClick={() => setDevise("HTG")}
                  className={`flex-1 rounded-md text-xs font-bold transition ${
                    devise === "HTG"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  }`}
                >
                  HTG (G)
                </button>
                <button
                  type="button"
                  onClick={() => setDevise("US")}
                  className={`flex-1 rounded-md text-xs font-bold transition ${
                    devise === "US"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  }`}
                >
                  US ($)
                </button>
              </div>
            </div>
          </div>

          {/* Type & Période */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Type de paiement
              </label>
              <select
                value={typePaiement}
                onChange={(e) => setTypePaiement(e.target.value as any)}
                className={inputClass}
              >
                <option value="Cotisation">Cotisation mensuelle</option>
                <option value="Inscription">Frais d'inscription</option>
                <option value="Session">Session / Forfait de cours</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Période / Libellé <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                placeholder="Ex: Septembre 2026"
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Méthode & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Mode de paiement
              </label>
              <select
                value={methode}
                onChange={(e) => setMethode(e.target.value as any)}
                className={inputClass}
              >
                <option value="especes">Espèces / Cash</option>
                <option value="virement">Virement bancaire</option>
                <option value="carte">Carte de crédit / débit</option>
                <option value="cheque">Chèque</option>
                <option value="mobile">MonCash / Natcash</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Date du paiement
              </label>
              <input
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Statut
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="statut"
                  checked={statut === "paid"}
                  onChange={() => setStatut("paid")}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Payé / Encaissé
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="statut"
                  checked={statut === "pending"}
                  onChange={() => setStatut("pending")}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  En attente / Promesse
                </span>
              </label>
            </div>
          </div>

          {/* Remarque */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Remarques / Référence (facultatif)
            </label>
            <textarea
              rows={2}
              value={remarque}
              onChange={(e) => setRemarque(e.target.value)}
              placeholder="Ex: Reçu bancaire n° 98234, remis en mains propres par la mère..."
              className={inputClass}
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-md shadow-cyan-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Enregistrer le paiement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
