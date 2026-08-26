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
import { useUserRole } from "@/context/UserRoleContext";
import { fetchFullRegistrationDataForPlayer } from "@/lib/club/supabase-demandes";
import { PlayerSportsTracking } from "@/components/club/player/PlayerSportsTracking";

interface PlayerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  hideParentsAndDocs?: boolean;
  onAddPayment?: (player: Player) => void;
}

const getSafeAvatarSrc = (photoUrl?: string) => {
  const trimmed = (photoUrl || "").trim();
  if (trimmed.length > 0 && !trimmed.includes("user-01")) return trimmed;
  return "/images/user/silhouette.svg";
};

const getPlayerFinancialSummary = (player: Player, playerPayments: any[]) => {
  const playerStatus = ((player as any).statutJoueur || "").toLowerCase().trim();
  const isBoursier = playerStatus === "bourse" || playerStatus === "boursier" || playerPayments.some(p => (p.remarque || "").toLowerCase().includes("[plan:boursier]"));

  if (isBoursier) {
    return {
      isBoursier: true,
      hasNoPayments: false,
      balance: 0,
      devise: "US" as const,
      isPaidInFull: true,
      isMonthlyPlan: false,
      monthsPaid: 0,
      totalPaidUSD: 0,
    };
  }

  if (!playerPayments || playerPayments.length === 0) {
    return {
      isBoursier: false,
      hasNoPayments: true,
      balance: 0,
      devise: "US" as const,
      isPaidInFull: false,
      isMonthlyPlan: (player.planPaiement || "").toLowerCase().includes("mensuel"),
      monthsPaid: 0,
      totalPaidUSD: 0,
    };
  }

  // Dédupliquer les paiements identiques (même montant, date et remarque)
  const uniquePayments: any[] = [];
  const seenKeys = new Set<string>();
  playerPayments.forEach((p) => {
    const key = `${p.montant}_${p.datePaiement}_${(p.remarque || "").trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniquePayments.push(p);
    }
  });

  const hasHTG = uniquePayments.some(p => p.devise === "HTG" || (p.montantHTG && p.montantHTG > 0));
  const mainDevise: "US" | "HTG" = hasHTG ? "HTG" : "US";

  let totalPaid = 0;
  if (mainDevise === "HTG") {
    totalPaid = uniquePayments.reduce((acc, p) => {
      if (p.devise === "HTG" || (p.montantHTG && p.montantHTG > 0)) {
        return acc + (p.montantHTG || p.montant || 0);
      }
      const taux = p.taux || 130;
      return acc + ((p.montantUS || p.montant || 0) * taux);
    }, 0);
  } else {
    totalPaid = uniquePayments.reduce((acc, p) => {
      if (p.devise === "US" || (p.montantUS && p.montantUS > 0)) {
        return acc + (p.montantUS || p.montant || 0);
      }
      const taux = p.taux || 130;
      return acc + (taux > 0 ? (p.montantHTG || p.montant || 0) / taux : 0);
    }, 0);
  }

  // Recherche du montant total dû du dossier (le TOTAL_DUE le plus élevé ou du paiement principal)
  let dossierTotalDueUSD = 0;
  let maxMonthsPaid = 0;
  let isMonthlyPlan = (player.planPaiement || "").toLowerCase().includes("mensuel");

  uniquePayments.forEach((p) => {
    const remark = p.remarque || "";
    const remarkLower = remark.toLowerCase();

    if (remarkLower.includes("[plan:mensuel]") || remarkLower.includes("mensuel")) {
      isMonthlyPlan = true;
    }

    const moisMatch = remark.match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || remark.match(/(\d+)\s*mois/i);
    if (moisMatch && moisMatch[1]) {
      const m = parseInt(moisMatch[1], 10);
      if (m > maxMonthsPaid) maxMonthsPaid = m;
    }

    const totalDueMatch = remark.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
    if (totalDueMatch && totalDueMatch[1]) {
      const due = parseFloat(totalDueMatch[1]);
      if (!isNaN(due) && due > dossierTotalDueUSD) {
        dossierTotalDueUSD = due;
      }
    }
  });

  // Le solde dû du dossier = Total Dû du Dossier - Total déjà versé par le joueur
  let balance = 0;
  if (dossierTotalDueUSD > 0) {
    if (mainDevise === "HTG") {
      let taux = 130;
      const firstHTG = uniquePayments.find(p => p.devise === "HTG" || (p.montantHTG && p.montantHTG > 0));
      if (firstHTG) {
        taux = firstHTG.taux || 0;
        if (taux <= 1) {
          const tauxMatch = (firstHTG.remarque || "").match(/\[TAUX:\s*([\d.]+)\s*\]/i);
          taux = tauxMatch ? parseFloat(tauxMatch[1]) : 130;
        }
      }
      const totalDueHTG = dossierTotalDueUSD * taux;
      balance = Math.max(0, totalDueHTG - totalPaid);
    } else {
      balance = Math.max(0, dossierTotalDueUSD - totalPaid);
    }
  }

  return {
    isBoursier: false,
    hasNoPayments: false,
    balance: Math.round(balance * 100) / 100,
    devise: mainDevise,
    isPaidInFull: balance <= 0.01,
    isMonthlyPlan,
    monthsPaid: maxMonthsPaid || (isMonthlyPlan && uniquePayments.length > 0 ? 1 : 0),
    totalPaidUSD: totalPaid,
  };
};

export const PlayerViewModal: React.FC<PlayerViewModalProps> = ({
  isOpen,
  onClose,
  player,
  hideParentsAndDocs = false,
  onAddPayment,
}) => {
  const { payments } = useClubData();
  const { role, isCoach } = useUserRole();
  const isConfidential = hideParentsAndDocs || isCoach || role === "coach";

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(5);
  
  const [regData, setRegData] = useState<any>(null);
  const [docList, setDocList] = useState<any[]>([]);
  const [isLoadingReg, setIsLoadingReg] = useState(false);

  useEffect(() => {
    if (player && isOpen && !isConfidential) {
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
  }, [player, isOpen, isConfidential]);

  if (!player) return null;

  const playerPayments = payments.filter((p) => String(p.playerId) === String(player.id));
  const finSummary = getPlayerFinancialSummary(player, playerPayments);
  const totalPages = Math.max(1, Math.ceil(playerPayments.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPayments = playerPayments.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  const fullName = getPlayerFullName(player);
  const avatarSrc = getSafeAvatarSrc(player.photoIdentiteUrl || player.photoUrl);

  // Extract fields from player or regData fallback
  const programme = player.programme || (regData?.program === "tiToro" ? "Ti Toro" : regData?.program === "fcToro" ? "FC Toro" : regData?.program) || (player.categorie?.toLowerCase().includes("ti") ? "Ti Toro" : "FC Toro");
  const ecole = player.ecole || regData?.child_school || "Non renseigné";
  const experienceSoccer = player.experienceSoccer || regData?.child_soccer_experience || "Non renseigné";

  const parentNom = player.parentNomPrenom || regData?.guardian_name || "Non renseigné";
  const parentLien = player.parentLien || regData?.guardian_relation || regData?.guardian_link || regData?.parent_lien || regData?.relationship || "Non renseigné";
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
                  {playerStatusLabel[player.statut as keyof typeof playerStatusLabel] || player.statut}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  finSummary.isBoursier ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" :
                  finSummary.hasNoPayments ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                  finSummary.isPaidInFull ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" :
                  "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                }`}>
                  {finSummary.isBoursier ? "🎓 Boursier (Exonéré)" :
                   finSummary.hasNoPayments ? "⚪ Aucun versement" :
                   finSummary.isPaidInFull ? "✓ À jour (Payé)" :
                   `⚠️ Solde dû : ${formatClubCurrency(finSummary.balance, finSummary.devise)}`}
                </span>
                <span className="text-xs text-gray-400">
                  Inscrit le {formatClubDate(player.dateInscription)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
            {onAddPayment && !isConfidential && (
              <button
                type="button"
                onClick={() => onAddPayment(player)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#107C41] hover:bg-[#0c5e31] text-xs font-bold text-white shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="2" y1="10" x2="22" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 15h3" />
                </svg>
                Effectuer un paiement
              </button>
            )}
            <span className="px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-xs font-bold text-brand-700 dark:text-brand-300">
              {programme}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-gray-50/30 dark:bg-gray-900/50">
          {/* Section 01: Identité du joueur & Programme */}
          <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-base">Identité du Joueur</h4>
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

          {/* Section Uniformes & Tailles */}
          <div className="rounded-2xl shadow-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute -right-10 -top-10 opacity-5 dark:opacity-10 pointer-events-none">
              <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2.5 bg-brand-50 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">Uniformes & Tailles</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Haut (Maillot)</span>
                <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 text-base font-bold text-gray-900 dark:text-white">{tailleHaut}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bas (Short)</span>
                <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 text-base font-bold text-gray-900 dark:text-white">{tailleShort}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Numéros</span>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm border ${numerosPreferes === "Non renseigné" ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-900/30" : "bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-900/30 dark:border-brand-800"}`}>{numerosPreferes}</span>
              </div>
            </div>
          </div>

          {/* Section Suivi Sportif */}
          <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-base">Suivi Sportif & Présences</h4>
            </div>
            <PlayerSportsTracking playerId={player.id} />
          </div>

          {/* Section 02: Parents / Tuteur */}
          {!isConfidential && (
            <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">Parents / Tuteur Responsable</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Nom & Prénom</span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{parentNom}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Lien avec le joueur</span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{parentLien}</span>
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
          )}

          {/* Section 03: Contact d'urgence */}
          {!isConfidential && (
            <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">Contact d'Urgence</h4>
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
          )}


          {/* Section 05 & 06: Plan & Mode de paiement */}
          {!isConfidential && (
            <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">Dossier Financier</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Statut Joueur / Plan</span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{(player as any).statutJoueur || planPaiement}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Statut du Règlement</span>
                  <span className={`block text-sm font-bold ${
                    finSummary.isBoursier ? "text-purple-600 dark:text-purple-400" :
                    finSummary.hasNoPayments ? "text-gray-500 dark:text-gray-400" :
                    finSummary.isPaidInFull ? "text-emerald-600 dark:text-emerald-400" :
                    "text-red-600 dark:text-red-400"
                  }`}>
                    {finSummary.isBoursier ? "Boursier (Exonéré)" :
                     finSummary.hasNoPayments ? "Aucun versement enregistré" :
                     finSummary.isPaidInFull ? "À jour (Payé)" :
                     `Solde dû : ${formatClubCurrency(finSummary.balance, finSummary.devise)}`}
                  </span>
                </div>
                {finSummary.isMonthlyPlan && (
                  <div>
                    <span className="block text-xs font-medium text-gray-500 mb-1">Mois Réglé(s)</span>
                    <span className="block text-sm font-bold text-brand-600 dark:text-brand-400">
                      {finSummary.monthsPaid} mois payé(s)
                    </span>
                  </div>
                )}
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Montant Total Payé</span>
                  <span className="block text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatClubCurrency(finSummary.totalPaidUSD || player.cotisationMontant, player.cotisationDevise || "US")}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Dernier versement</span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{formatClubDate(player.dernierPaiement)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 07: Documents PDF & Pièces jointes */}
          {!isConfidential && (
            <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">Documents & Pièces Jointes PDF</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Photo d'identité */}
                <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
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
                      className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
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
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
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
                      className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
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
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
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
                      className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
                    >
                      Ouvrir la pièce
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic py-1">Non fourni</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section Historique des Paiements */}
          {!isConfidential && (
            <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-base">Historique des Paiements Effectués</h4>
                </div>
                {onAddPayment && (
                  <button
                    type="button"
                    onClick={() => onAddPayment(player)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-colors"
                  >
                    + Effectuer un paiement
                  </button>
                )}
              </div>
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
          )}
        </div>
      </div>
    </Modal>
  );
};
