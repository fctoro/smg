"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";

import { Skeleton } from "@/components/ui/skeleton/Skeleton";

export default function DashboardSettingsPage() {
  const {
    config,
    hydrated,
    setWidgetEnabled,
    setPlayerColumnEnabled,
    resetConfig,
  } = useDashboardConfig();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Parametres Dashboard" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Widgets affiches
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Activez ou desactivez les blocs du dashboard principal.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {config.widgets.map((widget) => (
            <label
              key={widget.key}
              className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {widget.label}
              </span>
              <input
                type="checkbox"
                checked={widget.enabled}
                onChange={(event) =>
                  setWidgetEnabled(widget.key, event.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Colonnes table Joueurs
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choisissez les colonnes visibles dans les tableaux Joueurs.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {config.playerColumns.map((column) => (
            <label
              key={column.key}
              className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {column.label}
              </span>
              <input
                type="checkbox"
                checked={column.enabled}
                onChange={(event) =>
                  setPlayerColumnEnabled(column.key, event.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {hydrated
            ? "Configuration sauvegardee automatiquement (localStorage)."
            : <Skeleton className="h-4 w-56 inline-block" />}
        </p>
        <button
          type="button"
          onClick={resetConfig}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Reinitialiser
        </button>
      </div>
    </div>
  );
}
