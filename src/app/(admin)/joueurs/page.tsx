"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlayerTable from "@/components/club/PlayerTable";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";
import { getPlayerFullName } from "@/lib/club/metrics";
import { softDeletePlayerInSupabase } from "@/lib/club/supabase-crud";
import { fetchSiteMessageById } from "@/lib/club/supabase-demandes";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useConfirm } from "@/hooks/useConfirm";

import { PlayerViewModal } from "@/components/club/modals/PlayerViewModal";
import { PlayerEditModal } from "@/components/club/modals/PlayerEditModal";
import { PlayerAddModal } from "@/components/club/modals/PlayerAddModal";
import { Player } from "@/types/club";
import { supabase } from "@/lib/supabaseClient";

function PlayersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { players: allPlayers, setPlayers } = useClubData();
  const { isCoach, userCategories } = useUserRole();

  const activePlayers = useMemo(() => allPlayers.filter(p => p.statut !== "alumni"), [allPlayers]);
  const players = useMemo(() => isCoach && userCategories && userCategories.length > 0
    ? activePlayers.filter(p => userCategories.includes(p.categorie))
    : activePlayers, [isCoach, userCategories, activePlayers]);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const { enabledPlayerColumns } = useDashboardConfig();
  const { confirm, ConfirmComponent } = useConfirm();

  const [selectedViewPlayer, setSelectedViewPlayer] = useState<Player | null>(null);
  const [selectedEditPlayer, setSelectedEditPlayer] = useState<Player | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [highlightFields, setHighlightFields] = useState<string[]>([]);

  useEffect(() => {
    const editPlayerId = searchParams.get("editPlayerId");
    const demandeId = searchParams.get("demandeId");

    const openEditModal = async () => {
      if (editPlayerId) {
        const player = players.find(p => p.id === editPlayerId);
        if (player) {
          let updatedPlayer = { ...player };
          let fieldsToHighlight: string[] = [];
          
          if (demandeId) {
            const message = await fetchSiteMessageById(demandeId);
            if (message && message.metadata) {
              const meta = message.metadata;
              if (!updatedPlayer.telephone && (meta.guardian_phone || message.contact_telephone)) {
                updatedPlayer.telephone = meta.guardian_phone || message.contact_telephone;
                fieldsToHighlight.push("telephone");
              }
              if (!updatedPlayer.email && (meta.guardian_email || message.contact_email)) {
                updatedPlayer.email = meta.guardian_email || message.contact_email;
                fieldsToHighlight.push("email");
              }
              if (!updatedPlayer.adresse && (meta.child_address || meta.guardian_address)) {
                updatedPlayer.adresse = meta.child_address || meta.guardian_address;
                fieldsToHighlight.push("adresse");
              }
              if (!updatedPlayer.dateNaissance && (meta.child_birth_date || meta.child_dob)) {
                updatedPlayer.dateNaissance = meta.child_birth_date || meta.child_dob;
                fieldsToHighlight.push("dateNaissance");
              }
              
              // Fetch docs
              const emailToSearch = message.contact_email || meta.guardian_email;
              if (emailToSearch) {
                const { data: allRegs } = await supabase.from('player_registrations').select('id').eq('guardian_email', emailToSearch).order('created_at', { ascending: false }).limit(1);
                if (allRegs && allRegs.length > 0) {
                  const { data: docs } = await supabase.from('player_registration_documents').select('*').eq('registration_id', allRegs[0].id);
                  if (docs && docs.length > 0) {
                    docs.forEach(doc => {
                      if (doc.path) {
                        const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uivlcmvofzoyzhtjntlp.supabase.co";
                        const finalUrl = doc.path.startsWith("http") ? doc.path : `${supabaseUrl}/storage/v1/object/public/${bucket}/${doc.path}`;
                        
                        const key = String(doc.doc_key).toLowerCase();
                        if (key.includes("photo") && !updatedPlayer.photoIdentiteUrl) {
                           updatedPlayer.photoIdentiteUrl = finalUrl;
                           fieldsToHighlight.push("photoIdentiteUrl");
                        }
                        if ((key.includes("naissance") || key.includes("birth")) && !updatedPlayer.acteNaissanceUrl) {
                           updatedPlayer.acteNaissanceUrl = finalUrl;
                           fieldsToHighlight.push("acteNaissanceUrl");
                        }
                        if ((key.includes("parent") || key.includes("identit") || key.includes("id_card")) && !updatedPlayer.carteIdentiteParentUrl) {
                           updatedPlayer.carteIdentiteParentUrl = finalUrl;
                           fieldsToHighlight.push("carteIdentiteParentUrl");
                        }
                      }
                    });
                  }
                }
              }
            }
          }
          setHighlightFields(fieldsToHighlight);
          setSelectedEditPlayer(updatedPlayer);
        }
      }
    };

    if (players.length > 0) {
      openEditModal();
    }
  }, [searchParams, players]);

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
        onClose={() => {
          setSelectedEditPlayer(null);
          router.replace("/joueurs");
        }}
        player={selectedEditPlayer}
        highlightFields={highlightFields}
        demandeId={searchParams.get("demandeId")}
      />
      <PlayerAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <ConfirmComponent />
    </div>
  );
}

import { TableSkeleton } from "@/components/ui/skeleton/Skeleton";

export default function PlayersPage() {
  return (
    <Suspense fallback={<div className="p-6 bg-white rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900"><TableSkeleton rows={6} columns={8} /></div>}>
      <PlayersPageContent />
    </Suspense>
  );
}
