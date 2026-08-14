"use client";

import React, { useState, useEffect, useMemo, useEffect as useReactEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { fetchSiteMessages, updateMessageStatus, deleteMessage } from "@/lib/club/supabase-demandes";
import { SiteMessage } from "@/types/club";
import Pagination from "@/components/tables/Pagination";
import { DownloadIcon, EyeIcon, TrashBinIcon } from "@/icons";
import { useConfirm } from "@/hooks/useConfirm";
import { useClubData } from "@/context/ClubDataContext";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { fetchDocumentsForMessage, uploadDetectionDocument } from "@/lib/club/supabase-demandes";

// Placeholder icon for document
const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function BoiteDeReception() {
  const router = useRouter();
  const { players } = useClubData();
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inscription_joueur" | "detection">("inscription_joueur");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const { confirm, ConfirmComponent } = useConfirm();

  // Modal states
  const [selectedMessage, setSelectedMessage] = useState<SiteMessage | null>(null);
  const [modalMode, setModalMode] = useState<"details" | "documents">("details");
  const [duplicateCheck, setDuplicateCheck] = useState<{ isDuplicate: boolean; source?: string; player?: any } | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ status: "not_verified" | "not_found" | "found_missing_data" | "found_complete"; missingFields?: string[]; playerId?: string }>({ status: "not_verified" });
  
  // Download states
  const [downloadTarget, setDownloadTarget] = useState<SiteMessage | null>(null);
  const [downloadDocs, setDownloadDocs] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);

  const handleUploadDoc = async (docKey: string, file: File) => {
    if (!downloadTarget) return;
    setUploadingDocKey(docKey);
    try {
      const newDoc = await uploadDetectionDocument(downloadTarget.id, docKey, file);
      setDownloadDocs(prev => {
        const filtered = prev.filter(d => d.doc_key !== docKey);
        return [...filtered, newDoc];
      });
    } catch (e) {
      console.error("Erreur lors de l'upload du document:", e);
      alert("Erreur lors de l'envoi du document. Veuillez réessayer.");
    } finally {
      setUploadingDocKey(null);
    }
  };

  useEffect(() => {
    setVerificationResult({ status: "not_verified" });
    if (selectedMessage && selectedMessage.type_message === "inscription_joueur") {
      fetch(`/api/demandes/${selectedMessage.id}/check-duplicate`)
        .then(res => {
          if (!res.ok) {
            console.error("API returned status:", res.status);
            return { error: true };
          }
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return res.json();
          } else {
            console.error("API returned non-JSON response");
            return { error: true };
          }
        })
        .then(data => {
          if (!data.error && data.isDuplicate) {
            setDuplicateCheck(data);
          } else {
            setDuplicateCheck(null);
          }
        })
        .catch(err => console.error(err));
    } else {
      setDuplicateCheck(null);
    }
  }, [selectedMessage?.id]);

  const handleDownloadClick = async (msg: SiteMessage) => {
    setDownloadTarget(msg);
    setIsLoadingDocs(true);
    try {
      const docs = await fetchDocumentsForMessage(msg.id, msg.contact_email);
      setDownloadDocs(docs || []);
    } catch (e) {
      console.error(e);
      setDownloadDocs([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleVerifyPlayer = () => {
    if (!selectedMessage || !selectedMessage.metadata) return;

    let existingPlayer = null;

    if (duplicateCheck && duplicateCheck.isDuplicate && duplicateCheck.player) {
      existingPlayer = players.find(p => p.id === duplicateCheck.player.id);
    }

    if (!existingPlayer) {
      let nom = (selectedMessage.metadata.enfant_nom || selectedMessage.metadata.child_last_name || "").toString().toLowerCase().trim();
      let prenom = (selectedMessage.metadata.enfant_prenom || selectedMessage.metadata.child_first_name || "").toString().toLowerCase().trim();

      if (nom && !prenom && nom.includes(" ")) {
        const parts = nom.split(" ");
        prenom = parts[0];
        nom = parts.slice(1).join(" ");
      }

      if (nom || prenom) {
        existingPlayer = players.find(
          (p) => 
            (nom && p.nom.toLowerCase().includes(nom) && prenom && p.prenom.toLowerCase().includes(prenom)) ||
            (nom && p.nom.toLowerCase().includes(prenom) && prenom && p.prenom.toLowerCase().includes(nom))
        );
      }
    }

    if (existingPlayer) {
      const missingFields: string[] = [];
      if (!existingPlayer.photoIdentiteUrl) missingFields.push("Photo d'identité");
      if (!existingPlayer.acteNaissanceUrl) missingFields.push("Acte de naissance");
      if (!existingPlayer.carteIdentiteParentUrl) missingFields.push("Carte d'identité du parent");
      if (!existingPlayer.telephone) missingFields.push("Téléphone");
      if (!existingPlayer.email) missingFields.push("Email");
      if (!existingPlayer.adresse) missingFields.push("Adresse");

      if (missingFields.length > 0) {
        setVerificationResult({ status: "found_missing_data", missingFields, playerId: existingPlayer.id });
      } else {
        setVerificationResult({ status: "found_complete", playerId: existingPlayer.id });
      }
    } else {
      setVerificationResult({ status: "not_found" });
    }

    setTimeout(() => {
      document.getElementById("verification-result-container")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await fetchSiteMessages();
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      const matchTab = m.type_message === activeTab;
      if (!matchTab) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const contactName = (m.contact_nom || "").toLowerCase();
        const contactEmail = (m.contact_email || "").toLowerCase();
        const childName = (m.metadata?.enfant_nom || m.metadata?.child_last_name || m.metadata?.nom || "").toLowerCase();
        const childFirstName = (m.metadata?.enfant_prenom || m.metadata?.child_first_name || m.metadata?.prenom || "").toLowerCase();
        
        const isMatch = contactName.includes(query) || 
                        contactEmail.includes(query) || 
                        childName.includes(query) || 
                        childFirstName.includes(query) ||
                        `${childFirstName} ${childName}`.includes(query);
                        
        if (!isMatch) return false;
      }

      if (yearFilter !== "all") {
        const year = new Date(m.created_at).getFullYear().toString();
        if (year !== yearFilter) return false;
      }
      if (monthFilter !== "all") {
        const month = (new Date(m.created_at).getMonth() + 1).toString();
        if (month !== monthFilter) return false;
      }
      if (statusFilter !== "all") {
        if (m.statut !== statusFilter) return false;
      }
      return true;
    });
  }, [messages, activeTab, yearFilter, monthFilter, statusFilter, searchQuery]);

  const toggleStatus = async (id: string, currentStatus: string, metadata?: any) => {
    const newStatus = currentStatus === "nouveau" ? "lu" : "nouveau";
    try {
      // Optimistic update
      setMessages(prev => prev.map(m => m.id === id ? { ...m, statut: newStatus as any } : m));
      await updateMessageStatus(id, newStatus as any, metadata);
    } catch (err) {
      // Revert if error
      loadMessages();
    }
  };

  const handleDelete = (id: string, metadata?: any) => {
    confirm({
      title: "Supprimer la demande",
      message: "Voulez-vous vraiment supprimer cette demande ?",
      isDestructive: true,
      onConfirm: async () => {
        try {
          setMessages(prev => prev.filter(m => m.id !== id));
          await deleteMessage(id, metadata);
        } catch (err) {
          loadMessages();
        }
      }
    });
  };

  const handleExportCSV = () => {
    confirm({
      title: "Exporter la liste",
      message: `Voulez-vous vraiment exporter les demandes de la catégorie "${getTabTitle(activeTab)}" au format Excel (.xls) ?`,
      onConfirm: () => {
        const isDetection = activeTab === "detection";
        const headers = isDetection
          ? [
              "N° Détection",
              "Statut",
              "Nom Joueur",
              "Prénom Joueur",
              "Sexe",
              "Date de Naissance",
              "Lieu de Naissance",
              "Adresse / Zone de Résidence",
              "Téléphone",
              "Email",
              "Parent / Tuteur",
              "Pied Dominant",
              "Club Actuel",
              "Niveau Actuel",
              "Date Demande"
            ]
          : [
              "ID / Réf",
              "Statut",
              "Catégorie",
              "Contact (Parent)",
              "Email",
              "Téléphone",
              "Enfant / Joueur",
              "Date de Naissance",
              "Adresse",
              "Date Demande",
              "Contenu"
            ];

        const rowsData: string[][] = [];

        filteredMessages.forEach(msg => {
          const enfantNom = msg.metadata?.nom || msg.metadata?.enfant_nom || msg.metadata?.child_last_name || "";
          const enfantPrenom = msg.metadata?.prenom || msg.metadata?.enfant_prenom || msg.metadata?.child_first_name || "";
          const enfant = `${enfantPrenom} ${enfantNom}`.trim();
          
          const rawDate = new Date(msg.created_at);
          const formattedDate = !isNaN(rawDate.getTime()) 
            ? `${rawDate.getDate().toString().padStart(2, '0')}/${(rawDate.getMonth() + 1).toString().padStart(2, '0')}/${rawDate.getFullYear()}` 
            : "";
          
          const dateNaissance = msg.metadata?.date_naissance || msg.metadata?.child_birth_date || msg.metadata?.child_dob || "";
          const adresse = msg.metadata?.zone_residence || msg.metadata?.adresse || msg.metadata?.child_address || msg.metadata?.guardian_address || "";
          const numDetection = msg.metadata?.numero_detection || msg.reference_id || msg.id;

          const row = isDetection
            ? [
                numDetection,
                msg.statut === "nouveau" ? "Nouveau" : msg.statut === "inscrit" ? "Inscrit" : msg.statut,
                enfantNom,
                enfantPrenom,
                msg.metadata?.sexe || "",
                dateNaissance,
                msg.metadata?.lieu_naissance || "",
                adresse,
                msg.contact_telephone || "",
                msg.contact_email || "",
                msg.contact_nom || "",
                msg.metadata?.pied_dominant || "",
                msg.metadata?.club_actuel || "",
                msg.metadata?.niveau_actuel || "",
                formattedDate
              ]
            : [
                msg.id,
                msg.statut,
                getTabTitle(msg.type_message),
                msg.contact_nom || "",
                msg.contact_email || "",
                msg.contact_telephone || "",
                enfant,
                dateNaissance,
                adresse,
                formattedDate,
                msg.contenu?.replace(/\n/g, ' ') || ""
              ];

          rowsData.push(row);
        });

        const escapeXml = (str: any) =>
          String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

        const excelTable = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>${escapeXml(getTabTitle(activeTab))}</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
              th { background-color: #C8102E; color: #FFFFFF; font-weight: bold; border: 1px solid #999999; padding: 8px; text-align: left; }
              td { border: 1px solid #CCCCCC; padding: 6px; mso-number-format:"\\@"; vertical-align: top; }
              tr:nth-child(even) { background-color: #F9F9F9; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${escapeXml(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rowsData.map(r => `<tr>${r.map(cell => `<td>${escapeXml(cell)}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;

        const blob = new Blob([excelTable], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `export_${activeTab}_${Date.now()}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "inscription_joueur": return "Inscriptions Joueur";
      case "detection": return "Détection joueur";
      default: return "";
    }
  };

  const getTabSubtitle = (tab: string) => {
    switch (tab) {
      case "inscription_joueur": return "Consultez et gérez les inscriptions des nouveaux joueurs.";
      case "detection": return "Consultez et gérez les candidatures pour la détection de nouveaux joueurs.";
      default: return "";
    }
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    return (
      <div className="flex flex-col text-sm">
        <span>{d.getDate()} {months[d.getMonth()]} {d.getFullYear()}</span>
        <span className="text-gray-500 text-xs">{d.getHours().toString().padStart(2, '0')}:{d.getMinutes().toString().padStart(2, '0')}</span>
      </div>
    );
  };

  const getCount = (type: string) => messages.filter(m => m.type_message === type && m.statut === "nouveau").length;

  return (
    <div className="space-y-4">
      <PageBreadcrumb pageTitle="Boîte de réception" />

      {/* TABS UI (Segmented Control Style) */}
      <div className="flex justify-start pb-4 mb-2 mt-2 overflow-x-auto hide-scrollbar">
        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100/80 p-1.5 dark:bg-gray-800/80 backdrop-blur-sm shadow-inner">
          {["inscription_joueur", "detection"].map((tab) => {
            const isActive = activeTab === tab;
            const count = getCount(tab);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`relative flex items-center gap-2.5 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-white text-[#C8102E] shadow-sm ring-1 ring-black/5 dark:bg-gray-900 dark:text-red-500 dark:ring-white/10"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700/50"
                }`}
              >
                <span className="relative z-10">{getTabTitle(tab)}</span>
                {count > 0 && (
                  <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C8102E] px-1.5 text-[10.5px] font-black text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {(() => {
        const totalPages = Math.max(1, Math.ceil(filteredMessages.length / currentPageSize));
        const currentPageSafe = Math.min(currentPage, totalPages);
        const pagedMessages = filteredMessages.slice(
          (currentPageSafe - 1) * currentPageSize,
          currentPageSafe * currentPageSize,
        );

        return (
          <>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{getTabTitle(activeTab)}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{getTabSubtitle(activeTab)}</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleExportCSV}
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
          </div>
        </div>

        {/* FILTER BLOCK MOVED INSIDE */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un joueur ou parent..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Toutes les années</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
            
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tous les mois</option>
              <option value="1">Janvier</option>
              <option value="2">Février</option>
              <option value="3">Mars</option>
              <option value="4">Avril</option>
              <option value="5">Mai</option>
              <option value="6">Juin</option>
              <option value="7">Juillet</option>
              <option value="8">Août</option>
              <option value="9">Septembre</option>
              <option value="10">Octobre</option>
              <option value="11">Novembre</option>
              <option value="12">Décembre</option>
            </select>

            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="nouveau">Nouveau</option>
              <option value="lu">Lu</option>
              <option value="inscrit">Enregistré / Inscrit</option>
              <option value="archive">Archivé / Refusé</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Type / Aperçu</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <TableBodySkeleton rows={5} columns={5} />
              ) : pagedMessages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Aucune demande trouvée pour cette catégorie.</td>
                </tr>
              ) : (
                pagedMessages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-4 align-top">
                      <button 
                        disabled={msg.statut === "inscrit"}
                        onClick={() => toggleStatus(msg.id, msg.statut, msg.metadata)}
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${
                        msg.statut === "nouveau"
                          ? "border-warning-500 text-warning-500 hover:bg-warning-50"
                          : msg.statut === "inscrit"
                          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 cursor-default"
                          : "border-success-500 text-success-500 hover:bg-success-50"
                      }`}>
                        {msg.statut === "inscrit" ? "Joueur Inscrit !" : msg.statut}
                      </button>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-800 dark:bg-warning-500/20 dark:text-warning-400">
                          {getTabTitle(msg.type_message)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={msg.contenu || `Nouvelle ${getTabTitle(msg.type_message)}...`}>
                          {msg.contenu || `Nouvelle ${getTabTitle(msg.type_message)}...`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {(() => {
                          const enfantNom = msg.metadata?.enfant_nom || msg.metadata?.child_last_name || msg.metadata?.nom || "";
                          const enfantPrenom = msg.metadata?.enfant_prenom || msg.metadata?.child_first_name || msg.metadata?.prenom || "";
                          const enfant = `${enfantPrenom} ${enfantNom}`.trim();
                          
                          // Remove the (Enfant: ...) part from contact_nom if it exists
                          let cleanParentName = msg.contact_nom || "";
                          const enfantIdx = cleanParentName.toLowerCase().indexOf("(enfant");
                          if (enfantIdx !== -1) {
                            cleanParentName = cleanParentName.substring(0, enfantIdx).trim();
                          }
                          
                          if (enfant) {
                            return (
                              <>
                                {enfant}
                                <span className="font-normal text-gray-500 dark:text-gray-400">
                                  {cleanParentName ? ` (Parent: ${cleanParentName})` : ""}
                                </span>
                              </>
                            );
                          }
                          return cleanParentName || msg.contact_nom;
                        })()}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        {msg.contact_email} {msg.contact_telephone && `| ${msg.contact_telephone}`}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {formatDate(msg.created_at)}
                    </td>
                    <td className="px-4 py-4 align-top text-right">
                      <div className="flex justify-end items-center gap-3 text-gray-400">
                        {(msg.type_message === "inscription_joueur" || msg.type_message === "stagiaire" || msg.type_message === "detection") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadClick(msg);
                            }}
                            className="hover:text-primary-500 transition-colors"
                            title="Télécharger Dossier & Documents"
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                          </button>
                        )}
                        <button 
                          onClick={() => { 
                            setSelectedMessage(msg); 
                            setModalMode("details"); 
                            if (msg.statut === "nouveau" && msg.type_message !== "stagiaire") {
                              toggleStatus(msg.id, msg.statut, msg.metadata);
                            }
                          }} 
                          className="hover:text-primary-500 transition-colors" 
                          title="Voir & Répondre"
                        >
                          <EyeIcon />
                        </button>
                        <button 
                          onClick={() => handleDelete(msg.id, msg.metadata)} 
                          className="text-error-500 hover:text-error-600 transition-colors cursor-pointer" 
                          title="Supprimer"
                        >
                          <TrashBinIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      <div className="mt-4 flex justify-end">
        <Pagination
          currentPage={currentPageSafe}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={currentPageSize}
          onPageSizeChange={(size) => {
            setCurrentPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
      </div>
      </>
        );
      })()}

      {/* MODAL */}
      {selectedMessage && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 sm:p-6">
          <div className="relative my-6 w-full max-w-lg rounded-3xl bg-white p-0 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  Détails de l'inscription
                </h3>
                <p className="text-sm text-gray-500 mt-1 font-medium">Validation du nouveau joueur</p>
              </div>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-6 space-y-5">
              {duplicateCheck?.isDuplicate && (
                <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-900/30 rounded-2xl flex gap-3 animate-in slide-in-from-top-2">
                  <span className="text-warning-600 dark:text-warning-400 text-lg">⚠️</span>
                  <div className="text-xs text-warning-800 dark:text-warning-200">
                    <strong className="block mb-1 text-sm font-bold">Attention : Doublon potentiel !</strong>
                    Un joueur nommé <strong>{duplicateCheck.player.child_first_name} {duplicateCheck.player.child_last_name}</strong> existe déjà dans {duplicateCheck.source === 'club_players' ? "les joueurs du club" : "les anciennes inscriptions"}. Vérifiez s'il s'agit de la même personne avant de valider.
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                  <div className="flex items-center gap-2.5 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-base">Contact (Parent/Tuteur)</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-1">Nom Complet</span>
                      <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.contact_nom}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-1">Téléphone</span>
                      <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.contact_telephone || "Non renseigné"}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-xs font-medium text-gray-500 mb-1">Email</span>
                      <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.contact_email}</span>
                    </div>
                  </div>
                </div>

                {selectedMessage.type_message === "detection" ? (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                    <div className="flex items-center gap-2.5 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-base">Informations Détection</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1">Joueur</span>
                        <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.metadata?.prenom} {selectedMessage.metadata?.nom}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1">Date & Lieu de naissance</span>
                        <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.metadata?.date_naissance} ({selectedMessage.metadata?.lieu_naissance})</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1">Pied Dominant</span>
                        <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.metadata?.pied_dominant || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1">Niveau Actuel</span>
                        <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.metadata?.niveau_actuel || "N/A"}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="block text-xs font-medium text-gray-500 mb-1">Expérience Compétitive</span>
                        <span className="block text-gray-900 dark:text-white font-medium text-sm whitespace-pre-wrap">{selectedMessage.metadata?.experience_competitive || "N/A"}</span>
                      </div>
                      {selectedMessage.metadata?.club_actuel && (
                        <div className="sm:col-span-2">
                          <span className="block text-xs font-medium text-gray-500 mb-1">Club Actuel</span>
                          <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.metadata?.club_actuel}</span>
                        </div>
                      )}
                      {selectedMessage.metadata?.photo_recente_url && (
                        <div className="sm:col-span-2 mt-2">
                          <a href={selectedMessage.metadata.photo_recente_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Voir la photo jointe
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                    <div className="flex items-center gap-2.5 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-base">Informations Joueur</h4>
                    </div>
                    <div className="grid gap-y-5">
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1">Nom de l'enfant</span>
                        <span className="block text-gray-900 dark:text-white font-medium text-sm">{selectedMessage.metadata?.enfant_nom || selectedMessage.metadata?.child_last_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1">Message d'inscription</span>
                        <span className="block text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedMessage.contenu}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div id="verification-result-container">
                {verificationResult.status === "found_missing_data" && (
                <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-900/30 rounded-2xl flex gap-3 animate-in slide-in-from-bottom-2">
                  <span className="text-warning-600 dark:text-warning-400 text-lg">⚠️</span>
                  <div className="text-xs text-warning-800 dark:text-warning-200">
                    <strong className="block mb-1 text-sm font-bold">Joueur existant mais incomplet</strong>
                    Le joueur existe déjà dans la base de données, mais il manque des informations importantes (ex: {verificationResult.missingFields?.join(", ")}).
                  </div>
                </div>
              )}

              {verificationResult.status === "found_complete" && (
                <div className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-900/30 rounded-2xl flex gap-3 animate-in slide-in-from-bottom-2">
                  <span className="text-success-600 dark:text-success-400 text-lg">✅</span>
                  <div className="text-xs text-success-800 dark:text-success-200">
                    <strong className="block mb-1 text-sm font-bold">Joueur existant et complet</strong>
                    Le joueur existe déjà et toutes les informations de base sont renseignées.
                  </div>
                </div>
              )}

              {verificationResult.status === "not_found" && (
                <div className="p-4 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-900/30 rounded-2xl flex gap-3 animate-in slide-in-from-bottom-2">
                  <span className="text-info-600 dark:text-info-400 text-lg">ℹ️</span>
                  <div className="text-xs text-info-800 dark:text-info-200">
                    <strong className="block mb-1 text-sm font-bold">Nouveau joueur</strong>
                    Aucun joueur existant trouvé avec ce nom. Vous pouvez procéder à l'inscription.
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={async () => {
                  await updateMessageStatus(selectedMessage.id, "archive");
                  setSelectedMessage(null);
                }}
                className="w-full sm:w-auto rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-2.5 text-sm font-bold text-error-600 shadow-sm hover:bg-error-50 hover:border-error-200 dark:hover:bg-error-900/20 dark:hover:border-error-900/50 transition-all"
              >
                Refuser
              </button>
              
              {selectedMessage.type_message === "detection" ? (
                <button
                  onClick={async () => {
                    await updateMessageStatus(selectedMessage.id, "inscrit");
                    setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, statut: "inscrit" as any } : m));
                    setSelectedMessage(null);
                  }}
                  className="w-full sm:w-auto rounded-xl bg-[#107C41] px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-green-500/25 hover:bg-[#0c5e31] transition-all"
                >
                  Enregistrer
                </button>
              ) : verificationResult.status === "not_verified" ? (
                <button
                  onClick={handleVerifyPlayer}
                  className="w-full sm:w-auto rounded-xl bg-gray-800 px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-gray-500/25 hover:bg-gray-700 transition-all"
                >
                  Vérifier
                </button>
              ) : verificationResult.status === "found_missing_data" ? (
                <button
                  onClick={() => {
                    router.push(`/joueurs?editPlayerId=${verificationResult.playerId}&demandeId=${selectedMessage.id}`);
                    setSelectedMessage(null);
                  }}
                  className="w-full sm:w-auto rounded-xl bg-warning-500 px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-warning-500/25 hover:bg-warning-600 hover:-translate-y-0.5 transition-all"
                >
                  Remplir champs
                </button>
              ) : (
                <button
                  onClick={() => {
                    router.push(`/joueurs/nouveau?demandeId=${selectedMessage.id}`);
                    setSelectedMessage(null);
                  }}
                  className="w-full sm:w-auto rounded-xl bg-brand-500 px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 hover:-translate-y-0.5 transition-all"
                >
                  Accepter
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DOWNLOAD MODAL */}
      {downloadTarget && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-6">
          <div className="my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
               <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Téléchargements</h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Sélectionnez le document à télécharger</p>
               </div>
               <button onClick={() => setDownloadTarget(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">✕</button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4 bg-gray-50/30 dark:bg-white/[0.01]">
               <button 
                  onClick={() => window.open(
                    downloadTarget.type_message === "stagiaire" ? `/api/stages/pdf?id=${downloadTarget.id}` : 
                    downloadTarget.type_message === "detection" ? `/api/detections/pdf?id=${downloadTarget.id}` :
                    `/api/demandes/pdf?id=${downloadTarget.id}`, 
                    "_blank"
                  )}
                  className="w-full group relative overflow-hidden p-5 bg-gradient-to-br from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-800 rounded-2xl transition-all flex items-center gap-4 text-left shadow-lg hover:shadow-brand-500/25 hover:-translate-y-0.5"
               >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                     <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </div>
                  <div className="flex-1 relative z-10">
                     <div className="text-base font-bold text-white mb-0.5">Dossier d'inscription (PDF)</div>
                     <div className="text-xs text-brand-100 font-medium">Fiche auto-générée avec toutes les réponses</div>
                  </div>
               </button>

               {isLoadingDocs ? (
                  <div className="flex flex-col items-center justify-center p-10 space-y-4 text-gray-400">
                     <div className="h-8 w-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                     <span className="text-xs font-bold uppercase tracking-widest text-brand-500">Chargement des pièces jointes...</span>
                  </div>
               ) : downloadTarget.type_message === "detection" ? (
                  <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                     <div className="flex items-center gap-2 mb-4">
                       <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Documents de Détection</span>
                       <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                     </div>
                     <div className="grid gap-3">
                      {[
                        { key: "fiche_9e", label: "FICHE 9ÈME" },
                        { key: "carnet_vaccination", label: "CARNET DE VACCINATION" },
                        { key: "acte_naissance", label: "ACTE DE NAISSANCE" },
                        { key: "piece_identite_parent", label: "PIÈCE D'IDENTITÉ PARENT" },
                        { key: "photo_recente", label: "PHOTO RÉCENTE" },
                        { key: "document_photo_id", label: "PHOTO D'IDENTITÉ" },
                      ].map((slot) => {
                        const existingDoc = downloadDocs.find(d => d.doc_key === slot.key);
                        const isUploading = uploadingDocKey === slot.key;

                        if (existingDoc) {
                          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uivlcmvofzoyzhtjntlp.supabase.co";
                          const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";
                          const publicUrl = existingDoc.path?.startsWith("http") ? existingDoc.path : `${supabaseUrl}/storage/v1/object/public/${bucket}/${existingDoc.path}`;

                          return (
                            <div key={slot.key} className="flex items-center gap-2">
                              <button 
                                 type="button"
                                 onClick={() => window.open(publicUrl, "_blank")}
                                 className="flex-1 group p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-all flex items-center gap-4 text-left shadow-xs hover:shadow-sm"
                              >
                                 <div className="h-10 w-10 shrink-0 rounded-lg bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                 </div>
                                 <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                       {slot.label}
                                    </div>
                                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 truncate flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                      Disponible
                                    </div>
                                 </div>
                              </button>
                              <label className="cursor-pointer p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl text-gray-500 dark:text-gray-400 transition-colors" title="Remplacer ce document">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleUploadDoc(slot.key, e.target.files[0]);
                                    }
                                  }}
                                />
                                {isUploading ? (
                                  <div className="h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                )}
                              </label>
                            </div>
                          );
                        }

                        return (
                          <div key={slot.key} className="p-4 bg-gray-50 dark:bg-gray-800/30 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-between gap-4">
                            <div>
                              <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{slot.label}</div>
                              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Non fourni (Manquant)</div>
                            </div>
                            <label className="cursor-pointer shrink-0 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadDoc(slot.key, e.target.files[0]);
                                  }
                                }}
                              />
                              {isUploading ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                  Ajouter
                                </>
                              )}
                            </label>
                          </div>
                        );
                      })}
                     </div>
                  </div>
               ) : downloadDocs.length > 0 ? (
                  <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                     <div className="flex items-center gap-2 mb-4">
                       <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pièces jointes originales</span>
                       <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                     </div>
                     <div className="grid gap-3">
                      {downloadDocs.map((doc) => {
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uivlcmvofzoyzhtjntlp.supabase.co";
                        const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";
                        const publicUrl = doc.path?.startsWith("http") ? doc.path : `${supabaseUrl}/storage/v1/object/public/${bucket}/${doc.path}`;
                        
                        const docLabels: Record<string, string> = {
                          document_photo_id: "PHOTO D'IDENTITÉ",
                          photo_recente: "PHOTO RÉCENTE",
                          fiche_9e: "FICHE 9ÈME",
                          carnet_vaccination: "CARNET DE VACCINATION",
                          acte_naissance: "ACTE DE NAISSANCE",
                          piece_identite_parent: "PIÈCE D'IDENTITÉ PARENT",
                          document_birth_certificate: "DOCUMENT BIRTH CERTIFICATE",
                          document_parent_id: "DOCUMENT PARENT ID",
                        };
                        const label = docLabels[doc.doc_key] || doc.doc_key?.replace(/_/g, " ").toUpperCase() || "DOCUMENT";
                        
                        return (
                          <button 
                             key={doc.id}
                             onClick={() => window.open(publicUrl, "_blank")}
                             className="w-full group p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-all flex items-center gap-4 text-left shadow-xs hover:shadow-sm"
                          >
                             <div className="h-10 w-10 shrink-0 rounded-lg bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                             </div>
                             <div className="flex-1 overflow-hidden">
                                <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                   {label}
                                </div>
                                <div className="text-[11px] font-medium text-gray-500 mt-0.5 truncate">{doc.path?.split('/').pop() || "Fichier joint"}</div>
                             </div>
                          </button>
                        );
                      })}
                     </div>
                  </div>
               ) : (
                  <div className="text-center p-6 bg-gray-100 dark:bg-gray-800/50 rounded-2xl text-xs text-gray-500 italic">
                     Aucune pièce jointe supplémentaire
                  </div>
               )}
            </div>
          </div>
        </div>,
        document.body
      )}
      <ConfirmComponent />
    </div>
  );
}
