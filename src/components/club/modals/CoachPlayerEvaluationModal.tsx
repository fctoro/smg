"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentSeason } from "@/lib/club/season";
import { useUserRole } from "@/context/UserRoleContext";

interface CoachPlayerEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export const CoachPlayerEvaluationModal: React.FC<CoachPlayerEvaluationModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const { userEmail } = useUserRole();
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!player) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("player_evaluations").insert([
        {
          player_id: player.id,
          comments,
          saison: getCurrentSeason(),
          evaluation_date: new Date().toISOString().split("T")[0],
          coach_id: userEmail || "coach",
        },
      ]);

      if (error) throw error;
      setComments("");
      onClose();
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de l'évaluation", err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl mx-auto w-full">
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Évaluer {getPlayerFullName(player)}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Commentaires et observations (Saison {getCurrentSeason()})
            </label>
            <textarea
              required
              rows={5}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ex: Bonne progression technique, doit travailler son placement..."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comments.trim()}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
