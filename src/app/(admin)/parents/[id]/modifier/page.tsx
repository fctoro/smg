"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ParentForm from "@/components/club/forms/ParentForm";
import { useClubData } from "@/context/ClubDataContext";
import { ParentFormValues } from "@/types/club";
import { updateParentInSupabase } from "@/lib/club/supabase-crud";

export default function EditParentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const parentId = params.id;
  const { parents, setParents, players } = useClubData();

  const targetParent = parents.find((parent) => parent.id === parentId);

  if (!targetParent) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Modifier parent" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
          Parent introuvable.
        </div>
        <Link
          href="/parents"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Retour a la liste
        </Link>
      </div>
    );
  }

  const handleSubmit = async (values: ParentFormValues) => {
    try {
      await updateParentInSupabase(values.playerId, values);
      setParents((prevParents) =>
        prevParents.map((parent) =>
          parent.id === parentId ? { ...parent, ...values } : parent,
        ),
      );
      router.push("/parents");
    } catch (error) {
      alert("Erreur lors de la modification. Veuillez réessayer.");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Modifier parent" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <ParentForm
          players={players}
          initialValues={targetParent}
          onCancel={() => router.push("/parents")}
          onSubmit={handleSubmit}
          submitLabel="Mettre a jour"
        />
      </div>
    </div>
  );
}
