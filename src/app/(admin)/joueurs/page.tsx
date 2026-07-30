"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlayerTable from "@/components/club/PlayerTable";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import { softDeletePlayerInSupabase } from "@/lib/club/supabase-crud";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useConfirm } from "@/hooks/useConfirm";

import { PlayerViewModal } from "@/components/club/modals/PlayerViewModal";
import { PlayerEditModal } from "@/components/club/modals/PlayerEditModal";
import { PlayerAddModal } from "@/components/club/modals/PlayerAddModal";
import { Player } from "@/types/club";

export default function PlayersPage() {
  const router = useRouter();
  const { players: allPlayers, setPlayers } = useClubData();
  const { isCoach, userCategories } = useUserRole();

  const players = isCoach && userCategories && userCategories.length > 0
    ? allPlayers.filter(p => userCategories.includes(p.categorie))
    : allPlayers;

  const [isExportOpen, setIsExportOpen] = useState(false);
  const { enabledPlayerColumns } = useDashboardConfig();
  const { confirm, ConfirmComponent } = useConfirm();

  const [selectedViewPlayer, setSelectedViewPlayer] = useState<Player | null>(null);
  const [selectedEditPlayer, setSelectedEditPlayer] = useState<Player | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleDeletePlayer = (playerId: string) => {
    const target = players.find((player) => player.id === playerId);
    if (!target) return;

    confirm({
      title: "Supprimer le joueur",
      message: `Voulez-vous vraiment supprimer le joueur ${getPlayerFullName(target)} ?`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await softDeletePlayerInSupabase(playerId);
          setPlayers((prevPlayers) =>
            prevPlayers.filter((player) => player.id !== playerId),
          );
        } catch (error) {
          alert("Erreur lors de la suppression. Veuillez réessayer.");
        }
      }
    });
  };

  const tableColumns =
    enabledPlayerColumns.length > 0 ? enabledPlayerColumns : undefined;

  const handleExportExcel = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des joueurs au format Excel ?",
      onConfirm: () => {
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
      }
    });
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des joueurs au format CSV ?",
      onConfirm: () => {
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
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Joueurs" />

      <PlayerTable
        players={players}
        columns={tableColumns}
        onViewPlayer={(player) => setSelectedViewPlayer(player)}
        onEditPlayer={(player) => setSelectedEditPlayer(player)}
        onDeletePlayer={(player) => handleDeletePlayer(player.id)}
        actionButton={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            + Ajouter un joueur
          </button>
        }
        exportButton={
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <PlayerViewModal 
        isOpen={!!selectedViewPlayer} 
        onClose={() => setSelectedViewPlayer(null)} 
        player={selectedViewPlayer} 
      />
      
      <PlayerEditModal
        isOpen={!!selectedEditPlayer}
        onClose={() => setSelectedEditPlayer(null)}
        player={selectedEditPlayer}
      />
      <PlayerAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <ConfirmComponent />
    </div>
  );
}
