import React from "react";
import { Modal } from "@/components/ui/modal";
import AlumniForm from "@/components/club/forms/AlumniForm";
import { AlumniFormValues, Alumni, PlayerStatus } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { createPlayerFromForm } from "@/lib/club/player-form";
import { addPlayerToSupabase } from "@/lib/club/supabase-crud";

interface AlumniAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AlumniAddModal({ isOpen, onClose }: AlumniAddModalProps) {
  const { setPlayers } = useClubData();

  const handleSubmit = async (values: AlumniFormValues) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Force statut to 'alumni'
      const finalValues = { ...values, statut: "alumni" as PlayerStatus };
      const newPlayerLocal = createPlayerFromForm(`temp-${Date.now()}`, finalValues, today);
      
      const inserted = await addPlayerToSupabase(newPlayerLocal);
      if (inserted && inserted.EtudiantID) {
        const newPlayer: Alumni = { ...newPlayerLocal, id: String(inserted.EtudiantID) };
        setPlayers((prevEntries) => [newPlayer, ...prevEntries]);
        onClose();
      } else {
        alert("Erreur lors de la création.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajout. Veuillez réessayer.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Ajouter un alumni
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Remplissez les informations du nouvel alumni
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <AlumniForm
            onCancel={onClose}
            onSubmit={handleSubmit}
            submitLabel="Enregistrer"
          />
        </div>
      </div>
    </Modal>
  );
}
