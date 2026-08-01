import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { updatePlayerInSupabase } from "@/lib/club/supabase-crud";

interface CoachPlayerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onSuccess: (updatedPlayer: Player) => void;
}

const STATUS_OPTIONS = ["Actif", "Blessé", "Suspendu", "Inactif", "En test"];

export function CoachPlayerStatusModal({
  isOpen,
  onClose,
  player,
  onSuccess,
}: CoachPlayerStatusModalProps) {
  const [status, setStatus] = useState(player?.statut || "Actif");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update local state when player changes
  React.useEffect(() => {
    if (player) {
      setStatus(player.statut || "Actif");
    }
  }, [player]);

  if (!player) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Update only the status field
      await updatePlayerInSupabase(player.id, { statut: status as any });
      onSuccess({ ...player, statut: status as any });
      onClose();
    } catch (error) {
      console.error("Error updating player status:", error);
      alert("Erreur lors de la mise à jour du statut. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Modifier le statut du joueur
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Mise à jour rapide pour {getPlayerFullName(player)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Nouveau Statut
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
