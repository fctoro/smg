import React, { useMemo, useState } from "react";
import { getCurrentSeason, generatePlayerMatricule } from "@/lib/club/season";
import { Modal } from "@/components/ui/modal";
import PlayerForm from "@/components/club/forms/PlayerForm";
import { PlayerFormValues, Player } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { createPlayerFromForm } from "@/lib/club/player-form";
import { addPlayerToSupabase } from "@/lib/club/supabase-crud";
import { syncPlayerProgrammes } from "@/lib/club/programmes";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";

interface PlayerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerAddModal({ isOpen, onClose }: PlayerAddModalProps) {
  const { players, setPlayers } = useClubData();
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  
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
        const chosenSeasonStr = values.saison || getCurrentSeason();
        const isDetection = values.sourceDetection || false;
        const matriculeCode = generatePlayerMatricule(inserted.EtudiantID, chosenSeasonStr, isDetection);
        
        const newPlayer: Player = { 
          ...newPlayerLocal, 
          id: String(inserted.EtudiantID),
          saison: chosenSeasonStr,
          matricule: matriculeCode,
          sourceDetection: isDetection,
          ...(inserted.photoUrl ? { photoUrl: inserted.photoUrl } : {}),
          ...(inserted.photoIdentiteUrl ? { photoIdentiteUrl: inserted.photoIdentiteUrl } : {}),
          ...(inserted.acteNaissanceUrl ? { acteNaissanceUrl: inserted.acteNaissanceUrl } : {}),
          ...(inserted.carteIdentiteParentUrl ? { carteIdentiteParentUrl: inserted.carteIdentiteParentUrl } : {}),
          ...(inserted.fiche9eUrl ? { fiche9eUrl: inserted.fiche9eUrl } : {}),
          ...(inserted.carnetVaccinationUrl ? { carnetVaccinationUrl: inserted.carnetVaccinationUrl } : {}),
        };
        // Clean any leftover base64 strings from local state
        if (newPlayer.photoIdentiteUrl?.startsWith("data:")) delete (newPlayer as any).photoIdentiteUrl;
        if (newPlayer.acteNaissanceUrl?.startsWith("data:")) delete (newPlayer as any).acteNaissanceUrl;
        if (newPlayer.carteIdentiteParentUrl?.startsWith("data:")) delete (newPlayer as any).carteIdentiteParentUrl;
        if (newPlayer.fiche9eUrl?.startsWith("data:")) delete (newPlayer as any).fiche9eUrl;
        if (newPlayer.carnetVaccinationUrl?.startsWith("data:")) delete (newPlayer as any).carnetVaccinationUrl;

        setPlayers((prevPlayers) => [newPlayer, ...prevPlayers]);
        
        if (values.programmesAssignesIds && values.programmesAssignesIds.length > 0) {
          await syncPlayerProgrammes(String(inserted.EtudiantID), values.programmesAssignesIds);
        }
        
        setToast({
          message: newPlayerLocal.statut === "alumni" 
            ? `Joueur enregistré dans alumni avec succès ! (Code: ${matriculeCode})` 
            : `Joueur enregistré avec succès ! (Code: ${matriculeCode})`,
          type: "success"
        });
        
        setTimeout(() => {
          setToast(null);
          onClose();
        }, 3000);
      } else {
        setToast({ message: "Erreur lors de la création. Aucune ID retournée.", type: "error" });
      }
    } catch (error) {
      console.error(error);
      setToast({ message: "Erreur lors de la création. Veuillez réessayer.", type: "error" });
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
        
        {toast && (
          <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
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
