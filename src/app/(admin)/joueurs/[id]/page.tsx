"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/tables/Pagination";
import { useClubData } from "@/context/ClubDataContext";
import { useState, useMemo } from "react";
import {
  formatClubCurrency,
  formatClubDate,
  getPlayerFullName,
} from "@/lib/club/metrics";
import { paymentStatusLabel, playerStatusLabel } from "@/lib/club/status";

const getSafeAvatarSrc = (photoUrl?: string): string => {
  const trimmed = (photoUrl || "").trim();
  if (trimmed.length > 0 && !trimmed.includes("user-01")) return trimmed;
  return "/images/user/silhouette.svg";
};

/** Calcule le solde restant pour un paiement individuel (même logique que la page paiements) */
const computePaymentBalance = (p: any): { balance: number; devise: "US" | "HTG" } => {
  const paymentDevise = (p.devise || "US") as "US" | "HTG";
  const zero = { balance: 0, devise: paymentDevise };

  const remarkLower = (p.remarque || "").toLowerCase();
  // Ignorer les boursiers
  if (remarkLower.includes("[plan:boursier]")) return zero;
  // Paiements kit-only sans adhésion : pas de dette
  const isKitOnly = !remarkLower.includes("adhésion") && !remarkLower.includes("adhesion");

  const totalDueMatch = (p.remarque || "").match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
  if (!totalDueMatch) return zero;
  const totalDueUSD = parseFloat(totalDueMatch[1]);
  if (isNaN(totalDueUSD) || totalDueUSD <= 0) return zero;
  if (isKitOnly && totalDueUSD >= 900) return zero;

  if (paymentDevise === "HTG") {
    let taux = p.taux || 0;
    if (taux <= 1) {
      const tauxMatch = (p.remarque || "").match(/\[TAUX:\s*([\d.]+)\s*\]/i);
      taux = tauxMatch ? parseFloat(tauxMatch[1]) : 130;
    }
    if (taux <= 1) return zero;
    const totalDueHTG = totalDueUSD * taux;
    const balanceHTG = totalDueHTG - p.montant;
    return balanceHTG > 1 ? { balance: Math.round(balanceHTG), devise: "HTG" } : zero;
  } else {
    const balanceUSD = totalDueUSD - p.montant;
    return balanceUSD > 0.01 ? { balance: Number(balanceUSD.toFixed(2)), devise: "US" } : zero;
  }
};

export default function PlayerDetailsPage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const { players, payments } = useClubData();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(100);

  const player = players.find((item) => item.id === playerId);
  const playerPayments = payments.filter((p) => p.playerId === playerId);

  // Calcul financier synthétique
  const finSummary = useMemo(() => {
    if (!player) return null;

    const playerStatus = ((player as any).statutJoueur || "").toLowerCase().trim();
    const isBoursier = playerStatus === "bourse" || playerStatus === "boursier"
      || playerPayments.some(p => (p.remarque || "").toLowerCase().includes("[plan:boursier]"));

    // Dédupliquer les paiements identiques
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

    if (isBoursier) return { isBoursier: true, totalPaid, balance: 0, devise: mainDevise, isPaidInFull: true };

    let dossierTotalDueUSD = 0;
    uniquePayments.forEach((p) => {
      const remark = p.remarque || "";
      const totalDueMatch = remark.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      if (totalDueMatch && totalDueMatch[1]) {
        const due = parseFloat(totalDueMatch[1]);
        if (!isNaN(due) && due > dossierTotalDueUSD) {
          dossierTotalDueUSD = due;
        }
      }
    });

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
      totalPaidUSD: totalPaid,
      balance: Math.round(balance * 100) / 100,
      devise: mainDevise,
      isPaidInFull: balance <= 0.01,
    };
  }, [player, playerPayments]);

  const totalPages = Math.max(1, Math.ceil(playerPayments.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPayments = playerPayments.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  if (!player) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Fiche joueur" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
          Joueur introuvable.
        </div>
        <Link
          href="/joueurs"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Retour a la liste
        </Link>
      </div>
    );
  }

  const fullName = getPlayerFullName(player);
  const avatarSrc = getSafeAvatarSrc(player.photoIdentiteUrl || player.photoUrl);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Fiche joueur" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
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
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                {fullName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {player.poste} - {player.categorie}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <Link
              href={`/joueurs/${player.id}/modifier`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Modifier
            </Link>
            <Link
              href="/joueurs"
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Retour liste
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Contact
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {player.telephone}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {player.email}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {player.adresse}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Profil
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Statut: {playerStatusLabel[player.statut]}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Date naissance: {formatClubDate(player.dateNaissance)}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Inscription: {formatClubDate(player.dateInscription)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Cotisation Globale
            </p>
            {finSummary ? (
              <>
                {finSummary.isBoursier ? (
                  <p className="mt-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                    🎓 Boursier (Exonéré)
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      Total versé (USD) : <span className="font-semibold text-gray-900 dark:text-white">{formatClubCurrency(finSummary.totalPaidUSD, "US")}</span>
                    </p>
                    {finSummary.balance > 0 ? (
                      <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                        Solde dû : {formatClubCurrency(finSummary.balance, finSummary.devise)}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ À jour (Payé)
                      </p>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">—</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Dernier paiement: {formatClubDate(player.dernierPaiement)}
            </p>
          </div>
        </div>

        {/* SECTION HISTORIQUE DES PAIEMENTS */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Historique des Paiements
          </h4>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 text-gray-800 dark:bg-white/[0.02] dark:text-white/90">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Montant versé</th>
                    <th className="px-4 py-3 font-medium">Solde restant</th>
                    <th className="px-4 py-3 font-medium">Méthode</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pagedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center">
                        Aucun paiement enregistré pour ce joueur.
                      </td>
                    </tr>
                  ) : (
                    pagedPayments.map((p) => {
                      const bal = computePaymentBalance(p);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-3">{formatClubDate(p.datePaiement ?? "")}</td>
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                            {formatClubCurrency(p.montant, p.devise)}
                          </td>
                          <td className="px-4 py-3">
                            {bal.balance > 0 ? (
                              <span className="font-medium text-red-600 dark:text-red-400">
                                {formatClubCurrency(bal.balance, bal.devise)}
                              </span>
                            ) : (
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">À jour</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{p.methode}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.statut === 'paid' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
                              {paymentStatusLabel[p.statut]}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
        </div>
      </div>
    </div>
  );
}

