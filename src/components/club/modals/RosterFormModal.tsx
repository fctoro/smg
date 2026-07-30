import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Player, Effectif } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { getSavedPlans, SavedTacticalPlan } from "@/lib/club/tactics";
import { createEffectif, updateEffectif } from "@/lib/club/effectifs";

interface RosterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  players: Player[];
  coachEmail: string;
  initialData?: Effectif | null;
  onSuccess: (effectif: Effectif) => void;
}

export function RosterFormModal({
  isOpen,
  onClose,
  categories,
  players,
  coachEmail,
  initialData,
  onSuccess,
}: RosterFormModalProps) {
  const [nom, setNom] = useState("");
  const [dateMatch, setDateMatch] = useState("");
  const [periode, setPeriode] = useState("");
  const [categorie, setCategorie] = useState(categories[0] || "");
  const [tactiqueId, setTactiqueId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [savedPlans, setSavedPlans] = useState<SavedTacticalPlan[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSavedPlans(getSavedPlans());
      if (initialData) {
        setNom(initialData.nom);
        setDateMatch(initialData.date_match);
        setPeriode(initialData.periode);
        setCategorie(initialData.categorie);
        setTactiqueId(initialData.tactique_id || "");
        setSelectedPlayers(new Set(initialData.joueurs));
      } else {
        setNom("");
        setDateMatch("");
        setPeriode("");
        setCategorie(categories[0] || "");
        setTactiqueId("");
        setSelectedPlayers(new Set());
      }
      setError("");
    }
  }, [isOpen, initialData, categories]);

  const playersInCat = players.filter((p) => p.categorie === categorie);
  
  const filteredPlayers = playersInCat.filter((p) => 
    getPlayerFullName(p).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePlayer = (id: string) => {
    const next = new Set(selectedPlayers);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlayers(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !dateMatch || !periode || !categorie) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (selectedPlayers.size < 11) {
      setError(`Veuillez sélectionner au moins 11 joueurs (actuellement ${selectedPlayers.size}).`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    const payload = {
      nom,
      date_match: dateMatch,
      periode,
      categorie,
      joueurs: Array.from(selectedPlayers),
      tactique_id: tactiqueId || undefined,
      coach_email: coachEmail,
    };

    let result;
    if (initialData) {
      result = await updateEffectif(initialData.id, payload);
    } else {
      result = await createEffectif(payload);
    }

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      onSuccess(result.data);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-0">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {initialData ? "Modifier l'effectif" : "Créer un effectif"}
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nom du match / Événement *
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex: FC Toro vs Shana"
            className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date du match *
            </label>
            <input
              type="date"
              value={dateMatch}
              onChange={(e) => setDateMatch(e.target.value)}
              className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Période / Saison *
            </label>
            <input
              type="text"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              placeholder="ex: Saison 2024-2025"
              className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catégorie *
            </label>
            <select
              value={categorie}
              onChange={(e) => {
                setCategorie(e.target.value);
                setSelectedPlayers(new Set()); // reset players on category change
              }}
              disabled={!!initialData} // prevent changing category if editing
              className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm disabled:opacity-50"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tactique sauvegardée (Optionnel)
            </label>
            <select
              value={tactiqueId}
              onChange={(e) => setTactiqueId(e.target.value)}
              className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
            >
              <option value="">-- Aucune --</option>
              {savedPlans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Joueurs disponibles dans {categorie} ({playersInCat.length})
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un joueur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-1.5 pl-8 pr-3 text-sm"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
            {filteredPlayers.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">
                {searchQuery ? "Aucun joueur trouvé pour cette recherche." : "Aucun joueur dans cette catégorie."}
              </p>
            ) : (
              filteredPlayers.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.has(p.id)}
                    onChange={() => togglePlayer(p.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getPlayerFullName(p)}
                    </span>
                    <span className="text-xs text-gray-500">{p.poste || "Poste non défini"}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          >
            {isSubmitting ? "Sauvegarde..." : "Sauvegarder l'effectif"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
