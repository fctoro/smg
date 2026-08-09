import React, { useState, useEffect, useMemo } from "react";
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

export function getPlayerAge(player: Player): number | null {
  if (player.dateNaissance) {
    const birth = new Date(player.dateNaissance);
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age >= 0 && age <= 100) return age;
    }
  }
  const cat = (player.categorie || "").toUpperCase();
  if (cat.includes("U8")) return 8;
  if (cat.includes("U10")) return 10;
  if (cat.includes("U12")) return 12;
  if (cat.includes("U14")) return 14;
  if (cat.includes("U16")) return 16;
  if (cat.includes("U18")) return 18;
  if (cat.includes("TORO")) return 6;
  if (cat.includes("SENIOR")) return 20;
  return null;
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

  // Category State
  const [selectedCategoryOption, setSelectedCategoryOption] = useState(categories[0] || "");
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  // Filters for player selection in modal
  const [playerCategoryFilter, setPlayerCategoryFilter] = useState("all");
  const [playerAgeFilter, setPlayerAgeFilter] = useState("all");
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
        
        if (categories.includes(initialData.categorie)) {
          setSelectedCategoryOption(initialData.categorie);
          setCustomCategoryInput("");
        } else {
          setSelectedCategoryOption("__CUSTOM__");
          setCustomCategoryInput(initialData.categorie);
        }
        
        setSelectedPlayers(new Set(initialData.joueurs));
      } else {
        setNom("");
        setDateProgramme(new Date().toISOString().split('T')[0]);
        setDateDepart("");
        setDateCloture("");
        setSaison(seasonOptions[0]);
        setSelectedCategoryOption(categories[0] || "");
        setCustomCategoryInput("");
        setSelectedPlayers(new Set());
      }
      setPlayerCategoryFilter("all");
      setPlayerAgeFilter("all");
      setSearchQuery("");
      setError("");
    }
  }, [isOpen, initialData, categories]);

  const effectiveCategory = selectedCategoryOption === "__CUSTOM__"
    ? customCategoryInput.trim()
    : selectedCategoryOption;

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      // Search query
      const query = searchQuery.trim().toLowerCase();
      const nameMatch = !query || getPlayerFullName(p).toLowerCase().includes(query);
      if (!nameMatch) return false;

      // Category filter
      const catMatch = playerCategoryFilter === "all" || (p.categorie || "").trim() === playerCategoryFilter.trim();
      if (!catMatch) return false;

      // Age filter
      if (playerAgeFilter !== "all") {
        const age = getPlayerAge(p);
        if (age === null) return false;
        if (playerAgeFilter === "5-6" && (age < 5 || age > 6)) return false;
        if (playerAgeFilter === "7-8" && (age < 7 || age > 8)) return false;
        if (playerAgeFilter === "9-10" && (age < 9 || age > 10)) return false;
        if (playerAgeFilter === "11-12" && (age < 11 || age > 12)) return false;
        if (playerAgeFilter === "13-14" && (age < 13 || age > 14)) return false;
        if (playerAgeFilter === "15-16" && (age < 15 || age > 16)) return false;
        if (playerAgeFilter === "17-18" && (age < 17 || age > 18)) return false;
        if (playerAgeFilter === "19+" && age < 19) return false;
      }

      return true;
    });
  }, [players, searchQuery, playerCategoryFilter, playerAgeFilter]);

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
    if (!nom || !dateProgramme || !saison || !effectiveCategory) {
      setError("Veuillez remplir tous les champs obligatoires (nom, date, saison et catégorie).");
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
      categorie: effectiveCategory,
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catégorie du programme *
            </label>
            <select
              value={selectedCategoryOption}
              onChange={(e) => setSelectedCategoryOption(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__CUSTOM__">+ Créer / Saisir une nouvelle catégorie</option>
            </select>
          </div>
        </div>

        {selectedCategoryOption === "__CUSTOM__" && (
          <div>
            <label className="block text-xs font-semibold text-brand-600 dark:text-brand-400 mb-1">
              Nom de la nouvelle catégorie personnalisée pour ce programme *
            </label>
            <input
              type="text"
              value={customCategoryInput}
              onChange={(e) => setCustomCategoryInput(e.target.value)}
              placeholder="ex: U9 Élite, Vacances U8-U10, Groupe Spécial..."
              className="h-11 w-full rounded-lg border border-brand-300 bg-brand-50/50 px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-white"
            />
          </div>
        )}

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

        {/* Section de sélection des joueurs */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-sm font-semibold text-gray-800 dark:text-white">
                Sélection des joueurs à inscrire dans « {effectiveCategory || "cette catégorie"} »
                {selectedPlayers.size > 0 && (
                  <span className="ml-2 text-brand-600 dark:text-brand-400 font-bold">
                    ({selectedPlayers.size} joueur{selectedPlayers.size > 1 ? 's' : ''} sélectionné{selectedPlayers.size > 1 ? 's' : ''})
                  </span>
                )}
              </label>
              {filteredPlayers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allFilteredSelected = filteredPlayers.every((p) => selectedPlayers.has(p.id));
                    if (allFilteredSelected) {
                      const next = new Set(selectedPlayers);
                      filteredPlayers.forEach((p) => next.delete(p.id));
                      setSelectedPlayers(next);
                    } else {
                      const next = new Set(selectedPlayers);
                      filteredPlayers.forEach((p) => next.add(p.id));
                      setSelectedPlayers(next);
                    }
                  }}
                  className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 transition-colors"
                >
                  {filteredPlayers.every((p) => selectedPlayers.has(p.id))
                    ? "Désélectionner les joueurs affichés"
                    : "Sélectionner les joueurs affichés"}
                </button>
              )}
            </div>

            {/* Sub-toolbar inside modal to filter by age, category, or search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Age filter */}
              <div>
                <select
                  value={playerAgeFilter}
                  onChange={(e) => setPlayerAgeFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-xs focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="all">Tous les âges</option>
                  <option value="5-6">5 - 6 ans</option>
                  <option value="7-8">7 - 8 ans (ex: U8)</option>
                  <option value="9-10">9 - 10 ans (ex: U10)</option>
                  <option value="11-12">11 - 12 ans (ex: U12)</option>
                  <option value="13-14">13 - 14 ans (ex: U14)</option>
                  <option value="15-16">15 - 16 ans (ex: U16)</option>
                  <option value="17-18">17 - 18 ans (ex: U18)</option>
                  <option value="19+">19 ans et + (Senior)</option>
                </select>
              </div>

              {/* Category filter */}
              <div>
                <select
                  value={playerCategoryFilter}
                  onChange={(e) => setPlayerCategoryFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-xs focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="all">Toutes catégories d'origine</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Name search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher par nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-800 shadow-xs placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {filteredPlayers.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">
                Aucun joueur ne correspond aux filtres sélectionnés.
              </p>
            ) : (
              filteredPlayers.map((p) => {
                const age = getPlayerAge(p);
                const isSelected = selectedPlayers.has(p.id);

                return (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-brand-50/60 dark:bg-brand-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePlayer(p.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getPlayerFullName(p)}
                        </span>
                        {age !== null && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {age} ans
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        Club: {p.categorie || "Non spécifié"}
                      </span>
                      {p.poste && (
                        <span className="hidden sm:inline text-gray-400">
                          • {p.poste}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })
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
