import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import ParentForm from "@/components/club/forms/ParentForm";
import { Parent, ParentFormValues } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { groupParentsByFamily, getParentLinkedPlayerIds } from "@/lib/club/parents";
import { updateParentInSupabase } from "@/lib/club/supabase-crud";

interface ParentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  parent: Parent | null;
}

export const ParentEditModal: React.FC<ParentEditModalProps> = ({
  isOpen,
  onClose,
  parent,
}) => {
  const { setParents, players } = useClubData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!parent) return null;

  const initialValues: Partial<ParentFormValues> = {
    nom: parent.nom,
    prenom: parent.prenom,
    email: parent.email || "",
    telephone: parent.telephone || "",
    lien: parent.lien || "",
    playerId: getParentLinkedPlayerIds(parent)[0] || "",
  };

  const handleSubmit = async (values: ParentFormValues) => {
    setIsSubmitting(true);
    try {
      const linkedPlayerIds = getParentLinkedPlayerIds(parent);
      await updateParentInSupabase(linkedPlayerIds, values);
      setParents((prevParents) =>
        groupParentsByFamily(
          prevParents.map((p) =>
            p.id === parent.id
              ? { ...p, ...values, playerIds: linkedPlayerIds }
              : p,
          ),
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
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Modifier le parent
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mettez à jour les informations de {parent.prenom} {parent.nom}.
          </p>
        </div>
        
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <ParentForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onCancel={onClose}
            players={players}
          />
        </div>
      </div>
    </Modal>
  );
};
