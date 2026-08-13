"use client";

import React, { useState, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { PricingItem } from "@/types/club";
import { Modal } from "@/components/ui/modal";

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function RubriquesPage() {
  const { isSuperAdmin, isAdmin } = useUserRole();
  const { rubriques, addRubrique, updateRubrique, deleteRubrique } = useClubData();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDevise, setFilterDevise] = useState<"ALL" | "US" | "HTG">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "active" | "inactive">("ALL");

  // State for Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRubrique, setEditingRubrique] = useState<PricingItem | null>(null);

  // Form inputs
  const [rubriqueTitle, setRubriqueTitle] = useState("");
  const [montant, setMontant] = useState<number>(0);
  const [devise, setDevise] = useState<"US" | "HTG">("US");
  const [precision, setPrecision] = useState("");
  const [categorie, setCategorie] = useState("");
  const [estAdhesion, setEstAdhesion] = useState(false);
  const [actif, setActif] = useState(true);

  // Delete Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredRubriques = useMemo(() => {
    return rubriques.filter((item) => {
      const matchSearch =
        item.rubrique.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.precision.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.categorie && item.categorie.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchDevise = filterDevise === "ALL" || item.devise === filterDevise;

      const itemActive = item.actif !== false;
      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "active" && itemActive) ||
        (filterStatus === "inactive" && !itemActive);

      return matchSearch && matchDevise && matchStatus;
    });
  }, [rubriques, searchTerm, filterDevise, filterStatus]);

  const openAddModal = () => {
    setEditingRubrique(null);
    setRubriqueTitle("");
    setMontant(0);
    setDevise("US");
    setPrecision("");
    setCategorie("");
    setEstAdhesion(false);
    setActif(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PricingItem) => {
    setEditingRubrique(item);
    setRubriqueTitle(item.rubrique);
    setMontant(item.montant);
    setDevise(item.devise);
    setPrecision(item.precision || "");
    setCategorie(item.categorie || "");
    setEstAdhesion(Boolean(item.estAdhesion));
    setActif(item.actif !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rubriqueTitle.trim()) {
      alert("Veuillez saisir le titre de la rubrique.");
      return;
    }

    try {
      if (editingRubrique) {
        await updateRubrique(editingRubrique.id, {
          rubrique: rubriqueTitle.trim(),
          montant,
          devise,
          precision: precision.trim(),
          categorie: categorie.trim() || undefined,
          estAdhesion,
          actif,
        });
      } else {
        await addRubrique({
          rubrique: rubriqueTitle.trim(),
          montant,
          devise,
          precision: precision.trim(),
          categorie: categorie.trim() || undefined,
          estAdhesion,
          actif,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erreur d'enregistrement :", err);
      alert("Une erreur est survenue lors de l'enregistrement.");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteRubrique(deletingId);
      setDeletingId(null);
    } catch (err) {
      console.error("Erreur de suppression :", err);
      alert("Erreur lors de la suppression de la rubrique.");
    }
  };

  const toggleStatus = async (item: PricingItem) => {
    try {
      await updateRubrique(item.id, { actif: item.actif === false });
    } catch (err) {
      console.error("Erreur de changement de statut :", err);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Gestion des Rubriques" />

      {/* Header action panel */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Rubriques de Paiement
            </h2>
            <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
              Gérez la liste des frais, adhésions et uniformes affichés lors de la saisie des paiements.
            </p>
          </div>
          {(isSuperAdmin || isAdmin) && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nouvelle Rubrique
            </button>
          )}
        </div>

        {/* Filters and search */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase text-gray-500">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Titre, précision, catégorie..."
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase text-gray-500">Devise</label>
            <select
              value={filterDevise}
              onChange={(e) => setFilterDevise(e.target.value as any)}
              className={selectClassName}
            >
              <option value="ALL">Toutes les devises</option>
              <option value="US">USD ($)</option>
              <option value="HTG">HTG (G)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase text-gray-500">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className={selectClassName}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="active">Actives uniquement</option>
              <option value="inactive">Inactives uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table list */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4">Titre Rubrique</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Précision / Note</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredRubriques.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    Aucune rubrique trouvée.
                  </td>
                </tr>
              ) : (
                filteredRubriques.map((item) => {
                  const isItemActive = item.actif !== false;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {item.rubrique}
                          {item.estAdhesion && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400">
                              Adhésion
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">
                        {item.devise === "HTG" ? `${item.montant} HTG` : `$${item.montant} USD`}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-xs">
                        {item.precision || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {item.categorie ? (
                          <span className="rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            {item.categorie}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Standard</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(item)}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all ${
                            isItemActive
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
                              : "bg-gray-100 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {isItemActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                            title="Modifier"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            title="Supprimer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-lg">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingRubrique ? "Modifier la rubrique" : "Ajouter une rubrique"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Remplissez les paramètres de la rubrique tarifaire
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Titre de la rubrique *
            </label>
            <input
              type="text"
              required
              value={rubriqueTitle}
              onChange={(e) => setRubriqueTitle(e.target.value)}
              placeholder="Ex: Frais d'uniforme de rechange"
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Montant *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={montant}
                onChange={(e) => setMontant(Number(e.target.value))}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Devise
              </label>
              <select
                value={devise}
                onChange={(e) => setDevise(e.target.value as "US" | "HTG")}
                className={selectClassName}
              >
                <option value="US">Dollar US ($)</option>
                <option value="HTG">Gourde HTG (G)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Catégorie associée (optionnel)
            </label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className={selectClassName}
            >
              <option value="">Sélectionnez une catégorie (Optionnel)</option>
              <option value="FC TORO">FC TORO</option>
              <option value="TI TORO">TI TORO</option>
              <option value="Payroll">Payroll</option>
              <option value="Équipement">Équipement</option>
              <option value="Événement">Événement</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Précision / Détails
            </label>
            <textarea
              rows={2}
              value={precision}
              onChange={(e) => setPrecision(e.target.value)}
              placeholder="Precision ou remarques sur l'application de ce tarif..."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={estAdhesion}
                onChange={(e) => setEstAdhesion(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Rubrique d'Adhésion
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Actif
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={Boolean(deletingId)} onClose={() => setDeletingId(null)} className="max-w-md">
        <div className="p-6 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Supprimer la rubrique ?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Êtes-vous sûr de vouloir supprimer cette rubrique ? Les paiements déjà enregistrés ne seront pas affectés.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeletingId(null)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
