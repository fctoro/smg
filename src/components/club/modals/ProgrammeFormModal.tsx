import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Player, ProgrammeMatch } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { getDynamicSeasonOptions } from "@/lib/club/season";
import { createProgramme, updateProgramme } from "@/lib/club/programmes";

interface ProgrammeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  players: Player[];
  initialData?: ProgrammeMatch | null;
  onSuccess: (programme: ProgrammeMatch) => void;
}

export function ProgrammeFormModal({
  isOpen,
  onClose,
  categories,
  players,
  initialData,
  onSuccess,
}: ProgrammeFormModalProps) {
  const [nom, setNom] = useState("");
  const [dateProgramme, setDateProgramme] = useState("");
  const [dateDepart, setDateDepart] = useState("");
  const [dateCloture, setDateCloture] = useState("");
  const seasonOptions = getDynamicSeasonOptions();
  const [saison, setSaison] = useState(seasonOptions[0]);
  const [categorie, setCategorie] = useState(categories[0] || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setNom(initialData.nom);
        setDateProgramme(initialData.date_programme);
        setDateDepart(initialData.date_depart || "");
        setDateCloture(initialData.date_cloture || "");
        setSaison(initialData.saison);
        setCategorie(initialData.categorie);
        setSelectedPlayers(new Set(initialData.joueurs));
      } else {
        setNom("");
        setDateProgramme(new Date().toISOString().split('T')[0]); // Default to today
        setDateDepart("");
        setDateCloture("");
        setSaison(seasonOptions[0]);
        setCategorie(categories[0] || "");
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
    if (!nom || !dateProgramme || !saison || !categorie) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const payload = {
      nom,
      date_programme: dateProgramme,
      date_depart: dateDepart || undefined,
      date_cloture: dateCloture || undefined,
      saison,
      categorie,
      joueurs: Array.from(selectedPlayers),
    };

    let result;
    if (initialData) {
      result = await updateProgramme(initialData.id, payload);
    } else {
      result = await createProgramme(payload);
    }

    setIsSubmitting(false);

    if (!result) {
      setError("Une erreur est survenue lors de l'enregistrement.");
    } else {
      onSuccess(result);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl p-0" showCloseButton={false}>
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {initialData ? "Modifier le programme" : "Créer un programme"}
        </h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
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
            Nom du programme *
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex: Programme Vacances"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Saison *
            </label>
            <select
              value={saison}
              onChange={(e) => setSaison(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            >
              {seasonOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de départ
            </label>
            <input
              type="date"
              value={dateDepart}
              onChange={(e) => setDateDepart(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de clôture
            </label>
            <input
              type="date"
              value={dateCloture}
              onChange={(e) => setDateCloture(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            />
          </div>
        </div>

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
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 disabled:opacity-50"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Joueurs dans {categorie} ({playersInCat.length}) 
                {selectedPlayers.size > 0 && (
                  <span className="ml-2 text-brand-600 dark:text-brand-400 font-semibold">
                    • {selectedPlayers.size} sélectionné{selectedPlayers.size > 1 ? 's' : ''}
                  </span>
                )}
              </label>
              {filteredPlayers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlayers.size === filteredPlayers.length && filteredPlayers.every(p => selectedPlayers.has(p.id))) {
                      // If all currently filtered players are selected, deselect them all
                      setSelectedPlayers(new Set());
                    } else {
                      // Otherwise, select all currently filtered players
                      setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)));
                    }
                  }}
                  className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium px-2 py-1 rounded bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 transition-colors"
                >
                  {selectedPlayers.size === filteredPlayers.length && filteredPlayers.every(p => selectedPlayers.has(p.id)) 
                    ? "Tout désélectionner" 
                    : "Tout sélectionner"}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un joueur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full sm:w-64 rounded-lg border border-gray-300 bg-transparent py-2 pl-9 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            {isSubmitting ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
