"use client";

import React from "react";
import { AquaSpaceMember } from "@/types/club";

interface AquaSpaceRegistrationPrintProps {
  member: AquaSpaceMember | null;
}

export const AquaSpaceRegistrationPrint: React.FC<AquaSpaceRegistrationPrintProps> = ({ member }) => {
  if (!member) return null;

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try {
      const parts = d.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    } catch {
      return d;
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return "—";
    try {
      const birth = new Date(dob);
      if (isNaN(birth.getTime())) return "—";
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      return `${age} ans`;
    } catch {
      return "—";
    }
  };

  const hasMaladie = (m: string) => member.maladies?.includes(m);

  return (
    <div className="hidden print:block font-sans text-gray-900 text-sm leading-relaxed p-6 bg-white">
      {/* PAGE 1 : FORMULAIRE D'INSCRIPTION */}
      <div className="min-h-[1050px] flex flex-col justify-between page-break-after">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-red-600 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <img src="/images/logo/fc-toro.png" alt="FC TORO Logo" className="h-16 w-auto" />
              <div>
                <h1 className="text-2xl font-black text-red-600 tracking-tight">FC TORO</h1>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Centre de Formation & Académie
                </p>
                <p className="text-xs text-gray-400">7 Rue Rigaud, Pétion-Ville, Haïti</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-cyan-700 text-white px-3 py-1 text-xs font-black rounded uppercase tracking-wider mb-1">
                PROGRAMME : AQUA SPACE
              </div>
              <h2 className="text-lg font-bold text-gray-800">Formulaire d’Inscription</h2>
              <p className="text-xs font-mono font-semibold text-gray-600">
                Matricule : <span className="font-bold text-cyan-800">{member.matricule}</span>
              </p>
            </div>
          </div>

          {/* 1. Informations sur l'enfant */}
          <div className="mb-6">
            <h3 className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-sm mb-3 border-l-4 border-cyan-600 uppercase tracking-wide">
              1. Informations sur le nageur
            </h3>
            <table className="w-full text-xs border border-gray-200">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="w-1/3 bg-gray-50 p-2 font-semibold text-gray-600">Nom :</td>
                  <td className="w-2/3 p-2 font-bold uppercase">{member.nom || "—"}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Prénom :</td>
                  <td className="p-2 font-bold">{member.prenom || "—"}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Date de Naissance / Âge :</td>
                  <td className="p-2">
                    {formatDate(member.dateNaissance)} ({calculateAge(member.dateNaissance)})
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Sexe :</td>
                  <td className="p-2">{member.sexe || "—"}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Adresse de résidence :</td>
                  <td className="p-2">{member.adresse || "—"}</td>
                </tr>
                <tr>
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Discipline choisie :</td>
                  <td className="p-2">
                    <span className="inline-block px-2.5 py-0.5 rounded font-bold text-xs bg-slate-100 text-slate-900 border border-slate-300">
                      {member.niveau}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. Responsable légal / Parent */}
          <div className="mb-6">
            <h3 className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-sm mb-3 border-l-4 border-cyan-600 uppercase tracking-wide">
              2. Responsable légal / Parent
            </h3>
            <table className="w-full text-xs border border-gray-200">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="w-1/3 bg-gray-50 p-2 font-semibold text-gray-600">Nom & Prénom :</td>
                  <td className="w-2/3 p-2 font-bold">
                    {member.parentPrenom} {member.parentNom}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Téléphone principal :</td>
                  <td className="p-2 font-bold">{member.parentTelephone || "—"}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Courriel (Email) :</td>
                  <td className="p-2">{member.parentEmail || "—"}</td>
                </tr>
                <tr>
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Adresse :</td>
                  <td className="p-2">{member.parentAdresse || "Identique au nageur"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Contact d'urgence */}
          <div className="mb-6">
            <h3 className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-sm mb-3 border-l-4 border-red-600 uppercase tracking-wide">
              3. Contact d'urgence (si différent du responsable)
            </h3>
            <table className="w-full text-xs border border-gray-200">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="w-1/3 bg-gray-50 p-2 font-semibold text-gray-600">Lien avec le nageur :</td>
                  <td className="w-2/3 p-2">{member.urgenceLien || "—"}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Nom & Prénom :</td>
                  <td className="p-2 font-bold">
                    {member.urgencePrenom} {member.urgenceNom}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Téléphone d'urgence :</td>
                  <td className="p-2 font-bold text-red-700">{member.urgenceTelephone || "—"}</td>
                </tr>
                <tr>
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Courriel :</td>
                  <td className="p-2">{member.urgenceEmail || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. Modalités de paiement */}
          <div className="mb-6">
            <h3 className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-sm mb-3 border-l-4 border-cyan-600 uppercase tracking-wide">
              4. Modalités de paiement
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className={`p-2.5 rounded border text-center font-medium ${member.modePaiementSouhaite === "Cash/chèque" ? "bg-cyan-50 border-cyan-600 font-bold text-cyan-900" : "border-gray-200"}`}>
                [{member.modePaiementSouhaite === "Cash/chèque" ? "X" : " "}] Cash / Chèque
              </div>
              <div className={`p-2.5 rounded border text-center font-medium ${member.modePaiementSouhaite === "Carte bancaire" ? "bg-cyan-50 border-cyan-600 font-bold text-cyan-900" : "border-gray-200"}`}>
                [{member.modePaiementSouhaite === "Carte bancaire" ? "X" : " "}] Carte Bancaire
              </div>
              <div className={`p-2.5 rounded border text-center font-medium ${member.modePaiementSouhaite === "Transfert bancaire" ? "bg-cyan-50 border-cyan-600 font-bold text-cyan-900" : "border-gray-200"}`}>
                [{member.modePaiementSouhaite === "Transfert bancaire" ? "X" : " "}] Transfert Bancaire
              </div>
            </div>
          </div>
        </div>

        {/* Signatures Page 1 */}
        <div className="border-t border-gray-300 pt-4 mt-6">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="font-semibold text-gray-600">Fait à Pétion-Ville, le :</p>
              <p className="font-mono mt-1">{formatDate(member.dateInscription)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-600">Signature du Parent / Responsable légal :</p>
              <div className="mt-8 border-b border-gray-400 w-48 ml-auto"></div>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4">Page 1 / 2 — Formulaire officiel Aqua Space FC TORO</p>
        </div>
      </div>

      {/* PAGE 2 : FICHE MÉDICALE & AUTORISATIONS */}
      <div className="min-h-[1050px] flex flex-col justify-between pt-8">
        <div>
          {/* Header Page 2 */}
          <div className="flex items-center justify-between border-b-2 border-red-600 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <img src="/images/logo/fc-toro.png" alt="FC TORO Logo" className="h-14 w-auto" />
              <div>
                <h2 className="text-xl font-black text-red-600">AQUA SPACE - FC TORO</h2>
                <p className="text-xs text-gray-500 font-semibold uppercase">Fiche Médicale & Préventive</p>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Strictement Confidentiel</span>
              <p className="text-xs font-mono font-semibold text-gray-600 mt-1">Matricule : {member.matricule}</p>
              <p className="text-xs font-bold text-gray-800">{member.prenom} {member.nom}</p>
            </div>
          </div>

          {/* 1. Antécédents médicaux */}
          <div className="mb-6">
            <h3 className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-sm mb-3 border-l-4 border-red-600 uppercase tracking-wide">
              1. Antécédents médicaux & Pathologies
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className={`p-2 rounded border flex items-center gap-2 ${hasMaladie("Asthme") ? "bg-red-50 border-red-400 font-bold text-red-900" : "border-gray-200"}`}>
                <span>[{hasMaladie("Asthme") ? "X" : " "}]</span>
                <span>Asthme</span>
              </div>
              <div className={`p-2 rounded border flex items-center gap-2 ${hasMaladie("Diabète") ? "bg-red-50 border-red-400 font-bold text-red-900" : "border-gray-200"}`}>
                <span>[{hasMaladie("Diabète") ? "X" : " "}]</span>
                <span>Diabète</span>
              </div>
              <div className={`p-2 rounded border flex items-center gap-2 ${hasMaladie("Épilepsie") ? "bg-red-50 border-red-400 font-bold text-red-900" : "border-gray-200"}`}>
                <span>[{hasMaladie("Épilepsie") ? "X" : " "}]</span>
                <span>Épilepsie</span>
              </div>
            </div>

            {member.autreMaladie && (
              <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-xs mb-3">
                <span className="font-semibold text-gray-700">Autre condition médicale signalée : </span>
                <span className="font-medium text-gray-900">{member.autreMaladie}</span>
              </div>
            )}

            <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-xs">
              <span className="font-semibold text-gray-700">Allergies (médicamenteuses, alimentaires ou autres) : </span>
              <span className="font-medium text-gray-900">{member.allergies || "Aucune allergie déclarée"}</span>
            </div>
          </div>

          {/* 2. Prise de médicaments */}
          <div className="mb-6">
            <h3 className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-sm mb-3 border-l-4 border-cyan-600 uppercase tracking-wide">
              2. Traitement médicamenteux
            </h3>
            <table className="w-full text-xs border border-gray-200">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="w-1/2 bg-gray-50 p-2 font-semibold text-gray-600">Prise régulière de médicaments :</td>
                  <td className="w-1/2 p-2 font-bold">{member.priseMedicaments ? "OUI" : "NON"}</td>
                </tr>
                {member.priseMedicaments && (
                  <tr className="border-b border-gray-200">
                    <td className="bg-gray-50 p-2 font-semibold text-gray-600">Détails de la médication :</td>
                    <td className="p-2">{member.medicamentsDetails || "—"}</td>
                  </tr>
                )}
                <tr>
                  <td className="bg-gray-50 p-2 font-semibold text-gray-600">Autorisé(e) à s'auto-administrer son traitement :</td>
                  <td className="p-2 font-semibold">{member.autoAdministrationMedicaments ? "OUI (Autonome)" : "NON (Assistance requise)"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Blessures antérieures */}
          <div className="mb-6">
            <h3 className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-sm mb-3 border-l-4 border-cyan-600 uppercase tracking-wide">
              3. Blessures ou interventions antérieures
            </h3>
            <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-xs">
              {member.blessuresAnterieures || "Aucune blessure antérieure ou limitation physique signalée."}
            </div>
          </div>

          {/* 4. Autorisations & Engagements */}
          <div className="mb-6">
            <h3 className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-sm mb-3 border-l-4 border-cyan-600 uppercase tracking-wide">
              4. Autorisations & Déclarations parentales
            </h3>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">{member.absenceContreIndication ? "[X]" : "[ ]"}</span>
                <span>
                  <strong>Absence de contre-indication :</strong> Je certifie sur l'honneur que l'enfant ne présente aucune contre-indication médicale connue à la pratique de la natation et des activités aquatiques.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">{member.autorisationUrgence ? "[X]" : "[ ]"}</span>
                <span>
                  <strong>Autorisation d'urgence :</strong> En cas d'urgence médicale ou chirurgicale, j'autorise les responsables d'Aqua Space / FC TORO à prendre toute mesure nécessaire et à faire transporter le nageur vers l'établissement hospitalier le plus proche.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">{member.autorisationPhotos ? "[X]" : "[ ]"}</span>
                <span>
                  <strong>Droit à l'image :</strong> J'autorise le club à photographier ou filmer le nageur dans le cadre des activités d'Aqua Space pour la communication interne et officielle du club.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Signatures Page 2 */}
        <div className="border-t border-gray-300 pt-4 mt-6">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="font-semibold text-gray-600">Date et lieu :</p>
              <p className="font-mono mt-1">Pétion-Ville, le {formatDate(member.dateInscription)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-600">Nom et Signature du Parent / Responsable légal :</p>
              <p className="font-bold text-gray-800 mt-1">{member.parentPrenom} {member.parentNom}</p>
              <div className="mt-8 border-b border-gray-400 w-48 ml-auto"></div>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4">Page 2 / 2 — Fiche Médicale & Décharges Aqua Space FC TORO</p>
        </div>
      </div>
    </div>
  );
};
