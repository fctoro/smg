import React, { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import PlayerForm from "@/components/club/forms/PlayerForm";
import { Player, PlayerFormValues } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { normalizePlayerFormValues, toPlayerFormValues } from "@/lib/club/player-form";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { updatePlayerInSupabase } from "@/lib/club/supabase-crud";

interface PlayerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export const PlayerEditModal: React.FC<PlayerEditModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const { players, setPlayers } = useClubData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...players.map((p) => p.categorie)])],
    [players],
  );

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
      
      onClose();
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
        
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <PlayerForm
            initialValues={toPlayerFormValues(player)}
            onSubmit={handleSubmit}
            onCancel={onClose}
            categories={categories}
          />
        </div>
      </div>
    </Modal>
  );
};
