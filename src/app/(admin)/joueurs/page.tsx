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
import { usePermissions } from "@/hooks/usePermissions";

import { PlayerViewModal } from "@/components/club/modals/PlayerViewModal";
import { PlayerEditModal } from "@/components/club/modals/PlayerEditModal";
import { PlayerAddModal } from "@/components/club/modals/PlayerAddModal";
import { PaymentAddModal } from "@/components/club/modals/PaymentAddModal";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";
import { Player } from "@/types/club";
import { supabase } from "@/lib/supabaseClient";

function PlayersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { players: allPlayers, setPlayers } = useClubData();
  const { isCoach, userCategories } = useUserRole();
  const { hasPermission, isLoaded } = usePermissions();

  const activePlayers = useMemo(() => allPlayers.filter(p => p.statut !== "alumni"), [allPlayers]);
  const players = useMemo(() => isCoach && userCategories && userCategories.length > 0
    ? activePlayers.filter(p => userCategories.includes(p.categorie))
    : activePlayers, [isCoach, userCategories, activePlayers]);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const { enabledPlayerColumns } = useDashboardConfig();
  const { confirm, ConfirmComponent } = useConfirm();

  const [selectedViewPlayer, setSelectedViewPlayer] = useState<Player | null>(null);
  const [selectedEditPlayer, setSelectedEditPlayer] = useState<Player | null>(null);
  const [selectedPaymentPlayer, setSelectedPaymentPlayer] = useState<Player | null>(null);
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
              if ((!updatedPlayer.urgenceNomPrenom || updatedPlayer.urgenceNomPrenom === "Choisir") && (meta.emergency_name || meta.emergency_contact_name)) {
                updatedPlayer.urgenceNomPrenom = meta.emergency_name || meta.emergency_contact_name;
                fieldsToHighlight.push("urgenceNomPrenom");
              }
              if (!updatedPlayer.urgenceTelephone && (meta.emergency_phone || meta.emergency_contact_phone)) {
                updatedPlayer.urgenceTelephone = meta.emergency_phone || meta.emergency_contact_phone;
                fieldsToHighlight.push("urgenceTelephone");
              }
              if (!updatedPlayer.urgenceLien && (meta.emergency_relation || meta.emergency_contact_relation)) {
                updatedPlayer.urgenceLien = meta.emergency_relation || meta.emergency_contact_relation;
                fieldsToHighlight.push("urgenceLien");
              }
              if (!updatedPlayer.urgenceEmail && (meta.emergency_email || meta.emergency_contact_email)) {
                updatedPlayer.urgenceEmail = meta.emergency_email || meta.emergency_contact_email;
                fieldsToHighlight.push("urgenceEmail");
              }
              if (!updatedPlayer.urgenceAdresse && (meta.emergency_address || meta.emergency_contact_address)) {
                updatedPlayer.urgenceAdresse = meta.emergency_address || meta.emergency_contact_address;
                fieldsToHighlight.push("urgenceAdresse");
              }
              if ((!updatedPlayer.tailleHaut || updatedPlayer.tailleHaut === "Choisir") && meta.uniform_top_size) {
                updatedPlayer.tailleHaut = meta.uniform_top_size;
                fieldsToHighlight.push("tailleHaut");
              }
              if ((!updatedPlayer.tailleShort || updatedPlayer.tailleShort === "Choisir") && meta.uniform_short_size) {
                updatedPlayer.tailleShort = meta.uniform_short_size;
                fieldsToHighlight.push("tailleShort");
              }
              if (!updatedPlayer.numerosPreferes && meta.preferred_numbers) {
                updatedPlayer.numerosPreferes = meta.preferred_numbers;
                fieldsToHighlight.push("numerosPreferes");
              }
              
              // Fetch docs and full registration data
              const emailToSearch = message.contact_email || meta.guardian_email;
              if (emailToSearch) {
                const { data: allRegs } = await supabase.from('player_registrations').select('*').eq('guardian_email', emailToSearch).order('created_at', { ascending: false }).limit(1);
                if (allRegs && allRegs.length > 0) {
                  const reg = allRegs[0];
                  
                  // Merge any missing fields from player_registrations directly
                  if (!updatedPlayer.numerosPreferes && reg.preferred_numbers) {
                    updatedPlayer.numerosPreferes = reg.preferred_numbers;
                    fieldsToHighlight.push("numerosPreferes");
                  }
                  if ((!updatedPlayer.tailleHaut || updatedPlayer.tailleHaut === "Choisir") && reg.uniform_top_size) {
                    updatedPlayer.tailleHaut = reg.uniform_top_size;
                    if (!fieldsToHighlight.includes("tailleHaut")) fieldsToHighlight.push("tailleHaut");
                  }
                  if ((!updatedPlayer.tailleShort || updatedPlayer.tailleShort === "Choisir") && reg.uniform_short_size) {
                    updatedPlayer.tailleShort = reg.uniform_short_size;
                    if (!fieldsToHighlight.includes("tailleShort")) fieldsToHighlight.push("tailleShort");
                  }
                  if ((!updatedPlayer.urgenceNomPrenom || updatedPlayer.urgenceNomPrenom === "Choisir") && reg.emergency_name) {
                    updatedPlayer.urgenceNomPrenom = reg.emergency_name;
                    if (!fieldsToHighlight.includes("urgenceNomPrenom")) fieldsToHighlight.push("urgenceNomPrenom");
                  }

                  const { data: docs } = await supabase.from('player_registration_documents').select('*').eq('registration_id', reg.id);
                  if (docs && docs.length > 0) {
                    docs.forEach((doc: any) => {
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
                        if ((key.includes("9e") || key.includes("9eme") || key.includes("fiche_9e")) && !updatedPlayer.fiche9eUrl) {
                           updatedPlayer.fiche9eUrl = finalUrl;
                           fieldsToHighlight.push("fiche9eUrl");
                        }
                        if ((key.includes("vaccin") || key.includes("carnet_vaccination")) && !updatedPlayer.carnetVaccinationUrl) {
                           updatedPlayer.carnetVaccinationUrl = finalUrl;
                           fieldsToHighlight.push("carnetVaccinationUrl");
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
          // Fresh permission check
          const { data: authData } = await supabase.auth.getUser();
          const user = authData?.user;
          if (user) {
            const role = (user.user_metadata?.role || "").toLowerCase();
            const email = user.email;
            const perms = user.user_metadata?.permissions || {};
            
            if (email?.toLowerCase() !== "footballclubtoro@gmail.com" && role !== "super admin") {
              const hasPerm = (perms["Joueurs"] || []).includes("delete");
              if (!hasPerm) {
                alert("Accès refusé : Vos droits ont été révoqués récemment. Veuillez rafraîchir la page ou vous reconnecter.");
                return;
              }
            }
          }

          await softDeletePlayerInSupabase(playerId);
          setPlayers((prevPlayers) =>
            prevPlayers.filter((player) => player.id !== playerId),
          );
          setToast({ message: `Joueur ${getPlayerFullName(target)} supprimé avec succès !`, type: "success" });
          setTimeout(() => setToast(null), 3000);
        } catch (error) {
          setToast({ message: "Erreur lors de la suppression.", type: "error" });
          setTimeout(() => setToast(null), 3000);
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
        onEditPlayer={hasPermission("Joueurs", "edit") ? ((player) => setSelectedEditPlayer(player)) : undefined}
        onDeletePlayer={hasPermission("Joueurs", "delete") ? ((player) => handleDeletePlayer(player.id)) : undefined}
        onAddPaymentForPlayer={hasPermission("Paiements", "create") || hasPermission("Paiements", "edit") ? ((player) => setSelectedPaymentPlayer(player)) : ((player) => setSelectedPaymentPlayer(player))}
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/joueurs/statuts-speciaux"
              className="inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-brand-200 bg-brand-50 px-3.5 text-sm font-semibold text-brand-700 shadow-theme-xs hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
            >
              Statuts Speciaux
            </Link>
            {hasPermission("Joueurs", "create") && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
              >
                + Ajouter un joueur
              </button>
            )}
          </div>
        }        exportButton={
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
        onAddPayment={(player) => setSelectedPaymentPlayer(player)}
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
        siteMessageId={searchParams.get("siteMessageId")}
        commentIdentifie={searchParams.get("commentIdentifie")}
      />
      <PlayerAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <PaymentAddModal
        isOpen={!!selectedPaymentPlayer}
        onClose={() => setSelectedPaymentPlayer(null)}
        initialPlayerId={selectedPaymentPlayer?.id}
      />
      <ConfirmComponent />
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
