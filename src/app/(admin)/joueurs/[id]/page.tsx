"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import {
  formatClubCurrency,
  formatClubDate,
  getPlayerFullName,
} from "@/lib/club/metrics";
import { paymentStatusLabel, playerStatusLabel } from "@/lib/club/status";

const getSafeAvatarSrc = (photoUrl: string, fullName: string) => {
  const trimmed = photoUrl.trim();
  if (trimmed.length > 0) return trimmed;
  return "/images/user/user-01.jpg";
};

export default function PlayerDetailsPage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const { players, payments } = useClubData();

  const player = players.find((item) => item.id === playerId);
  const playerPayments = payments.filter((p) => p.playerId === playerId);

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
  const avatarSrc = getSafeAvatarSrc(player.photoUrl, fullName);

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
              className="h-20 w-20 rounded-full object-cover"
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
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Montant Total Paye: {formatClubCurrency(player.cotisationMontant, player.cotisationDevise)}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
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
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Méthode</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {playerPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center">
                        Aucun paiement enregistré pour ce joueur.
                      </td>
                    </tr>
                  ) : (
                    playerPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3">{formatClubDate(p.datePaiement ?? "")}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                          {formatClubCurrency(p.montant, p.devise)}
                        </td>
                        <td className="px-4 py-3">{p.methode}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.statut === 'paid' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
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
        </div>
      </div>
    </div>
  );
}
