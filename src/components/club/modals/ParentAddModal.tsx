import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import ParentForm from "@/components/club/forms/ParentForm";
import { Parent, ParentFormValues } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { groupParentsByFamily } from "@/lib/club/parents";
import { updateParentInSupabase } from "@/lib/club/supabase-crud";

interface ParentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ParentAddModal({ isOpen, onClose }: ParentAddModalProps) {
  const { setParents, players } = useClubData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ParentFormValues) => {
    setIsSubmitting(true);
    try {
      await updateParentInSupabase(values.playerId, values);
      const newParent: Parent = {
        id: `pa-${values.playerId}`,
        ...values,
        playerIds: [values.playerId],
      };
      setParents((prevParents) => groupParentsByFamily([newParent, ...prevParents]));
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajout. Veuillez réessayer.");
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
              Ajouter un parent
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Remplissez les informations du nouveau parent
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <ParentForm
            players={players}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel="Enregistrer"
          />
        </div>
      </div>
    </Modal>
  );
}
