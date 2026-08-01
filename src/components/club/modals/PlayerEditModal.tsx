import React, { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import PlayerForm from "@/components/club/forms/PlayerForm";
import { Player, PlayerFormValues } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { normalizePlayerFormValues, toPlayerFormValues } from "@/lib/club/player-form";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { updatePlayerInSupabase } from "@/lib/club/supabase-crud";
import { supabase } from "@/lib/supabaseClient";

interface PlayerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  highlightFields?: string[];
  demandeId?: string | null;
}

export const PlayerEditModal: React.FC<PlayerEditModalProps> = ({
  isOpen,
  onClose,
  player,
  highlightFields = [],
  demandeId,
}) => {
  const { players, setPlayers } = useClubData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...players.map((p) => p.categorie)])],
    [players],
  );

  const [successMessage, setSuccessMessage] = useState("");

  if (!player) return null;

  const handleSubmit = async (values: PlayerFormValues) => {
    setIsSubmitting(true);
    const normalized = normalizePlayerFormValues(values);
    const today = new Date().toISOString().slice(0, 10);
    
    try {
      await updatePlayerInSupabase(player.id, normalized);
      
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) =>
          p.id === player.id
            ? {
                ...p,
                ...normalized,
                dernierPaiement:
                  normalized.cotisationStatut === "paid"
                    ? today
                    : p.dernierPaiement,
              }
            : p,
        ),
      );
      
      // Clear the draft once submitted successfully
      sessionStorage.removeItem(`draft_${player.id}`);
      
      if (demandeId) {
        await supabase.from("site_messages").update({ status: "enrolled", is_read: true }).eq("id", demandeId);
      }
      
      setSuccessMessage(
        normalized.statut === "alumni" 
          ? "Joueur enregistré dans alumni avec succès !" 
          : "Joueur enregistré avec succès !"
      );
      
      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la mise a jour. Veuillez reessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Modifier le joueur
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mettez à jour les informations de {player.prenom} {player.nom}.
          </p>
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
        
        <div className="max-h-[70vh] overflow-y-auto pr-2 px-1 -mx-1 custom-scrollbar">
          <PlayerForm
            initialValues={toPlayerFormValues(player)}
            onSubmit={handleSubmit}
            onCancel={onClose}
            categories={categories}
            highlightFields={highlightFields}
            draftKey={player.id}
          />
        </div>
      </div>
    </Modal>
  );
};
