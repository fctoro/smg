"use client";

import React from "react";
import { SEASON_MONTHS, formatCoveredMonthsLabel, getNextUnpaidMonths } from "@/lib/club/season";

interface MonthSelectorProps {
  pastPaidMonths?: string[];
  selectedMonths: string[];
  onChange: (months: string[]) => void;
  monthlyAmount?: number;
  currency?: "US" | "HTG";
  taux?: number;
  disabled?: boolean;
}

export function MonthSelector({
  pastPaidMonths = [],
  selectedMonths = [],
  onChange,
  monthlyAmount,
  currency = "US",
  taux = 0,
  disabled = false,
}: MonthSelectorProps) {
  const pastPaidSet = new Set(pastPaidMonths.map((m) => m.toLowerCase()));
  const selectedSet = new Set(selectedMonths.map((m) => m.toLowerCase()));

  // Mois restants non réglés dans le passé
  const unpaidMonths = SEASON_MONTHS.filter((m) => !pastPaidSet.has(m.toLowerCase()));

  const toggleMonth = (monthName: string) => {
    if (disabled) return;
    const isSelected = selectedSet.has(monthName.toLowerCase());
    let next: string[];

    if (isSelected) {
      next = selectedMonths.filter((m) => m.toLowerCase() !== monthName.toLowerCase());
    } else {
      next = [...selectedMonths, monthName];
    }

    // Garder l'ordre chronologique de la saison
    next.sort(
      (a, b) =>
        SEASON_MONTHS.indexOf(a as (typeof SEASON_MONTHS)[number]) -
        SEASON_MONTHS.indexOf(b as (typeof SEASON_MONTHS)[number])
    );
    onChange(next);
  };

  const selectCountUnpaid = (count: number) => {
    if (disabled) return;
    const next = getNextUnpaidMonths(pastPaidMonths, count);
    onChange(next);
  };

  const selectAllRemaining = () => {
    if (disabled) return;
    onChange(unpaidMonths);
  };

  const clearSelection = () => {
    if (disabled) return;
    onChange([]);
  };

  const coveredLabel = formatCoveredMonthsLabel(selectedMonths);
  const remainingCount = Math.max(0, 12 - pastPaidMonths.length - selectedMonths.length);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-gray-900/60">
      {/* En-tête avec compteur et actions rapides */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Choisir les mois à régler aujourd&apos;hui
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Cliquez sur un ou plusieurs mois spécifiques pour ce versement.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            {selectedMonths.length} mois sélectionné{selectedMonths.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Raccourcis de sélection rapide */}
      <div className="flex items-center gap-1.5 py-2.5 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
          Sélection rapide :
        </span>
        <button
          type="button"
          onClick={() => selectCountUnpaid(1)}
          disabled={disabled || unpaidMonths.length < 1}
          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          1er mois ({unpaidMonths[0] || "Aucun"})
        </button>
        {unpaidMonths.length >= 2 && (
          <button
            type="button"
            onClick={() => selectCountUnpaid(2)}
            disabled={disabled}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700 transition-colors"
          >
            + 2 mois
          </button>
        )}
        {unpaidMonths.length >= 3 && (
          <button
            type="button"
            onClick={() => selectCountUnpaid(3)}
            disabled={disabled}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700 transition-colors"
          >
            + 3 mois (Trimestre)
          </button>
        )}
        {unpaidMonths.length > 1 && (
          <button
            type="button"
            onClick={selectAllRemaining}
            disabled={disabled}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700 transition-colors"
          >
            Tout solder ({unpaidMonths.length} mois)
          </button>
        )}
        {selectedMonths.length > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Grille interactive des 12 mois de la saison */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
        {SEASON_MONTHS.map((monthName) => {
          const isPastPaid = pastPaidSet.has(monthName.toLowerCase());
          const isSelected = selectedSet.has(monthName.toLowerCase());

          if (isPastPaid) {
            return (
              <div
                key={monthName}
                title={`${monthName} : Déjà réglé lors d'un précédent versement`}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-emerald-300 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 select-none cursor-not-allowed opacity-85 shadow-sm text-center"
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <svg
                    className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{monthName}</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Déjà payé
                </span>
              </div>
            );
          }

          if (isSelected) {
            return (
              <button
                key={monthName}
                type="button"
                onClick={() => toggleMonth(monthName)}
                disabled={disabled}
                title={`Cliquer pour retirer ${monthName}`}
                className="flex flex-col items-center justify-center p-2 rounded-lg border-2 border-brand-600 bg-brand-600 text-white font-bold shadow-md ring-2 ring-brand-300 dark:ring-brand-700 hover:bg-brand-700 transition-all text-center cursor-pointer transform active:scale-95"
              >
                <div className="flex items-center gap-1 text-xs">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{monthName}</span>
                </div>
                <span className="text-[10px] text-brand-100 font-medium mt-0.5">
                  Sélectionné
                </span>
              </button>
            );
          }

          return (
            <button
              key={monthName}
              type="button"
              onClick={() => toggleMonth(monthName)}
              disabled={disabled}
              title={`Cliquer pour ajouter ${monthName} à ce paiement`}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-300 bg-white text-slate-800 hover:border-brand-500 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:bg-brand-950/30 transition-all text-center cursor-pointer shadow-sm transform active:scale-95"
            >
              <span className="text-xs font-semibold">{monthName}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                À payer
              </span>
            </button>
          );
        })}
      </div>

      {/* Résumé du choix */}
      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1.5">
        <div>
          {selectedMonths.length > 0 ? (
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Mois réglés par ce versement :{" "}
              <strong className="text-brand-600 dark:text-brand-400">{coveredLabel}</strong>{" "}
              ({selectedMonths.length} mois)
            </span>
          ) : (
            <span className="italic text-amber-600 dark:text-amber-400">
              Aucun mois sélectionné pour ce versement.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          {monthlyAmount && selectedMonths.length > 0 && (
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total mois :{" "}
              {currency === "HTG"
                ? `${(selectedMonths.length * monthlyAmount).toLocaleString("fr-FR")} HTG`
                : `$${(selectedMonths.length * monthlyAmount).toFixed(2)} USD`}
            </span>
          )}
          <span>
            Reste saison : <strong>{remainingCount} mois</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
