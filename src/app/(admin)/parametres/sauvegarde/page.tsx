"use client";

import React, { useState, useEffect, useRef } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useUserRole } from "@/context/UserRoleContext";
import { getSystemStatsAction, exportFullSystemBackupAction, restoreFullSystemBackupAction } from "@/app/actions/club";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";
import Link from "next/link";

interface TableStat {
  label: string;
  count: number;
  table: string;
}

export default function BackupPage() {
  const { isSuperAdmin, userEmail } = useUserRole();
  const [stats, setStats] = useState<Record<string, TableStat>>({});
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<any | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState<string>("");
  const [restoreReport, setRestoreReport] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await getSystemStatsAction();
      if (res.success && res.counts) {
        setStats(res.counts);
        setTotalRecords(res.total || 0);
      }
    } catch (err) {
      console.error("Erreur chargement stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchStats();
    }
  }, [isSuperAdmin]);

  // Export & Download Backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const res = await exportFullSystemBackupAction(userEmail);
      if (!res.success || !res.payload) {
        throw new Error(res.error || "Échec de l'exportation du backup.");
      }

      const backupJson = JSON.stringify(res.payload, null, 2);
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:T]/g, "-").slice(0, 19);
      const fileName = `backup-fctoro-${dateStr}.json`;
      const blob = new Blob([backupJson], { type: "application/json;charset=utf-8" });

      // Check if File System Access API is supported (lets user choose Desktop directly)
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "Fichier de sauvegarde FC TORO (JSON)",
                accept: { "application/json": [".json"] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();

          setToast({
            message: "✅ Sauvegarde enregistrée avec succès sur votre ordinateur !",
            type: "success",
          });
          setIsExporting(false);
          return;
        } catch (pickerError: any) {
          if (pickerError.name === "AbortError") {
            setIsExporting(false);
            return;
          }
        }
      }

      // Fallback: standard automatic download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({
        message: "✅ Fichier de sauvegarde téléchargé avec succès !",
        type: "success",
      });
    } catch (error: any) {
      console.error("Erreur sauvegarde:", error);
      setToast({
        message: `❌ Erreur : ${error?.message || "Impossible d'exporter la sauvegarde."}`,
        type: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setRestoreReport(null);
    setRestoreConfirmText("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.metadata || !json.data) {
          throw new Error("Format de fichier non reconnu. Il manque les métadonnées ou les données de tables.");
        }
        setParsedBackup(json);
      } catch (err: any) {
        setToast({
          message: `❌ Fichier invalide : ${err?.message || "Erreur de lecture JSON"}`,
          type: "error",
        });
        setSelectedFile(null);
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute restore
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;
    if (restoreConfirmText.trim().toUpperCase() !== "RESTAURER") {
      setToast({
        message: "Veuillez taper 'RESTAURER' dans le champ de confirmation.",
        type: "error",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const res = await restoreFullSystemBackupAction(parsedBackup);
      if (!res.success) {
        throw new Error(res.error || "Erreur lors de la restauration.");
      }

      setRestoreReport(res.report);
      setToast({
        message: "🎉 Restauration du système effectuée avec succès !",
        type: "success",
      });
      fetchStats();
    } catch (error: any) {
      console.error("Erreur restauration:", error);
      setToast({
        message: `❌ Échec restauration : ${error?.message || "Une erreur est survenue"}`,
        type: "error",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Sauvegarde Système" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 mb-4">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3.5a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200">Accès Réservé au Super Administrateur</h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300 max-w-md mx-auto">
            La sauvegarde et la restauration intégrale du système sont des opérations sensibles réservées exclusivement au compte Super Administrateur.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <PageBreadcrumb pageTitle="Sauvegarde & Sécurité Système" />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 p-6 text-white shadow-lg dark:border-brand-900">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
                🛡️ Espace Superadmin
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 text-emerald-200 px-3 py-1 text-xs font-medium backdrop-blur-xs">
                ● Base connectée
              </span>
            </div>
            <h1 className="text-2xl font-bold">Sauvegarde & Restauration Totale</h1>
            <p className="mt-1 text-sm text-brand-100 max-w-2xl">
              Exportez l'intégralité de la base de données du club vers votre ordinateur en un clic, ou restaurez le système à partir d'une archive sécurisée.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStats}
            disabled={isLoadingStats}
            className="self-start md:self-auto inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 backdrop-blur-xs border border-white/20 transition-all disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${isLoadingStats ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser les statistiques
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 1: Export Card (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Exporter la Sauvegarde Totale
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enregistre 100% des données sous forme de fichier structuré .JSON
                </p>
              </div>
            </div>
          </div>

          {/* Real-time stats grid */}
          <div className="my-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Données prêtes à être sauvegardées
              </span>
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                Total : {totalRecords.toLocaleString()} enregistrements
              </span>
            </div>

            {isLoadingStats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {Object.entries(stats).map(([key, item]) => (
                  <div
                    key={key}
                    className="flex flex-col rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 dark:border-gray-800 dark:bg-gray-800/40"
                  >
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                      {item.label}
                    </span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand-700 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Génération de la sauvegarde en cours...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Télécharger la Sauvegarde Complète (Bureau / PC)</span>
                </>
              )}
            </button>

            <div className="flex items-start gap-2 rounded-lg bg-blue-50/80 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
              <span className="text-sm">💡</span>
              <p>
                <strong>Conseil de sécurité :</strong> Il est recommandé de télécharger une copie de sauvegarde sur votre ordinateur au moins une fois par semaine ou avant toute modification massive.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Restore Card (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Restaurer le Système
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Réimporter un fichier .JSON de sauvegarde
              </p>
            </div>
          </div>

          <div className="my-5 space-y-4">
            {/* Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-6 text-center hover:border-brand-500 hover:bg-brand-50/20 dark:border-gray-700 dark:bg-gray-800/40 transition-colors cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-500 shadow-xs group-hover:scale-110 group-hover:text-brand-600 dark:bg-gray-800 dark:text-gray-400 transition-all">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="mt-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {selectedFile ? selectedFile.name : "Cliquez pour sélectionner un fichier de sauvegarde (.JSON)"}
              </p>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} Ko` : "Fichiers .json exportés depuis FC TORO"}
              </p>
            </div>

            {/* Parsed summary preview */}
            {parsedBackup && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Détails du fichier analysé
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    v{parsedBackup.metadata?.version || "1.0"}
                  </span>
                </div>
                <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p>📅 <strong>Date :</strong> {parsedBackup.metadata?.timestamp ? new Date(parsedBackup.metadata.timestamp).toLocaleString("fr-FR") : "Inconnue"}</p>
                  <p>👤 <strong>Auteur :</strong> {parsedBackup.metadata?.exportedBy || "Superadmin"}</p>
                  <p>📊 <strong>Total enregistrements :</strong> {parsedBackup.metadata?.totalRecords?.toLocaleString() || "N/A"}</p>
                </div>

                {parsedBackup.metadata?.summary && (
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/30">
                    <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">Détails des données :</p>
                    <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1 text-[11px] text-amber-800 dark:text-amber-300">
                      {Object.entries(parsedBackup.metadata.summary).filter(([_, count]: [string, any]) => Number(count) > 0).map(([table, count]: [string, any]) => (
                        <div key={table} className="flex justify-between border-b border-amber-200/40 pb-0.5">
                          <span>{table}</span>
                          <span className="font-semibold">{Number(count).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/30">
                  <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    Pour confirmer, tapez <strong>RESTAURER</strong> ci-dessous :
                  </label>
                  <input
                    type="text"
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                    placeholder="RESTAURER"
                    className="h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-amber-950 shadow-xs focus:ring-2 focus:ring-amber-500 dark:border-amber-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Restore report */}
            {restoreReport && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <span>✅ Rapport de restauration :</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-emerald-800 dark:text-emerald-300">
                  {Object.entries(restoreReport).map(([table, stat]: [string, any]) => (
                    <div key={table} className="flex justify-between border-b border-emerald-100 dark:border-emerald-900/30 pb-0.5">
                      <span>{table}</span>
                      <span className="font-semibold">{stat.restored} / {stat.total} restaurés</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              disabled={!parsedBackup || restoreConfirmText.trim().toUpperCase() !== "RESTAURER" || isRestoring}
              onClick={handleExecuteRestore}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-700 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRestoring ? (
                <>
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Restauration en cours...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Lancer la Restauration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
