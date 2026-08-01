"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import Pagination from "@/components/tables/Pagination";
import { Player } from "@/types/club";
import {
  formatClubCurrency,
  formatClubDate,
  getPlayerFullName,
} from "@/lib/club/metrics";
import { paymentStatusLabel, playerStatusLabel } from "@/lib/club/status";
import { useClubData } from "@/context/ClubDataContext";
import { fetchFullRegistrationDataForPlayer } from "@/lib/club/supabase-demandes";

interface PlayerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

const getSafeAvatarSrc = (photoUrl?: string) => {
  const trimmed = (photoUrl || "").trim();
  if (trimmed.length > 0 && !trimmed.includes("user-01")) return trimmed;
  return "/images/user/silhouette.svg";
};

export const PlayerViewModal: React.FC<PlayerViewModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const { payments } = useClubData();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(5);
  
  const [regData, setRegData] = useState<any>(null);
  const [docList, setDocList] = useState<any[]>([]);
  const [isLoadingReg, setIsLoadingReg] = useState(false);

  useEffect(() => {
    if (player && isOpen) {
      let isMounted = true;
      setIsLoadingReg(true);
      fetchFullRegistrationDataForPlayer(player).then(({ registration, documents }) => {
        if (isMounted) {
          setRegData(registration);
          setDocList(documents);
          setIsLoadingReg(false);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [player, isOpen]);

  if (!player) return null;

  const playerPayments = payments.filter((p) => p.playerId === player.id);
  const totalPages = Math.max(1, Math.ceil(playerPayments.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPayments = playerPayments.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  const fullName = getPlayerFullName(player);
  const avatarSrc = getSafeAvatarSrc(player.photoIdentiteUrl || player.photoUrl);

  // Extract fields from player or regData fallback
  const programme = player.programme || (regData?.program === "tiToro" ? "Ti Toro (2 à 5 ans)" : regData?.program === "fcToro" ? "FC Toro (6 ans et plus)" : regData?.program) || (player.categorie?.toLowerCase().includes("ti") ? "Ti Toro (2 à 5 ans)" : "FC Toro (6 ans et plus)");
  const ecole = player.ecole || regData?.child_school || "Non renseigné";
  const experienceSoccer = player.experienceSoccer || regData?.child_soccer_experience || "Non renseigné";

  const parentNom = player.parentNomPrenom || regData?.guardian_name || "Non renseigné";
  const parentEmail = player.parentEmail || regData?.guardian_email || player.email || "Non renseigné";
  const parentPhone = player.parentTelephone || regData?.guardian_phone || player.telephone || "Non renseigné";
  const parentAdresse = player.parentAdresse || regData?.guardian_address || player.adresse || "Non renseigné";

  const urgenceNom = player.urgenceNomPrenom || regData?.emergency_name || "Non renseigné";
  const urgenceLien = player.urgenceLien || regData?.emergency_relation || "Non renseigné";
  const urgencePhone = player.urgenceTelephone || regData?.emergency_phone || "Non renseigné";
  const urgenceEmail = player.urgenceEmail || regData?.emergency_email || "Non renseigné";
  const urgenceAdresse = player.urgenceAdresse || regData?.emergency_address || "Non renseigné";

  const tailleHaut = player.tailleHaut || regData?.uniform_top_size || "Non renseigné";
  const tailleShort = player.tailleShort || regData?.uniform_short_size || "Non renseigné";
  const numerosPreferes = player.numerosPreferes || regData?.preferred_numbers || "Non renseigné";

  const planPaiement = player.planPaiement || regData?.payment_plan || "Plan standard";
  const modePaiementChoisi = player.modePaiementChoisi || regData?.payment_method || "Standard";

  const photoDoc = docList.find(d => String(d.doc_key).includes("photo"))?.path || player.photoIdentiteUrl;
  const birthCertDoc = docList.find(d => String(d.doc_key).includes("birth") || String(d.doc_key).includes("naissance"))?.path || player.acteNaissanceUrl;
  const parentIdDoc = docList.find(d => String(d.doc_key).includes("parent") || String(d.doc_key).includes("identit"))?.path || player.carteIdentiteParentUrl;

  const resolveDocUrl = (pathStr?: string) => {
    if (!pathStr) return null;
    if (pathStr.startsWith("http") || pathStr.startsWith("data:")) return pathStr;
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uivlcmvofzoyzhtjntlp.supabase.co";
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${pathStr.replace(/^\/+/, "")}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-4">
            <Image
              src={avatarSrc}
              alt={fullName}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover shadow-md border-2 border-brand-500 bg-gray-100 dark:bg-gray-800 p-1"
              unoptimized
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {fullName}
                </h3>
                {player.matricule && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    {player.matricule}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Poste: <span className="font-semibold text-gray-800 dark:text-gray-200">{player.poste || "Non spécifié"}</span> • Catégorie: <span className="font-semibold text-brand-600">{player.categorie}</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  player.statut === "actif" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" :
                  player.statut === "blesse" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" :
                  player.statut === "suspendu" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" :
                  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}>
                  {playerStatusLabel[player.statut]}
                </span>
                <span className="text-xs text-gray-400">
                  Inscrit le {formatClubDate(player.dateInscription)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <span className="px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-xs font-bold text-brand-700 dark:text-brand-300">
              {programme}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          {/* Section 01: Identité du joueur & Programme */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-xs">01</span>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Identité du Joueur</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Nom complet</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{fullName}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Date de naissance</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{formatClubDate(player.dateNaissance)}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Genre</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{player.sexe}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Adresse domicile</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{player.adresse || "Non renseigné"}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">École fréquentée</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{ecole}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Ancienne expérience soccer</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{experienceSoccer}</span>
              </div>
            </div>
          </div>

          {/* Section 02: Parents / Tuteur */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-xs">02</span>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Parents / Tuteur Responsable</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Nom & Prénom</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{parentNom}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">E-mail</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{parentEmail}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Téléphone / WhatsApp</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{parentPhone}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Adresse physique</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{parentAdresse}</span>
              </div>
            </div>
          </div>

          {/* Section 03: Contact d'urgence */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs">03</span>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Contact d'Urgence</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Nom & Prénom</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{urgenceNom}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Lien de parenté</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{urgenceLien}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Téléphone</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{urgencePhone}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">E-mail</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{urgenceEmail}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Adresse</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{urgenceAdresse}</span>
              </div>
            </div>
          </div>

          {/* Section 04: Uniformes & Tailles */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-xs">04</span>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Uniformes & Tailles</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Taille Haut (Top)</span>
                <span className="inline-block px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white">{tailleHaut}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Taille Short</span>
                <span className="inline-block px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white">{tailleShort}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Numéros préférés</span>
                <span className="inline-block px-3 py-1 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/20 text-sm font-bold">{numerosPreferes}</span>
              </div>
            </div>
          </div>

          {/* Section 05 & 06: Plan & Mode de paiement */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-xs">05</span>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Plan & Mode de Paiement</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Plan de Paiement</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{planPaiement}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Mode de règlement</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{modePaiementChoisi}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Montant Total Payé</span>
                <span className="block text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatClubCurrency(player.cotisationMontant, player.cotisationDevise)}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Dernier versement</span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{formatClubDate(player.dernierPaiement)}</span>
              </div>
            </div>
          </div>

          {/* Section 07: Documents PDF & Pièces jointes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-xs">07</span>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Documents & Pièces Jointes PDF</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Photo d'identité */}
              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center shrink-0">
                    📷
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Photo d'identité</h5>
                    <p className="text-xs text-gray-500">Format passeport</p>
                  </div>
                </div>
                {resolveDocUrl(photoDoc) ? (
                  <a
                    href={resolveDocUrl(photoDoc)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-brand-600 hover:bg-brand-50 transition-colors shadow-xs"
                  >
                    Voir la photo
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic py-1">Non fourni</span>
                )}
              </div>

              {/* Acte de naissance */}
              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                    📄
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Acte de Naissance</h5>
                    <p className="text-xs text-gray-500">Document légal (PDF/JPG)</p>
                  </div>
                </div>
                {resolveDocUrl(birthCertDoc) ? (
                  <a
                    href={resolveDocUrl(birthCertDoc)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-xs"
                  >
                    Ouvrir le document
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic py-1">Non fourni</span>
                )}
              </div>

              {/* Carte d'identité Parent */}
              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                    🪪
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Carte d'Identité Parent</h5>
                    <p className="text-xs text-gray-500">Pièce du tuteur (PDF/JPG)</p>
                  </div>
                </div>
                {resolveDocUrl(parentIdDoc) ? (
                  <a
                    href={resolveDocUrl(parentIdDoc)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors shadow-xs"
                  >
                    Ouvrir la pièce
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic py-1">Non fourni</span>
                )}
              </div>
            </div>
          </div>

          {/* Section Historique des Paiements */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Historique des Paiements Effectués
            </h4>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm text-gray-600 dark:text-gray-400">
                  <thead className="bg-gray-50 text-gray-800 dark:bg-white/[0.02] dark:text-white/90">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Montant</th>
                      <th className="px-4 py-3 font-semibold">Méthode</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {pagedPayments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                          Aucun versement enregistré pour ce joueur.
                        </td>
                      </tr>
                    ) : (
                      pagedPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-3">{formatClubDate(p.datePaiement ?? "")}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                            {formatClubCurrency(p.montant, p.devise)}
                          </td>
                          <td className="px-4 py-3 capitalize">{p.methode}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.statut === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'}`}>
                              {paymentStatusLabel[p.statut]}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex justify-end">
                <Pagination
                  currentPage={currentPageSafe}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={currentPageSize}
                  onPageSizeChange={(size) => {
                    setCurrentPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
