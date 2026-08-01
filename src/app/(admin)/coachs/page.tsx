"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useConfirm } from "@/hooks/useConfirm";
import CoachTable from "@/components/club/CoachTable";
import { Coach } from "@/types/club";
import { fetchCoaches, deleteCoach } from "@/lib/club/coachs";

import { TableSkeleton } from "@/components/ui/skeleton/Skeleton";
import { CoachAddModal } from "@/components/club/modals/CoachAddModal";

export default function CoachsPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { confirm, ConfirmComponent } = useConfirm();

  const loadCoaches = async () => {
    setIsLoading(true);
    const data = await fetchCoaches();
    setCoaches(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCoaches();
  }, []);

  const handleDeleteCoach = (coach: Coach) => {
    confirm({
      title: "Supprimer le coach",
      message: `Voulez-vous vraiment supprimer le coach ${coach.nom} ${coach.prenom} ? Cette action est irréversible.`,
      onConfirm: async () => {
        const { error } = await deleteCoach(coach.id);
        if (error) {
          alert(`Erreur: ${error}`);
        } else {
          loadCoaches();
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <ConfirmComponent />
      <PageBreadcrumb pageTitle="Gestion des Coachs" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
            Coachs du Club
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez les coachs, leurs coordonnées et les catégories qui leur sont attribuées.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 bg-white rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900">
          <TableSkeleton rows={5} columns={5} />
        </div>
      ) : (
        <CoachTable 
          coaches={coaches} 
          onDelete={handleDeleteCoach} 
          actionButton={
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/20 cursor-pointer"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter Coach
            </button>
          }
        />
      )}

      <CoachAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadCoaches}
      />
    </div>
  );
}
