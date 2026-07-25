"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AlumniForm from "@/components/club/forms/AlumniForm";
import { useClubData } from "@/context/ClubDataContext";
import { AlumniFormValues } from "@/types/club";
import { updateAlumniInSupabase } from "@/lib/club/supabase-crud";

export default function EditAlumniPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const alumniId = params.id;
  const { alumni, setAlumni } = useClubData();

  const targetAlumni = alumni.find((entry) => entry.id === alumniId);

  if (!targetAlumni) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Modifier alumni" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
          Alumni introuvable.
        </div>
        <Link
          href="/alumni"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Retour a la liste
        </Link>
      </div>
    );
  }

  const handleSubmit = async (values: AlumniFormValues) => {
    try {
      await updateAlumniInSupabase(alumniId, values);
      setAlumni((prevEntries) =>
        prevEntries.map((entry) =>
          entry.id === alumniId ? { ...entry, ...values } : entry,
        ),
      );
      router.push("/alumni");
    } catch (error) {
      alert("Erreur lors de la modification.");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Modifier alumni" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <AlumniForm
          initialValues={targetAlumni}
          onCancel={() => router.push("/alumni")}
          onSubmit={handleSubmit}
          submitLabel="Mettre a jour"
        />
      </div>
    </div>
  );
}
