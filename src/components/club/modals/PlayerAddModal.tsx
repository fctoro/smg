import React, { useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import PlayerForm from "@/components/club/forms/PlayerForm";
import { PlayerFormValues, Player } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { createPlayerFromForm } from "@/lib/club/player-form";
import { addPlayerToSupabase } from "@/lib/club/supabase-crud";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";

interface PlayerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerAddModal({ isOpen, onClose }: PlayerAddModalProps) {
  const { players, setPlayers } = useClubData();
  
  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...players.map((player) => player.categorie)])],
    [players]
  );

  const handleSubmit = async (values: PlayerFormValues) => {
    // Note: The temporary alert that was present in the old page is preserved if requested,
    // but here we allow the actual creation logic to run if it wasn't disabled.
    try {
      const today = new Date().toISOString().slice(0, 10);
      const newPlayerLocal = createPlayerFromForm(`temp-${Date.now()}`, values, today);
      
      const inserted = await addPlayerToSupabase(newPlayerLocal);
      if (inserted && inserted.EtudiantID) {
        const newPlayer: Player = { ...newPlayerLocal, id: String(inserted.EtudiantID) };
        setPlayers((prevPlayers) => [newPlayer, ...prevPlayers]);
        onClose(); // Close modal after successful creation
      } else {
        alert("Erreur lors de la création. Aucune ID retournée.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la création. Veuillez réessayer.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Ajouter un joueur
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Remplissez les informations du nouveau joueur
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <PlayerForm
            initialValues={{}} // Empty initial values for a new player
            onSubmit={handleSubmit}
            onCancel={onClose}
            categories={categories}
            submitLabel="Enregistrer"
          />
        </div>
      </div>
    </Modal>
  );
}
