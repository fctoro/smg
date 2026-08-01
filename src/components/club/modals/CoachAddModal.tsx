"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import CoachForm, { CoachFormValues } from "@/components/club/forms/CoachForm";
import { createCoach } from "@/lib/club/coachs";

interface CoachAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CoachAddModal({ isOpen, onClose, onSuccess }: CoachAddModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: CoachFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: apiError } = await createCoach(values);
      if (apiError) {
        setError(apiError);
      } else {
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du coach.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Ajouter un Coach
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Saisissez les informations du nouveau coach
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 rounded-lg bg-error-50 p-4 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          <CoachForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
            submitLabel="Enregistrer"
          />
        </div>
      </div>
    </Modal>
  );
}
