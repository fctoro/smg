"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { AquaSpaceMember, AquaSpacePayment } from "@/types/club";

interface AquaSpaceMemberDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: AquaSpaceMember | null;
  payments: AquaSpacePayment[];
  onEdit?: (member: AquaSpaceMember) => void;
  onAddPayment?: (member: AquaSpaceMember) => void;
  onPrint?: (member: AquaSpaceMember) => void;
}

export const AquaSpaceMemberDetailsModal: React.FC<AquaSpaceMemberDetailsModalProps> = ({
  isOpen,
  onClose,
  member,
  payments,
  onEdit,
  onAddPayment,
  onPrint,
}) => {
  const [activeTab, setActiveTab] = useState<"profil" | "medical" | "urgence" | "paiements">("profil");

  if (!member) return null;

  const memberPayments = payments.filter((p) => p.memberId === member.id);
  const totalHTG = memberPayments
    .filter((p) => p.devise === "HTG" && p.statut === "paid")
    .reduce((sum, p) => sum + p.montant, 0);
  const totalUSD = memberPayments
    .filter((p) => p.devise === "US" && p.statut === "paid")
    .reduce((sum, p) => sum + p.montant, 0);

  const calculateAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const birth = new Date(dobString);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(member.dateNaissance);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header Hero Banner */}
        <div className="relative p-6 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.nom}
                    className="w-20 h-20 rounded-2xl object-cover border-3 border-white/60 shadow-lg shadow-black/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-3 border-white/60 flex items-center justify-center font-bold text-2xl text-white">
                    {member.prenom[0]}
                    {member.nom[0]}
                  </div>
                )}
                <span
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                    member.statut === "actif" ? "bg-emerald-400" : "bg-gray-400"
                  }`}
                  title={member.statut === "actif" ? "Actif" : "Inactif"}
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    {member.prenom} {member.nom.toUpperCase()}
                  </h2>
                  {member.etudiantId && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-950 shadow-xs">
                      ⭐ Joueur Club FC Toro
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-cyan-100">
                  <span className="font-mono bg-white/15 px-2.5 py-1 rounded-md">
                    Matricule: <strong>{member.matricule}</strong>
                  </span>
                  <span>•</span>
                  <span className="px-2.5 py-1 rounded-md bg-cyan-500/40 font-semibold text-white">
                    🏊 {member.niveau}
                  </span>
                  {age !== null && (
                    <>
                      <span>•</span>
                      <span>{age} ans ({member.sexe})</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {onPrint && (
                <button
                  type="button"
                  onClick={() => onPrint(member)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-sm transition"
                  title="Imprimer la fiche d'inscription"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Imprimer</span>
                </button>
              )}

              {onAddPayment && (
                <button
                  type="button"
                  onClick={() => onAddPayment(member)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Encaisser</span>
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(member)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                  title="Modifier le membre"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-6 border-b border-white/20 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("profil")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
                activeTab === "profil"
                  ? "bg-white text-cyan-900 border-white shadow-xs"
                  : "text-white/80 border-transparent hover:bg-white/10"
              }`}
            >
              👤 Profil & Général
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("urgence")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
                activeTab === "urgence"
                  ? "bg-white text-cyan-900 border-white shadow-xs"
                  : "text-white/80 border-transparent hover:bg-white/10"
              }`}
            >
              📞 Parent & Urgence
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("medical")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
                activeTab === "medical"
                  ? "bg-white text-cyan-900 border-white shadow-xs"
                  : "text-white/80 border-transparent hover:bg-white/10"
              }`}
            >
              🏥 Fiche Médicale
              {(member.maladies?.length > 0 || member.allergies || member.priseMedicaments) && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-black">
                  !
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paiements")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
                activeTab === "paiements"
                  ? "bg-white text-cyan-900 border-white shadow-xs"
                  : "text-white/80 border-transparent hover:bg-white/10"
              }`}
            >
              💳 Paiements ({memberPayments.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50 dark:bg-gray-900/50 space-y-6">
          {/* TAB 1: PROFIL & GÉNÉRAL */}
          {activeTab === "profil" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  Informations Nageur
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Nom complet:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {member.prenom} {member.nom}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Sexe:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {member.sexe}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Date de naissance:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {member.dateNaissance || "Non renseignée"} {age !== null && `(${age} ans)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Statut membre:</span>
                    <span className={`inline-flex items-center gap-1 font-bold ${
                      member.statut === "actif" ? "text-emerald-600" : "text-gray-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.statut === "actif" ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                      {member.statut === "actif" ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400 block">Adresse de résidence:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {member.adresse || "Non renseignée"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Adhésion & Natation
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Matricule:</span>
                    <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400 text-sm">
                      {member.matricule}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Date d'inscription:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {member.dateInscription || "Non renseignée"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400 block">Discipline / Niveau:</span>
                    <span className="inline-block mt-1 px-3 py-1 rounded-md font-bold text-xs bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      🏊 {member.niveau}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Mode de paiement souhaité:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {member.modePaiementSouhaite || "Non spécifié"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Photos autorisées:</span>
                    <span className={`font-semibold ${member.autorisationPhotos ? "text-emerald-600" : "text-amber-600"}`}>
                      {member.autorisationPhotos ? "✅ Oui" : "❌ Non"}
                    </span>
                  </div>
                </div>

                {member.notes && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 block">Notes & Remarques:</span>
                    <p className="text-gray-800 dark:text-gray-200 italic mt-0.5">{member.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PARENT & CONTACT D'URGENCE */}
          {activeTab === "urgence" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Responsable Légal */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  Parent / Tuteur Responsable
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Nom & Prénom:</span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {member.parentPrenom} {member.parentNom}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Téléphone:</span>
                    <a
                      href={`tel:${member.parentTelephone}`}
                      className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      📞 {member.parentTelephone || "Non renseigné"}
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Email:</span>
                    <a
                      href={`mailto:${member.parentEmail}`}
                      className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      ✉️ {member.parentEmail || "Non renseigné"}
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Adresse:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {member.parentAdresse || "Identique au nageur"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact d'urgence */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/20 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-red-900 dark:text-red-300 border-b border-red-100 dark:border-red-900/40 pb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Contact en cas d'urgence
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Personne à contacter:</span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {member.urgencePrenom} {member.urgenceNom} ({member.urgenceLien || "Lien non précisé"})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Téléphone d'urgence:</span>
                    <a
                      href={`tel:${member.urgenceTelephone}`}
                      className="font-bold text-red-600 dark:text-red-400 hover:underline text-sm flex items-center gap-1.5 mt-0.5"
                    >
                      🚨 {member.urgenceTelephone || "Non renseigné"}
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Email d'urgence:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {member.urgenceEmail || "Non renseigné"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-red-100 dark:border-red-900/30">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      ✅ Autorisation d'intervention médicale accordée
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FICHE MÉDICALE */}
          {activeTab === "medical" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-bold">Informations de santé préventives</p>
                  <p className="mt-0.5">Ces données sont strictement réservées aux maîtres-nageurs et encadrants d'Aqua Space pour garantir la sécurité du nageur dans les bassins.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Affections & Maladies */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">
                    Affections & Pathologies signalées
                  </h4>
                  {member.maladies && member.maladies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {member.maladies.map((m) => (
                        <span
                          key={m}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                        >
                          ⚠️ {m}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Aucune affection majeure déclarée.</p>
                  )}

                  {member.autreMaladie && (
                    <div className="pt-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400 block font-medium">Autre affection :</span>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{member.autreMaladie}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 block font-medium">Allergies connues :</span>
                    <p className="text-gray-800 dark:text-gray-200 font-semibold mt-0.5">
                      {member.allergies || "Aucune allergie déclarée"}
                    </p>
                  </div>
                </div>

                {/* Médicaments & Blessures */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">
                    Médication & Antécédents
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Prise régulière de médicaments :</span>
                      <span className={`font-bold ${member.priseMedicaments ? "text-amber-600" : "text-emerald-600"}`}>
                        {member.priseMedicaments ? "⚠️ Oui" : "Non"}
                      </span>
                      {member.priseMedicaments && member.medicamentsDetails && (
                        <p className="mt-1 p-2 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                          {member.medicamentsDetails}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Auto-administration des médicaments :</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {member.autoAdministrationMedicaments ? "✅ Autonome" : "❌ Nécessite assistance"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400 block">Blessures ou chirurgies antérieures :</span>
                      <p className="text-gray-800 dark:text-gray-200 font-medium mt-0.5">
                        {member.blessuresAnterieures || "Aucune blessure signalée"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORIQUE PAIEMENTS */}
          {activeTab === "paiements" && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30">
                  <span className="text-xs text-cyan-600 dark:text-cyan-400 block font-semibold">Total payé (HTG)</span>
                  <span className="text-lg font-black text-cyan-900 dark:text-cyan-200">
                    {totalHTG.toLocaleString()} G
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                  <span className="text-xs text-blue-600 dark:text-blue-400 block font-semibold">Total payé (USD)</span>
                  <span className="text-lg font-black text-blue-900 dark:text-blue-200">
                    {totalUSD.toLocaleString()} $
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-semibold">Transactions</span>
                    <span className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                      {memberPayments.length}
                    </span>
                  </div>
                  {onAddPayment && (
                    <button
                      type="button"
                      onClick={() => onAddPayment(member)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs"
                    >
                      + Nouveau
                    </button>
                  )}
                </div>
              </div>

              {/* Payments table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
                {memberPayments.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 text-xs">Aucun paiement enregistré pour ce nageur pour le moment.</p>
                    {onAddPayment && (
                      <button
                        type="button"
                        onClick={() => onAddPayment(member)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        💳 Enregistrer le premier paiement
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Type & Période</th>
                        <th className="px-4 py-2.5">Montant</th>
                        <th className="px-4 py-2.5">Méthode</th>
                        <th className="px-4 py-2.5">Statut</th>
                        <th className="px-4 py-2.5">N° Reçu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {memberPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">
                            {p.datePaiement}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-gray-900 dark:text-white block">{p.typePaiement}</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">{p.periode}</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                            {p.montant.toLocaleString()} {p.devise === "US" ? "USD" : "HTG"}
                          </td>
                          <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-400">
                            {p.methode}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.statut === "paid"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.statut === "paid" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                              {p.statut === "paid" ? "Payé" : "En attente"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                            {p.recuNumero || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};
