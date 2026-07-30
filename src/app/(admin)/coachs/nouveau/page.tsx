"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CoachForm, { CoachFormValues } from "@/components/club/forms/CoachForm";
import { createCoach } from "@/lib/club/coachs";

export default function NewCoachPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: CoachFormValues) => {
    setIsSubmitting(true);
    setError(null);
    const { error } = await createCoach(values);
    
    if (error) {
      setError(error);
      setIsSubmitting(false);
    } else {
      router.push("/coachs");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Nouveau Coach" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90">
          Ajouter un Coach
        </h3>
        
        {error && (
          <div className="mb-6 rounded-lg bg-error-50 p-4 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <CoachForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/coachs")}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
