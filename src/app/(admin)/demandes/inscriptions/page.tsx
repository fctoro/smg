"use client";

import React, { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { fetchSiteMessages, updateMessageStatus, deleteMessage } from "@/lib/club/supabase-demandes";
import { SiteMessage } from "@/types/club";
import { DownloadIcon, EyeIcon, TrashBinIcon } from "@/icons";

// Placeholder icon for document
const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function BoiteDeReception() {
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"contact_general" | "inscription_joueur" | "devenir_fan" | "stagiaire">("inscription_joueur");
  const [yearFilter, setYearFilter] = useState("all");
  
  // Modal states
  const [selectedMessage, setSelectedMessage] = useState<SiteMessage | null>(null);
  const [modalMode, setModalMode] = useState<"details" | "documents">("details");

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

      if (yearFilter !== "all") {
        const year = new Date(m.created_at).getFullYear().toString();
        if (year !== yearFilter) return false;
      }
      return true;
    });
  }, [messages, activeTab, yearFilter]);

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

  const handleDelete = async (id: string, metadata?: any) => {
    if (!confirm("Voulez-vous vraiment supprimer cette demande ?")) return;
    try {
      setMessages(prev => prev.filter(m => m.id !== id));
      await deleteMessage(id, metadata);
    } catch (err) {
      loadMessages();
    }
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "contact_general": return "Messages";
      case "inscription_joueur": return "Inscriptions Joueur";
      case "devenir_fan": return "Devenir Fan";
      case "stagiaire": return "Stagiaire";
      default: return "";
    }
  };

  const getTabSubtitle = (tab: string) => {
    switch (tab) {
      case "contact_general": return "Consultez et répondez aux messages généraux.";
      case "inscription_joueur": return "Consultez et gérez les inscriptions des nouveaux joueurs.";
      case "devenir_fan": return "Gérez les nouvelles demandes de supporters et fans.";
      case "stagiaire": return "Gérez les candidatures pour les stages.";
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
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Boîte de réception" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {/* TABS REMOVED */}

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{getTabTitle(activeTab)}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{getTabSubtitle(activeTab)}</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              className="w-full md:w-auto rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="all">Toutes les années</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
            <button className="flex items-center gap-2 rounded-lg bg-success-500 px-4 py-2 text-sm font-medium text-white hover:bg-success-600">
              <DownloadIcon />
              Exporter Excel
            </button>
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
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Chargement des données...</td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Aucune demande trouvée pour cette catégorie.</td>
                </tr>
              ) : (
                filteredMessages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-4 align-top">
                      <button 
                        onClick={() => toggleStatus(msg.id, msg.statut, msg.metadata)}
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${
                        msg.statut === "nouveau"
                          ? "border-warning-500 text-warning-500"
                          : "border-success-500 text-success-500"
                      }`}>
                        {msg.statut}
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
                        {msg.contact_nom}
                        {msg.metadata?.enfant_nom && (
                          <span className="font-normal text-gray-500 dark:text-gray-400"> (Enfant: {msg.metadata.enfant_nom})</span>
                        )}
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
                        {(msg.type_message === "inscription_joueur" || msg.type_message === "stagiaire") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                msg.type_message === "stagiaire"
                                  ? `/api/stages/pdf?id=${msg.id}`
                                  : `/api/demandes/pdf?id=${msg.id}`,
                                "_blank"
                              );
                            }}
                            className="hover:text-primary-500 transition-colors"
                            title="Télécharger Dossier PDF"
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
                          className="hover:text-error-500 transition-colors" 
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
      </div>

      {/* MODAL */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <button 
              onClick={() => setSelectedMessage(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              ✕
            </button>
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              {modalMode === "details" ? "Détails de l'inscription" : "Documents attachés"}
            </h3>
            
            {modalMode === "details" && (
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/[0.02]">
                  <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">Contact (Parent/Tuteur)</h4>
                  <p><strong>Nom :</strong> {selectedMessage.contact_nom}</p>
                  <p><strong>Email :</strong> {selectedMessage.contact_email}</p>
                  <p><strong>Téléphone :</strong> {selectedMessage.contact_telephone || "Non renseigné"}</p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/[0.02]">
                  <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">Informations Joueur</h4>
                  <p><strong>Nom de l'enfant :</strong> {selectedMessage.metadata?.enfant_nom || "N/A"}</p>
                  <div className="mt-2 text-gray-600 dark:text-gray-400">
                    {selectedMessage.contenu}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => toggleStatus(selectedMessage.id, selectedMessage.statut, selectedMessage.metadata)} className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600">
                    Basculer le statut ({selectedMessage.statut === "nouveau" ? "Marquer Lu" : "Marquer Nouveau"})
                  </button>
                </div>
              </div>
            )}

            {modalMode === "documents" && (
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <p className="mb-4">Récupération des documents depuis <code>player_registration_documents</code> pour l'ID: {selectedMessage.id}...</p>
                {/* We can fetch and display documents here in the future */}
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <DocumentIcon />
                  <p className="mt-2">Aucun document disponible pour le moment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
