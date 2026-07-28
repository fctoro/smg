"use client";

import { FormEvent, useEffect, useState, useMemo, useRef } from "react";
import { ParentFormValues, Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";

interface ParentFormProps {
  players: Player[];
  initialValues?: Partial<ParentFormValues>;
  onSubmit: (values: ParentFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const defaultValues: ParentFormValues = {
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  lien: "Pere",
  playerId: "",
};

export default function ParentForm({
  players,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: ParentFormProps) {
  const [formValues, setFormValues] = useState<ParentFormValues>({
    ...defaultValues,
    playerId: players[0]?.id ?? "",
    ...initialValues,
  });
  const [playerSearch, setPlayerSearch] = useState("");
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormValues({
      ...defaultValues,
      playerId: players[0]?.id ?? "",
      ...initialValues,
    });
  }, [initialValues, players]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowPlayerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === formValues.playerId) ?? null,
    [players, formValues.playerId]
  );

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) return players.slice(0, 20);
    return players.filter((player) => {
      const fullName = getPlayerFullName(player).toLowerCase();
      const matricule = (player.matricule || "").toLowerCase();
      return fullName.includes(query) || matricule.includes(query);
    });
  }, [players, playerSearch]);

  const handleSelectPlayer = (player: Player) => {
    setFormValues((prev) => ({ ...prev, playerId: player.id }));
    setPlayerSearch("");
    setShowPlayerDropdown(false);
  };

  const updateField = <K extends keyof ParentFormValues>(
    key: K,
    value: ParentFormValues[K],
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValues);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Nom
          </label>
          <input
            required
            value={formValues.nom}
            onChange={(event) => updateField("nom", event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Prenom
          </label>
          <input
            required
            value={formValues.prenom}
            onChange={(event) => updateField("prenom", event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Telephone
          </label>
          <input
            value={formValues.telephone}
            onChange={(event) => updateField("telephone", event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Email
          </label>
          <input
            required
            type="email"
            value={formValues.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Lien avec le joueur
          </label>
          <select
            value={formValues.lien}
            onChange={(event) => updateField("lien", event.target.value)}
            className={selectClassName}
          >
            <option value="Pere">Pere</option>
            <option value="Mere">Mere</option>
            <option value="Tuteur">Tuteur</option>
            <option value="Tutrice">Tutrice</option>
          </select>
        </div>
        <div className="xl:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Joueur associe
          </label>
          <div ref={searchContainerRef} className="relative">
            <input
              type="text"
              value={playerSearch}
              onChange={(event) => {
                setPlayerSearch(event.target.value);
                setShowPlayerDropdown(true);
              }}
              onFocus={() => setShowPlayerDropdown(true)}
              placeholder={
                selectedPlayer
                  ? `${getPlayerFullName(selectedPlayer)}${selectedPlayer.matricule ? ` (${selectedPlayer.matricule})` : ""}`
                  : "Rechercher un joueur..."
              }
              className={inputClassName}
            />
            {showPlayerDropdown && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {filteredPlayers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    Aucun joueur trouve.
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <button
                      type="button"
                      key={player.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectPlayer(player)}
                      className={`flex w-full flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        player.id === formValues.playerId
                          ? "bg-brand-50 dark:bg-brand-500/10"
                          : ""
                      }`}
                    >
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {getPlayerFullName(player)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {player.matricule
                          ? `Code: ${player.matricule}`
                          : "Sans code"}
                        {` • ${player.categorie} • ${player.poste}`}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {selectedPlayer && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                  {getPlayerFullName(selectedPlayer)}
                </p>
                <p className="text-xs text-brand-700 dark:text-brand-300">
                  {selectedPlayer.matricule
                    ? `Code: ${selectedPlayer.matricule}`
                    : "Sans code"}
                  {` • ${selectedPlayer.categorie} • ${selectedPlayer.poste}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormValues((prev) => ({ ...prev, playerId: "" }));
                  setPlayerSearch("");
                }}
                className="rounded-full p-1 text-brand-600 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-500/20"
                title="Changer de joueur"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
