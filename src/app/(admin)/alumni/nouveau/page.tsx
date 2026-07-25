"use client";

import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AlumniForm from "@/components/club/forms/AlumniForm";
import { useClubData } from "@/context/ClubDataContext";
import { Alumni, AlumniFormValues } from "@/types/club";
import { addAlumniToSupabase } from "@/lib/club/supabase-crud";

export default function NewAlumniPage() {
  const router = useRouter();
  const { setAlumni } = useClubData();

  const handleSubmit = async (values: AlumniFormValues) => {
    try {
      const insertedData = await addAlumniToSupabase(values);
      const newEntry: Alumni = {
        id: insertedData.id,
        ...values,
      };
      setAlumni((prevEntries) => [newEntry, ...prevEntries]);
      router.push("/alumni");
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
