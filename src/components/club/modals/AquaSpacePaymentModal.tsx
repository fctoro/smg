"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { AquaSpaceMember, AquaSpacePayment } from "@/types/club";
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  DollarSign,
  Tag,
  Wallet,
  Clock,
  FileText,
  X,
} from "lucide-react";

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
      setErrorMsg("Veuillez spécifier la période de règlement.");
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
    "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 shadow-theme-xs transition focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 rounded-t-2xl">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 border border-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Encaisser un versement · Aqua Space
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Enregistrement comptable d'une cotisation, inscription ou session
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Member Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Nageur concerné <span className="text-rose-500">*</span>
            </label>

            {members.length > 5 && (
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 pl-8 pr-3 py-1.5 text-gray-700 dark:text-gray-300 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                />
              </div>
            )}

            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Sélectionner un nageur</option>
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom.toUpperCase()} {m.prenom} ({m.matricule}) · {m.niveau}
                </option>
              ))}
            </select>

            {selectedMember && (
              <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/20 font-bold flex items-center justify-center uppercase text-xs">
                    {selectedMember.prenom[0]}
                    {selectedMember.nom[0]}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {selectedMember.prenom} {selectedMember.nom}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-[11px]">
                      Matricule: <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{selectedMember.matricule}</span> · {selectedMember.niveau}
                    </div>
                  </div>
                </div>
                {selectedMember.etudiantId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold border border-amber-200/60 dark:border-amber-800/40">
                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                    <span>Joueur Club</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Montant & Devise */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Montant à encaisser <span className="text-rose-500">*</span>
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
                <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">
                  {devise === "US" ? "USD" : "HTG"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Devise <span className="text-rose-500">*</span>
              </label>
              <div className="flex rounded-xl border border-gray-300 dark:border-gray-700 p-1 bg-gray-100 dark:bg-gray-800 h-10">
                <button
                  type="button"
                  onClick={() => setDevise("HTG")}
                  className={`flex-1 rounded-lg text-xs font-bold transition ${
                    devise === "HTG"
                      ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  }`}
                >
                  HTG
                </button>
                <button
                  type="button"
                  onClick={() => setDevise("US")}
                  className={`flex-1 rounded-lg text-xs font-bold transition ${
                    devise === "US"
                      ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  }`}
                >
                  USD ($)
                </button>
              </div>
            </div>
          </div>

          {/* Type & Période */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Rubrique comptable
              </label>
              <select
                value={typePaiement}
                onChange={(e) => setTypePaiement(e.target.value as any)}
                className={inputClass}
              >
                <option value="Cotisation">Cotisation mensuelle</option>
                <option value="Inscription">Frais d'inscription</option>
                <option value="Session">Session / Forfait de cours</option>
                <option value="Autre">Autre versement</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Période / Libellé <span className="text-rose-500">*</span>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Mode de règlement
              </label>
              <select
                value={methode}
                onChange={(e) => setMethode(e.target.value as any)}
                className={inputClass}
              >
                <option value="especes">Espèces / Cash</option>
                <option value="virement">Virement bancaire</option>
                <option value="carte">Carte de crédit / débit</option>
                <option value="cheque">Chèque bancaire</option>
                <option value="mobile">MonCash / Natcash</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Date du versement
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
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Statut du versement
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="statut"
                  checked={statut === "paid"}
                  onChange={() => setStatut("paid")}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Encaissé & validé</span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="statut"
                  checked={statut === "pending"}
                  onChange={() => setStatut("pending")}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>En attente de compensation</span>
                </span>
              </label>
            </div>
          </div>

          {/* Remarque */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Remarques / Référence bancaire (facultatif)
            </label>
            <textarea
              rows={2}
              value={remarque}
              onChange={(e) => setRemarque(e.target.value)}
              placeholder="Ex: Virement Sogebank réf. 883929..."
              className={inputClass}
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 shadow-theme-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer le versement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
