"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlayerTable from "@/components/club/PlayerTable";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useClubData } from "@/context/ClubDataContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import { softDeletePlayerInSupabase } from "@/lib/club/supabase-crud";

export default function PlayersPage() {
  const router = useRouter();
  const { players, setPlayers } = useClubData();
  const { enabledPlayerColumns } = useDashboardConfig();

  const handleDeletePlayer = async (playerId: string) => {
    const target = players.find((player) => player.id === playerId);
    if (!target) {
      return;
    }

    const shouldDelete = window.confirm(
      `Supprimer le joueur ${getPlayerFullName(target)} ?`,
    );
    if (!shouldDelete) {
      return;
    }

    try {
      await softDeletePlayerInSupabase(playerId);
      setPlayers((prevPlayers) =>
        prevPlayers.filter((player) => player.id !== playerId),
      );
    } catch (error) {
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  };

  const tableColumns =
    enabledPlayerColumns.length > 0 ? enabledPlayerColumns : undefined;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Joueurs" />

      <PlayerTable
        players={players}
        columns={tableColumns}
        onViewPlayer={(player) => router.push(`/joueurs/${player.id}`)}
        onEditPlayer={(player) => router.push(`/joueurs/${player.id}/modifier`)}
        onDeletePlayer={(player) => handleDeletePlayer(player.id)}
        actionButton={
          <Link
            href="/joueurs/nouveau"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            + Ajouter un joueur
          </Link>
        }
      />
    </div>
  );
}
