"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlayerForm from "@/components/club/forms/PlayerForm";
import { useClubData } from "@/context/ClubDataContext";
import { PlayerFormValues } from "@/types/club";
import { normalizePlayerFormValues, toPlayerFormValues } from "@/lib/club/player-form";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { updatePlayerInSupabase } from "@/lib/club/supabase-crud";

export default function EditPlayerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const { players, setPlayers } = useClubData();

  const targetPlayer = players.find((player) => player.id === playerId);
  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...players.map((player) => player.categorie)])],
    [players],
  );

  if (!targetPlayer) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Modifier joueur" />
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

  const handleSubmit = async (values: PlayerFormValues) => {
    const normalized = normalizePlayerFormValues(values);
    const today = new Date().toISOString().slice(0, 10);
    
    try {
      await updatePlayerInSupabase(playerId, normalized);
      
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === playerId
            ? {
                ...player,
                ...normalized,
                dernierPaiement:
                  normalized.cotisationStatut === "paid"
                    ? today
                    : player.dernierPaiement,
              }
            : player,
        ),
      );
      router.push("/joueurs");
    } catch (error) {
      alert("Erreur lors de la modification. Veuillez réessayer.");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Modifier joueur" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <PlayerForm
          initialValues={toPlayerFormValues(targetPlayer)}
          categories={categories}
          onCancel={() => router.push("/joueurs")}
          onSubmit={handleSubmit}
          submitLabel="Mettre a jour"
        />
      </div>
    </div>
  );
}
