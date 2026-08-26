import React, { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import PlayerForm from "@/components/club/forms/PlayerForm";
import { Player, PlayerFormValues } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { normalizePlayerFormValues, toPlayerFormValues } from "@/lib/club/player-form";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { updatePlayerInSupabase } from "@/lib/club/supabase-crud";
import { supabase } from "@/lib/supabaseClient";
import { updateMessageStatus } from "@/lib/club/supabase-demandes";
import { syncPlayerProgrammes } from "@/lib/club/programmes";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";

interface PlayerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  highlightFields?: string[];
  demandeId?: string | null;
  siteMessageId?: string | null;
  commentIdentifie?: string | null;
  piedDominant?: string | null;
  clubActuel?: string | null;
}

export const PlayerEditModal: React.FC<PlayerEditModalProps> = ({
  isOpen,
  onClose,
  player,
  highlightFields = [],
  demandeId,
  siteMessageId,
  commentIdentifie,
  piedDominant,
  clubActuel,
}) => {
  const { players, setPlayers } = useClubData();
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
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
      const updatedDocs = await updatePlayerInSupabase(player.id, normalized);
      
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) => {
          if (p.id !== player.id) return p;
          const updated = {
            ...p,
            ...normalized,
            ...(updatedDocs?.photoUrl ? { photoUrl: updatedDocs.photoUrl } : {}),
            ...(updatedDocs?.photoIdentiteUrl ? { photoIdentiteUrl: updatedDocs.photoIdentiteUrl } : {}),
            ...(updatedDocs?.acteNaissanceUrl ? { acteNaissanceUrl: updatedDocs.acteNaissanceUrl } : {}),
            ...(updatedDocs?.carteIdentiteParentUrl ? { carteIdentiteParentUrl: updatedDocs.carteIdentiteParentUrl } : {}),
            ...(updatedDocs?.fiche9eUrl ? { fiche9eUrl: updatedDocs.fiche9eUrl } : {}),
            ...(updatedDocs?.carnetVaccinationUrl ? { carnetVaccinationUrl: updatedDocs.carnetVaccinationUrl } : {}),
            dernierPaiement:
              normalized.cotisationStatut === "paid"
                ? today
                : p.dernierPaiement,
          };
          if (updated.photoIdentiteUrl?.startsWith("data:")) delete (updated as any).photoIdentiteUrl;
          if (updated.acteNaissanceUrl?.startsWith("data:")) delete (updated as any).acteNaissanceUrl;
          if (updated.carteIdentiteParentUrl?.startsWith("data:")) delete (updated as any).carteIdentiteParentUrl;
          if (updated.fiche9eUrl?.startsWith("data:")) delete (updated as any).fiche9eUrl;
          if (updated.carnetVaccinationUrl?.startsWith("data:")) delete (updated as any).carnetVaccinationUrl;
          return updated;
        }),
      );
      
      if (values.programmesAssignesIds) {
        await syncPlayerProgrammes(player.id, values.programmesAssignesIds);
      }

      // Clear the draft once submitted successfully
      sessionStorage.removeItem(`draft_${player.id}`);
      
      try {
        if (siteMessageId) {
          await updateMessageStatus(siteMessageId, "inscrit");
        } else if (demandeId) {
          await updateMessageStatus(demandeId, "inscrit");
        }
      } catch (e) {}
      
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
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
          <ToastNotification message={successMessage} onClose={() => setSuccessMessage("")} />
        )}
        
        <div className="max-h-[70vh] overflow-y-auto pr-2 px-1 -mx-1 custom-scrollbar">
          <PlayerForm
            initialValues={{
              ...toPlayerFormValues(player),
              ...(commentIdentifie ? { commentIdentifie } : {}),
              ...(piedDominant ? { piedDominant } : {}),
              ...(clubActuel ? { clubActuel } : {})
            }}
            onSubmit={handleSubmit}
            onCancel={onClose}
            categories={categories}
            highlightFields={highlightFields}
            draftKey={`v4_${player.id}`}
            playerId={player.id}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </Modal>
  );
};
