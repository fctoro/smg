"use client";

import React, { useState, useEffect } from "react";
import { useClubData } from "@/context/ClubDataContext";
import { ProgrammeMatch } from "@/types/club";
import { fetchProgrammes, deleteProgramme } from "@/lib/club/programmes";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { ProgrammeFormModal, getPlayerAge } from "../modals/ProgrammeFormModal";
import { useConfirm } from "@/hooks/useConfirm";
import { TableSkeleton } from "@/components/ui/skeleton/Skeleton";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { getPlayerFullName } from "@/lib/club/metrics";
import { getDynamicSeasonOptions } from "@/lib/club/season";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

export default function ProgrammesPageContent() {
  const { players, hydrated } = useClubData();
  const [programmes, setProgrammes] = useState<ProgrammeMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeMatch | null>(null);
  
  const [selectedProgrammeName, setSelectedProgrammeName] = useState("all");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAgeFilter, setSelectedAgeFilter] = useState("all");
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { confirm, ConfirmComponent } = useConfirm();

  useEffect(() => {
    if (hydrated) {
      loadProgrammes();
    }
  }, [hydrated]);

  const loadProgrammes = async () => {
    setLoading(true);
    const data = await fetchProgrammes();
    setProgrammes(data);
    setLoading(false);
  };

  const handleSuccess = (prog: ProgrammeMatch) => {
    loadProgrammes();
  };

  const handleDelete = (id: string) => {
    confirm({
      title: "Supprimer le programme",
      message: "Êtes-vous sûr de vouloir supprimer ce programme ? Cette action est irréversible.",
      onConfirm: async () => {
        await deleteProgramme(id);
        loadProgrammes();
      }
    });
  };

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-white rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900">
          <TableSkeleton rows={6} columns={4} />
        </div>
      </div>
    );
  }

  // Get categories logic (including custom categories from programmes)
  const customCats = players.map(p => p.categorie).filter(Boolean);
  const programmeCats = programmes.map(p => p.categorie).filter(Boolean);
  const combined = [...DEFAULT_CATEGORIES, ...customCats, ...programmeCats];
  const categories = Array.from(new Set(combined.map(c => c.trim()))).sort();

  const seasons = getDynamicSeasonOptions();

  const programmeNames = Array.from(new Set(programmes.map(p => p.nom))).sort();

  const filteredProgrammes = programmes.filter((prog) => {
    const matchesName = selectedProgrammeName === "all" || prog.nom === selectedProgrammeName;
    const matchesSeason = selectedSeason === "all" || prog.saison === selectedSeason;
    const matchesCategory = selectedCategory === "all" || prog.categorie === selectedCategory;
    const matchesPlayer = !playerSearchQuery || (prog.joueurs || []).some(playerId => {
      const p = players.find(p => p.id === playerId);
      return p && getPlayerFullName(p).toLowerCase().includes(playerSearchQuery.toLowerCase());
    });

    const matchesAge = selectedAgeFilter === "all" || (prog.joueurs || []).some(playerId => {
      const p = players.find(p => p.id === playerId);
      if (!p) return false;
      const age = getPlayerAge(p);
      if (age === null) return false;
      if (selectedAgeFilter === "5-6") return age >= 5 && age <= 6;
      if (selectedAgeFilter === "7-8") return age >= 7 && age <= 8;
      if (selectedAgeFilter === "9-10") return age >= 9 && age <= 10;
      if (selectedAgeFilter === "11-12") return age >= 11 && age <= 12;
      if (selectedAgeFilter === "13-14") return age >= 13 && age <= 14;
      if (selectedAgeFilter === "15-16") return age >= 15 && age <= 16;
      if (selectedAgeFilter === "17-18") return age >= 17 && age <= 18;
      if (selectedAgeFilter === "19+") return age >= 19;
      return true;
    });

    return matchesName && matchesSeason && matchesCategory && matchesPlayer && matchesAge;
  }).sort((a, b) => {
    // Trier par saison décroissante
    const saisonA = a.saison || "";
    const saisonB = b.saison || "";
    if (saisonA !== saisonB) {
      return saisonB.localeCompare(saisonA);
    }
    // Puis par date décroissante
    const dateA = a.date_programme ? new Date(a.date_programme).getTime() : 0;
    const dateB = b.date_programme ? new Date(b.date_programme).getTime() : 0;
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    // Puis par nom
    return (a.nom || "").localeCompare(b.nom || "");
  });

  const handleExportExcel = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous exporter la liste des programmes au format Excel ?",
      onConfirm: () => {
        const headers = ["Nom", "Saison", "Catégorie", "Date Départ", "Date Clôture", "Nombre Joueurs"];
        let csvContent = "\uFEFF" + headers.join(";") + "\n";
        
        filteredProgrammes.forEach(p => {
          const row = [p.nom, p.saison, p.categorie, p.date_depart || "", p.date_cloture || "", p.joueurs?.length || 0];
          const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
          csvContent += csvRow.join(";") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "programmes_excel.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous exporter la liste des programmes au format CSV ?",
      onConfirm: () => {
        const headers = ["Nom", "Saison", "Catégorie", "Date Départ", "Date Clôture", "Nombre Joueurs"];
        let csvContent = "\uFEFF" + headers.join(",") + "\n";
        
        filteredProgrammes.forEach(p => {
          const row = [p.nom, p.saison, p.categorie, p.date_depart || "", p.date_cloture || "", p.joueurs?.length || 0];
          const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
          csvContent += csvRow.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "programmes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Programmes</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gérez les programmes et assignez les joueurs.
          </p>
        </div>
             
        <button
          onClick={() => {
            setSelectedProgramme(null);
            setIsModalOpen(true);
          }}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors"
        >
          + Créer un Programme
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 min-w-0">
          <div className="min-w-0">
            <input
              value={playerSearchQuery}
              onChange={(event) => setPlayerSearchQuery(event.target.value)}
              placeholder="Rechercher un joueur..."
              className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div className="min-w-0">
            <select
              value={selectedProgrammeName}
              onChange={(event) => setSelectedProgrammeName(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Tous les programmes</option>
              {programmeNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <select
              value={selectedAgeFilter}
              onChange={(event) => setSelectedAgeFilter(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
          <div className="min-w-0">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <select
              value={selectedSeason}
              onChange={(event) => setSelectedSeason(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes les saisons</option>
              {seasons.map((season) => (
                <option key={season} value={season}>
                  Saison {season}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Liste des Programmes
            </h2>
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {filteredProgrammes.length} programme(s)
            </span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-3 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M8 13h2"></path>
                <path d="M14 13h2"></path>
                <path d="M8 17h2"></path>
                <path d="M14 17h2"></path>
              </svg>
              Exporter Excel / CSV
            </button>
            <Dropdown
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              className="w-40 right-0 mt-2"
            >
              <DropdownItem onItemClick={handleExportExcel}>Excel</DropdownItem>
              <DropdownItem onItemClick={handleExportCSV}>CSV</DropdownItem>
            </Dropdown>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={3} columns={5} />
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50/50 text-xs uppercase text-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Nom</th>
                  <th className="px-6 py-4 font-medium">Période</th>
                  <th className="px-6 py-4 font-medium">Saison</th>
                  <th className="px-6 py-4 font-medium">Catégorie</th>
                  <th className="px-6 py-4 font-medium">Joueurs Assignés</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredProgrammes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Aucun programme trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredProgrammes.map((prog) => (
                    <tr key={prog.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {prog.nom}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs">
                          {prog.date_depart ? `Du ${prog.date_depart}` : ""}
                          <br />
                          {prog.date_cloture ? `Au ${prog.date_cloture}` : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {prog.saison}
                      </td>
                      <td className="px-6 py-4">
                        {prog.categorie}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 py-1 px-2.5 rounded-full font-semibold text-xs">
                          {prog.joueurs?.length || 0} joueurs
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                            onClick={() => {
                              setSelectedProgramme(prog);
                              setIsModalOpen(true);
                            }}
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <PencilIcon className="size-5" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                            onClick={() => handleDelete(prog.id)}
                            aria-label="Supprimer"
                            title="Supprimer"
                          >
                            <TrashBinIcon className="size-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ProgrammeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        players={players}
        initialData={selectedProgramme}
        onSuccess={handleSuccess}
      />

      <ConfirmComponent />
    </div>
  );
}
