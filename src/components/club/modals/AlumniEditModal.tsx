import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import AlumniForm from "@/components/club/forms/AlumniForm";
import { AlumniFormValues, Alumni, PlayerStatus } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { updatePlayerInSupabase } from "@/lib/club/supabase-crud";

interface AlumniEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumniEntry: Alumni | null;
}

export function AlumniEditModal({ isOpen, onClose, alumniEntry }: AlumniEditModalProps) {
  const { setPlayers } = useClubData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!alumniEntry) return null;

  const handleSubmit = async (values: AlumniFormValues) => {
    setIsSubmitting(true);
    try {
      await updatePlayerInSupabase(alumniEntry.id, values);
      setPlayers((prevEntries) =>
        prevEntries.map((entry) =>
          entry.id === alumniEntry.id ? { ...entry, ...values } : entry,
        ),
      );
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la modification. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Modifier l'alumni
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Mettez à jour les informations de {alumniEntry.nom}
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <AlumniForm
            initialValues={alumniEntry}
            onCancel={onClose}
            onSubmit={handleSubmit}
            submitLabel="Mettre à jour"
          />
        </div>
      </div>
    </Modal>
  );
}
