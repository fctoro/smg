"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlayerForm from "@/components/club/forms/PlayerForm";
import { useClubData } from "@/context/ClubDataContext";
import { PlayerFormValues } from "@/types/club";
import { createPlayerFromForm } from "@/lib/club/player-form";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { addPlayerToSupabase } from "@/lib/club/supabase-crud";

export default function NewPlayerPage() {
  const router = useRouter();
  const { players, setPlayers } = useClubData();

  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...players.map((player) => player.categorie)])],
    [players],
  );

  const handleSubmit = async (values: PlayerFormValues) => {
    const today = new Date().toISOString().slice(0, 10);
    const newPlayerLocal = createPlayerFromForm(`temp-${Date.now()}`, values, today);
    
    try {
      const inserted = await addPlayerToSupabase(newPlayerLocal);
      if (inserted && inserted.EtudiantID) {
        const newPlayer = { ...newPlayerLocal, id: String(inserted.EtudiantID) };
        setPlayers((prevPlayers) => [newPlayer, ...prevPlayers]);
        router.push("/joueurs");
      }
    } catch (error) {
      alert("Erreur lors de la création. Veuillez réessayer.");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Ajouter un joueur" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <PlayerForm
          categories={categories}
          onCancel={() => router.push("/joueurs")}
          onSubmit={handleSubmit}
          submitLabel="Enregistrer"
        />
      </div>
      <div className="flex justify-end">
        <Link
          href="/joueurs"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Retour a la liste
        </Link>
      </div>
    </div>
  );
}
