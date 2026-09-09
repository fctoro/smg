"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { AquaSpaceMember, AquaSpacePayment } from "@/types/club";
import {
  User,
  PhoneCall,
  HeartPulse,
  CreditCard,
  Printer,
  Edit3,
  ShieldCheck,
  Waves,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Check,
  X,
  Calendar,
  MapPin,
  FileText,
  Activity,
} from "lucide-react";

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
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="relative">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.nom}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center font-bold text-xl text-brand-600 dark:text-brand-300">
                  {member.prenom[0]}
                  {member.nom[0]}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
                  member.statut === "actif" ? "bg-emerald-500" : "bg-gray-400"
                }`}
                title={member.statut === "actif" ? "Actif" : "Inactif"}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {member.prenom} {member.nom.toUpperCase()}
                </h2>
                {member.etudiantId && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>Joueur FC TORO</span>
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                  Matricule: {member.matricule}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20 font-semibold">
                  <Waves className="w-3 h-3 text-brand-500" />
                  <span>{member.niveau}</span>
                </span>
                {age !== null && (
                  <>
                    <span>·</span>
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
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs font-semibold shadow-2xs transition"
                title="Imprimer le formulaire d'inscription officiel"
              >
                <Printer className="w-4 h-4 text-gray-500" />
                <span>Imprimer</span>
              </button>
            )}

            {onAddPayment && (
              <button
                type="button"
                onClick={() => onAddPayment(member)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-theme-xs transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>Encaisser</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(member)}
                className="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-white transition"
                title="Modifier le nageur"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/60 dark:bg-gray-800/40 text-xs font-semibold text-gray-600 dark:text-gray-300 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("profil")}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === "profil"
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil & Général</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("urgence")}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === "urgence"
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Parent & Urgence</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("medical")}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === "medical"
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Fiche Médicale</span>
            {(member.maladies?.length > 0 || member.allergies || member.priseMedicaments) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paiements")}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === "paiements"
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Paiements ({memberPayments.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50 dark:bg-gray-900/50 space-y-6">
          {/* TAB 1: PROFIL & GÉNÉRAL */}
          {activeTab === "profil" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-500" />
                  <span>Informations du Nageur</span>
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
                    <span className="text-gray-500 dark:text-gray-400 block">Statut:</span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      member.statut === "actif" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.statut === "actif" ? "bg-emerald-500" : "bg-gray-400"}`} />
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

              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <Waves className="w-4 h-4 text-brand-500" />
                  <span>Adhésion & Natation</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Matricule:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
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
                    <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full font-semibold text-xs bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/20">
                      <Waves className="w-3.5 h-3.5 text-brand-500" />
                      <span>{member.niveau}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Mode de paiement souhaité:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {member.modePaiementSouhaite || "Non spécifié"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Droit à l'image:</span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${member.autorisationPhotos ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"}`}>
                      {member.autorisationPhotos ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>{member.autorisationPhotos ? "Autorisé" : "Non autorisé"}</span>
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
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-500" />
                  <span>Parent / Responsable Légal</span>
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
                      className="inline-flex items-center gap-1.5 font-semibold text-brand-600 dark:text-brand-400 hover:underline mt-0.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{member.parentTelephone || "Non renseigné"}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Courriel:</span>
                    <a
                      href={`mailto:${member.parentEmail}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-brand-600 dark:text-brand-400 hover:underline mt-0.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{member.parentEmail || "Non renseigné"}</span>
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
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/10 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 border-b border-rose-100 dark:border-rose-900/40 pb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Contact en cas d'urgence</span>
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
                      className="inline-flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 hover:underline text-sm mt-0.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{member.urgenceTelephone || "Non renseigné"}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Courriel:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {member.urgenceEmail || "Non renseigné"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-rose-100 dark:border-rose-900/30">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Autorisation d'intervention médicale accordée</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FICHE MÉDICALE */}
          {activeTab === "medical" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-300">
                  <p className="font-bold">Dossier médical préventif (Strictement confidentiel)</p>
                  <p className="mt-0.5">Ces informations sont réservées aux encadrants d'Aqua Space et au service médical pour assurer la sécurité du nageur en bassin.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Affections & Maladies */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">
                    Affections & Pathologies signalées
                  </h4>
                  {member.maladies && member.maladies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {member.maladies.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        >
                          <Activity className="w-3.5 h-3.5 text-rose-500" />
                          <span>{m}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Aucune pathologie majeure déclarée.</p>
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
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">
                    Médication & Antécédents
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Prise régulière de médicaments :</span>
                      <span className={`inline-flex items-center gap-1 font-semibold ${member.priseMedicaments ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {member.priseMedicaments ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{member.priseMedicaments ? "Oui (traitement actif)" : "Non"}</span>
                      </span>
                      {member.priseMedicaments && member.medicamentsDetails && (
                        <p className="mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                          {member.medicamentsDetails}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Capacité d'auto-administration :</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
                        {member.autoAdministrationMedicaments ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{member.autoAdministrationMedicaments ? "Autonome" : "Assistance encadrant requise"}</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400 block">Blessures antérieures ou chirurgies :</span>
                      <p className="text-gray-800 dark:text-gray-200 font-medium mt-0.5">
                        {member.blessuresAnterieures || "Aucune séquelle ou intervention déclarée."}
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
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-semibold uppercase tracking-wider">Total payé (HTG)</span>
                  <span className="text-xl font-extrabold text-gray-900 dark:text-white mt-1 block">
                    {totalHTG.toLocaleString()} HTG
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-semibold uppercase tracking-wider">Total payé (USD)</span>
                  <span className="text-xl font-extrabold text-gray-900 dark:text-white mt-1 block">
                    ${totalUSD.toLocaleString()} USD
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block font-semibold uppercase tracking-wider">Transactions</span>
                    <span className="text-xl font-extrabold text-gray-900 dark:text-white mt-1 block">
                      {memberPayments.length}
                    </span>
                  </div>
                  {onAddPayment && (
                    <button
                      type="button"
                      onClick={() => onAddPayment(member)}
                      className="px-3 py-1.5 rounded-xl bg-brand-500 text-white font-semibold text-xs hover:bg-brand-600 shadow-theme-xs"
                    >
                      + Nouveau
                    </button>
                  )}
                </div>
              </div>

              {/* Payments table */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
                {memberPayments.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-gray-500 text-xs">Aucun versement enregistré pour ce nageur pour le moment.</p>
                    {onAddPayment && (
                      <button
                        type="button"
                        onClick={() => onAddPayment(member)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Encaisser un premier versement</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase font-semibold text-[11px] border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Rubrique & Période</th>
                        <th className="px-4 py-3">Montant</th>
                        <th className="px-4 py-3">Méthode</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">N° Reçu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
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
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                p.statut === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.statut === "paid" ? "bg-emerald-500" : "bg-amber-500"}`} />
                              <span>{p.statut === "paid" ? "Payé" : "En attente"}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                            {p.recuNumero || "—"}
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
            className="px-5 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};
