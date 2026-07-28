import React, { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import Pagination from "@/components/tables/Pagination";
import { Player, Payment } from "@/types/club";
import {
  formatClubCurrency,
  formatClubDate,
  getPlayerFullName,
} from "@/lib/club/metrics";
import { paymentStatusLabel, playerStatusLabel } from "@/lib/club/status";
import { useClubData } from "@/context/ClubDataContext";

interface PlayerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

const getSafeAvatarSrc = (photoUrl?: string, fullName?: string) => {
  const trimmed = (photoUrl || "").trim();
  if (trimmed.length > 0) return trimmed;
  return "/images/user/user-01.jpg";
};

export const PlayerViewModal: React.FC<PlayerViewModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const { payments } = useClubData();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(5);

  if (!player) return null;

  const playerPayments = payments.filter((p) => p.playerId === player.id);

  const totalPages = Math.max(1, Math.ceil(playerPayments.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPayments = playerPayments.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  const fullName = getPlayerFullName(player);
  const avatarSrc = getSafeAvatarSrc(player.photoUrl, fullName);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between mb-6">
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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  {pagedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center">
                        Aucun paiement enregistré pour ce joueur.
                      </td>
                    </tr>
                  ) : (
                    pagedPayments.map((p) => (
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
    </Modal>
  );
};
