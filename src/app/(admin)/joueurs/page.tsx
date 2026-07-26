"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlayerTable from "@/components/club/PlayerTable";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useClubData } from "@/context/ClubDataContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import { softDeletePlayerInSupabase } from "@/lib/club/supabase-crud";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

export default function PlayersPage() {
  const router = useRouter();
  const { players, setPlayers } = useClubData();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { enabledPlayerColumns } = useDashboardConfig();

  const handleDeletePlayer = async (playerId: string) => {
    const target = players.find((player) => player.id === playerId);
    if (!target) {
      return;
    }

    const shouldDelete = window.confirm(
      `Supprimer le joueur ${getPlayerFullName(target)} ?`,
    );
    if (!shouldDelete) {
      return;
    }

    try {
      await softDeletePlayerInSupabase(playerId);
      setPlayers((prevPlayers) =>
        prevPlayers.filter((player) => player.id !== playerId),
      );
    } catch (error) {
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  };

  const tableColumns =
    enabledPlayerColumns.length > 0 ? enabledPlayerColumns : undefined;

  const handleExportExcel = () => {
    if (!window.confirm("Voulez-vous vraiment exporter la liste des joueurs au format Excel ?")) return;
    setIsExportOpen(false);
    
    const headers = ["Matricule", "Nom", "Prénom", "Poste", "Sexe", "Catégorie", "Statut", "Téléphone", "Email", "Date Inscription"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n";
    
    players.forEach(p => {
      const row = [p.matricule, p.nom, p.prenom, p.poste, p.sexe, p.categorie, p.statut, p.telephone, p.email, p.dateInscription];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "joueurs_excel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (!window.confirm("Voulez-vous vraiment exporter la liste des joueurs au format CSV ?")) return;
    setIsExportOpen(false);
    
    const headers = ["Matricule", "Nom", "Prénom", "Poste", "Sexe", "Catégorie", "Statut", "Téléphone", "Email", "Date Inscription"];
    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    
    players.forEach(p => {
      const row = [p.matricule, p.nom, p.prenom, p.poste, p.sexe, p.categorie, p.statut, p.telephone, p.email, p.dateInscription];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "joueurs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Joueurs" />

      <PlayerTable
        players={players}
        columns={tableColumns}
        onViewPlayer={(player) => router.push(`/joueurs/${player.id}`)}
        onEditPlayer={(player) => router.push(`/joueurs/${player.id}/modifier`)}
        onDeletePlayer={(player) => handleDeletePlayer(player.id)}
        actionButton={
          <Link
            href="/joueurs/nouveau"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            + Ajouter un joueur
          </Link>
        }
        exportButton={
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="dropdown-toggle inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-green-600 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-green-700"
            >
              Exporter
            </button>
            <Dropdown
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              className="w-32"
            >
              <DropdownItem
                onItemClick={handleExportExcel}
              >
                Excel
              </DropdownItem>
              <DropdownItem
                onItemClick={handleExportCSV}
              >
                CSV
              </DropdownItem>
            </Dropdown>
          </div>
        }
      />
    </div>
  );
}
