"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ParentTable from "@/components/club/ParentTable";
import { useClubData } from "@/context/ClubDataContext";
import { getParentLinkedPlayerIds } from "@/lib/club/parents";
import { deleteParentInSupabase } from "@/lib/club/supabase-crud";

export default function ParentsPage() {
  const router = useRouter();
  const { parents, setParents, players } = useClubData();

  const handleDeleteParent = async (parentId: string) => {
    const target = parents.find((p) => p.id === parentId);
    if (!target) return;

    if (!window.confirm(`Supprimer le parent ${target.prenom} ${target.nom} ?`)) {
      return;
    }
    
    try {
      await deleteParentInSupabase(getParentLinkedPlayerIds(target));
      setParents((prev) => prev.filter((p) => p.id !== parentId));
    } catch (error) {
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Parents" />

      <div className="mb-6 flex items-center justify-end">
        <Link
          href="/parents/nouveau"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          + Ajouter un parent
        </Link>
      </div>

      <ParentTable
        parents={parents}
        players={players}
        onEditParent={(parent) => router.push(`/parents/${parent.id}/modifier`)}
        onDeleteParent={(parent) => handleDeleteParent(parent.id)}
      />
    </div>
  );
}
