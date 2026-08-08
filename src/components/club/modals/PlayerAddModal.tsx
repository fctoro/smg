import React, { useMemo, useState } from "react";
import { getCurrentSeason, generatePlayerMatricule } from "@/lib/club/season";
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
  const [successMessage, setSuccessMessage] = useState("");
  
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
        const currentSeasonStr = getCurrentSeason();
        const matriculeCode = generatePlayerMatricule(inserted.EtudiantID, currentSeasonStr);
        
        const newPlayer: Player = { 
          ...newPlayerLocal, 
          id: String(inserted.EtudiantID),
          saison: currentSeasonStr,
          matricule: matriculeCode,
        };
        setPlayers((prevPlayers) => [newPlayer, ...prevPlayers]);
        
        setSuccessMessage(
          newPlayerLocal.statut === "alumni" 
            ? `Joueur enregistré dans alumni avec succès ! (Code: ${matriculeCode})` 
            : `Joueur enregistré avec succès ! (Code: ${matriculeCode})`
        );
        
        setTimeout(() => {
          setSuccessMessage("");
          onClose();
        }, 3000);
      } else {
        alert("Erreur lors de la création. Aucune ID retournée.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la création. Veuillez réessayer.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
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
        
        {successMessage && (
          <div className="fixed bottom-5 right-5 z-[9999] rounded-lg bg-green-50 p-4 border border-green-200 dark:bg-green-900/80 dark:border-green-800 shadow-xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto pr-2 px-1 -mx-1 mt-5 custom-scrollbar">
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
