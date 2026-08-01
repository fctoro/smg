"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CoachForm, { CoachFormValues } from "@/components/club/forms/CoachForm";
import { fetchCoachById, updateCoach } from "@/lib/club/coachs";
import { Coach } from "@/types/club";

import { CardSkeleton } from "@/components/ui/skeleton/Skeleton";

export default function EditCoachPage() {
  const router = useRouter();
  const params = useParams();
  const coachId = params.id as string;
  
  const [coach, setCoach] = useState<Coach | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCoach() {
      if (coachId) {
        const data = await fetchCoachById(coachId);
        if (data) {
          setCoach(data);
        } else {
          setError("Coach introuvable.");
        }
        setIsLoading(false);
      }
    }
    loadCoach();
  }, [coachId]);

  const handleSubmit = async (values: CoachFormValues) => {
    setIsSubmitting(true);
    setError(null);
    const { error } = await updateCoach(coachId, values);
    
    if (error) {
      setError(error);
      setIsSubmitting(false);
    } else {
      router.push("/coachs");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Modifier un Coach" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90">
          Modifier les informations du coach
        </h3>
        
        {error && (
          <div className="mb-6 rounded-lg bg-error-50 p-4 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {coach ? (
          <CoachForm
            initialValues={{
              nom: coach.nom,
              prenom: coach.prenom,
              email: coach.email,
              telephone: coach.telephone,
              sexe: coach.sexe,
              categories: coach.categories,
              saison: coach.saison,
            }}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/coachs")}
            isSubmitting={isSubmitting}
            submitLabel="Mettre à jour"
          />
        ) : null}
      </div>
    </div>
  );
}
