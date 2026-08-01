"use client";

import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AlumniForm from "@/components/club/forms/AlumniForm";
import { useClubData } from "@/context/ClubDataContext";
import { addPlayerToSupabase } from "@/lib/club/supabase-crud";
import { createPlayerFromForm } from "@/lib/club/player-form";
import { PlayerStatus, Alumni, AlumniFormValues } from "@/types/club";

export default function NewAlumniPage() {
  const router = useRouter();
  const { setPlayers } = useClubData();

  const handleSubmit = async (values: AlumniFormValues) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const finalValues = { ...values, statut: "alumni" as PlayerStatus };
      const newPlayerLocal = createPlayerFromForm(`temp-${Date.now()}`, finalValues, today);
      
      const inserted = await addPlayerToSupabase(newPlayerLocal);
      if (inserted && inserted.EtudiantID) {
        const newEntry: Alumni = { ...newPlayerLocal, id: String(inserted.EtudiantID) };
        setPlayers((prevEntries) => [newEntry, ...prevEntries]);
        router.push("/alumni");
      } else {
        alert("Erreur lors de la création.");
      }
    } catch (error) {
      alert("Erreur lors de l'ajout.");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Ajouter un alumni" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <AlumniForm
          onCancel={() => router.push("/alumni")}
          onSubmit={handleSubmit}
          submitLabel="Enregistrer"
        />
      </div>
    </div>
  );
}
