"use client";

import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ParentForm from "@/components/club/forms/ParentForm";
import { useClubData } from "@/context/ClubDataContext";
import { Parent, ParentFormValues } from "@/types/club";
import { groupParentsByFamily } from "@/lib/club/parents";
import { updateParentInSupabase } from "@/lib/club/supabase-crud";

export default function NewParentPage() {
  const router = useRouter();
  const { players, setParents } = useClubData();

  const handleSubmit = async (values: ParentFormValues) => {
    try {
      await updateParentInSupabase(values.playerId, values);
      const newParent: Parent = {
        id: `pa-${values.playerId}`,
        ...values,
        playerIds: [values.playerId],
      };
      setParents((prevParents) => groupParentsByFamily([newParent, ...prevParents]));
      router.push("/parents");
    } catch (error) {
      alert("Erreur lors de l'ajout. Veuillez réessayer.");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Ajouter un parent" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <ParentForm
          players={players}
          onCancel={() => router.push("/parents")}
          onSubmit={handleSubmit}
          submitLabel="Enregistrer"
        />
      </div>
    </div>
  );
}
