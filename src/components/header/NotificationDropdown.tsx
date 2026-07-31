"use client";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { fetchSiteMessages } from "@/lib/club/supabase-demandes";
import { SiteMessage } from "@/types/club";

const formatTimeAgo = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return d.toLocaleDateString("fr-FR");
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchSiteMessages();
        setMessages(data || []);
      } catch (err) {
        console.error("Error fetching site messages:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Poll every 30s for new demandes
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const newCount = messages.filter((m) => m.statut === "nouveau").length;
  const recentMessages = messages.slice(0, 7);

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        {newCount > 0 && (
          <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {newCount}
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0 z-99999"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h5 className="text-base font-bold text-gray-900 dark:text-white">
              Demandes & Notifications
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {newCount > 0 ? `${newCount} nouvelle(s) demande(s)` : "Toutes les demandes à jour"}
            </p>
          </div>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col flex-1 overflow-y-auto custom-scrollbar gap-1">
          {loading ? (
            <li className="p-6 text-center text-xs text-gray-500">Chargement des demandes...</li>
          ) : recentMessages.length === 0 ? (
            <li className="p-6 text-center text-xs text-gray-500">Aucune demande reçue.</li>
          ) : (
            recentMessages.map((msg) => {
              const isNew = msg.statut === "nouveau";
              const typeLabel =
                msg.type_message === "inscription_joueur"
                  ? "Inscription joueur"
                  : msg.type_message === "stagiaire"
                  ? "Candidature stage"
                  : msg.type_message === "devenir_fan"
                  ? "Demande fan"
                  : "Message contact";

              return (
                <li key={msg.id}>
                  <DropdownItem
                    tag="a"
                    href="/demandes/inscriptions"
                    onItemClick={closeDropdown}
                    className={`flex gap-3 rounded-lg border-b border-gray-100 p-2.5 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                      isNew ? "bg-brand-50/40 dark:bg-brand-500/10" : ""
                    }`}
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white font-bold text-sm shadow-xs">
                      {msg.contact_nom ? msg.contact_nom.charAt(0).toUpperCase() : "D"}
                    </span>

                    <span className="block min-w-0 flex-1">
                      <span className="mb-0.5 flex items-center justify-between gap-1 text-theme-sm text-gray-900 dark:text-white font-medium truncate">
                        <span className="truncate">
                          {msg.contact_nom}
                          {msg.metadata?.enfant_nom ? ` (Enfant: ${msg.metadata.enfant_nom})` : ""}
                        </span>
                        {isNew && (
                          <span className="shrink-0 rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                            Nouveau
                          </span>
                        )}
                      </span>

                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                        {typeLabel}
                      </span>

                      <span className="block text-[11px] text-gray-400">
                        {formatTimeAgo(msg.created_at)}
                      </span>
                    </span>
                  </DropdownItem>
                </li>
              );
            })
          )}
        </ul>

        <Link
          href="/demandes/inscriptions"
          onClick={closeDropdown}
          className="block px-4 py-2.5 mt-3 text-xs font-semibold text-center text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors shadow-xs"
        >
          Voir toutes les demandes ({messages.length})
        </Link>
      </Dropdown>
    </div>
  );
}
