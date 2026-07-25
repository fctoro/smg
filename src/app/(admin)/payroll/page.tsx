"use client";

import React, { useState, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { PayrollRecord } from "@/types/club";
import { addPayrollToSupabase } from "@/lib/club/supabase-crud";

// Professional SVG Icons
const Icons = {
  Wallet: () => (
    <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v10m-3-7h5.5a2.5 2.5 0 010 5H9" />
    </svg>
  ),
  CheckBadge: () => (
    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ClockPending: () => (
    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ChartTrend: () => (
    <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Printer: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
};

const MONTHS_LIST = [
  { value: "all", label: "Tous les mois" },
  { value: "01", label: "Janvier" },
  { value: "02", label: "Février" },
  { value: "03", label: "Mars" },
  { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },
  { value: "08", label: "Août" },
  { value: "09", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

// Generate years from site creation (2012) up to current year (2026)
const START_YEAR = 2012;
const CURRENT_YEAR = new Date().getFullYear() || 2026;
const YEARS_LIST = Array.from(
  { length: CURRENT_YEAR - START_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
);

const formatMonthYearDisplay = (monthStr: string) => {
  if (!monthStr || monthStr === "all") return "Global";
  const [year, month] = monthStr.split("-");
  const monthObj = MONTHS_LIST.find((m) => m.value === month);
  return monthObj ? `${monthObj.label} ${year}` : monthStr;
};

export default function PayrollPage() {
  const { employees, payrollRecords, setPayrollRecords } = useClubData();

  // Filters
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");
  const currentYearStr = String(CURRENT_YEAR);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedSlip, setSelectedSlip] = useState<PayrollRecord | null>(null);

  // Modal form state
  const [formData, setFormData] = useState<{
    employeId: string;
    annee: string;
    mois: string;
    salaireBase: number;
    bonus: number;
    deductions: number;
    statut: "paye" | "en_attente";
    modePaiement: "virement" | "especes" | "chèque" | "mobile";
    notes: string;
    file: File | null;
  }>({
    employeId: "",
    annee: "2026",
    mois: "07",
    salaireBase: 500,
    bonus: 0,
    deductions: 0,
    statut: "paye",
    modePaiement: "virement",
    notes: "",
    file: null,
  });

  // Filtered List
  const filteredRecords = useMemo(() => {
    return payrollRecords.filter((rec) => {
      const [recYear, recMonth] = rec.mois ? rec.mois.split("-") : ["", ""];

      const matchYear = selectedYear === "all" || recYear === selectedYear;
      const matchMonth = selectedMonth === "all" || recMonth === selectedMonth;

      const fullName = `${rec.employePrenom} ${rec.employeNom} ${rec.fonction}`.toLowerCase();
      const matchSearch = fullName.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || rec.statut === statusFilter;

      return matchYear && matchMonth && matchSearch && matchStatus;
    });
  }, [payrollRecords, selectedYear, selectedMonth, searchTerm, statusFilter]);

  // KPI Calculations based on active filters
  const kpis = useMemo(() => {
    const totalPayroll = filteredRecords.reduce((sum, r) => sum + r.netAPayer, 0);
    const paidCount = filteredRecords.filter((r) => r.statut === "paye").length;
    const pendingCount = filteredRecords.filter((r) => r.statut === "en_attente").length;
    const avgSalary = filteredRecords.length > 0 ? totalPayroll / filteredRecords.length : 0;

    return {
      totalPayroll,
      paidCount,
      pendingCount,
      avgSalary,
      totalCount: filteredRecords.length,
    };
  }, [filteredRecords]);

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeId) return;

    const targetEmp = employees.find((emp) => emp.id === formData.employeId);
    if (!targetEmp) return;

    const net = formData.salaireBase + formData.bonus - formData.deductions;
    const targetMois = `${formData.annee}-${formData.mois}`;

    const recordData: Omit<PayrollRecord, "id"> = {
      employeId: targetEmp.id,
      employeNom: targetEmp.nom,
      employePrenom: targetEmp.prenom,
      fonction: targetEmp.fonction || targetEmp.role || "Employé",
      mois: targetMois,
      salaireBase: formData.salaireBase,
      bonus: formData.bonus,
      deductions: formData.deductions,
      netAPayer: net,
      statut: formData.statut,
      datePaiement: formData.statut === "paye" ? new Date().toISOString().split("T")[0] : undefined,
      modePaiement: formData.modePaiement,
      notes: formData.notes,
    };

    try {
      const insertedData = await addPayrollToSupabase(recordData, formData.file || undefined);
      
      const newRecord: PayrollRecord = {
        id: insertedData.Id || `pay-${Date.now()}`,
        employeId: recordData.employeId,
        employeNom: recordData.employeNom,
        employePrenom: recordData.employePrenom,
        fonction: recordData.fonction,
        mois: recordData.mois,
        salaireBase: recordData.salaireBase,
        bonus: recordData.bonus,
        deductions: recordData.deductions,
        netAPayer: recordData.netAPayer,
        statut: recordData.statut,
        datePaiement: typeof recordData.datePaiement === 'string' ? recordData.datePaiement : undefined,
        modePaiement: recordData.modePaiement,
        notes: recordData.notes,
        pieceJointe: insertedData.PieceJointe,
      };

      setPayrollRecords((prev) => [newRecord, ...prev]);
      setShowModal(false);
      setFormData({
        employeId: "",
        annee: "2026",
        mois: "07",
        salaireBase: 500,
        bonus: 0,
        deductions: 0,
        statut: "paye",
        modePaiement: "virement",
        notes: "",
        file: null,
      });
    } catch (error) {
      alert("Erreur lors de l'enregistrement du bulletin de paie.");
    }
  };

  const handleToggleStatus = (id: string) => {
    setPayrollRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === id) {
          const nextStatut = rec.statut === "paye" ? "en_attente" : "paye";
          return {
            ...rec,
            statut: nextStatut,
            datePaiement: nextStatut === "paye" ? new Date().toISOString().split("T")[0] : undefined,
          };
        }
        return rec;
      })
    );
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette fiche de paie ?")) {
      setPayrollRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handlePrintSlip = (record: PayrollRecord) => {
    setSelectedSlip(record);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Payroll / Gestion Historique des Salaires" />

      {/* KPI Section with Professional Icons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 dark:border-brand-900/50 dark:bg-brand-500/10">
              <Icons.Wallet />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Masse Salariale
              </p>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                ${kpis.totalPayroll.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-500/10">
              <Icons.CheckBadge />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Bulletins Payés
              </p>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {kpis.paidCount} / {kpis.totalCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 dark:border-amber-900/50 dark:bg-amber-500/10">
              <Icons.ClockPending />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Paiements En Attente
              </p>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">{kpis.pendingCount}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 dark:border-blue-900/50 dark:bg-blue-500/10">
              <Icons.ChartTrend />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Salaire Moyen
              </p>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                ${Math.round(kpis.avgSalary).toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Historical Filtering Controls (2012 - Present) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <Icons.Calendar />
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Année:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none dark:text-white"
            >
              <option value="all">Toutes les années (2012 - {CURRENT_YEAR})</option>
              {YEARS_LIST.map((year) => (
                <option key={year} value={String(year)}>
                  Année {year}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <Icons.Filter />
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Mois:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none dark:text-white"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center">
            <span className="absolute left-3">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Rechercher employé, poste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-xs focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-xs focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="paye">Payé</option>
            <option value="en_attente">En attente</option>
          </select>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 focus:outline-none active:scale-95"
        >
          <Icons.Plus />
          <span>Nouveau Bulletin</span>
        </button>
      </div>

      {/* Payroll Records Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50/80 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4 font-bold">Employé & Fonction</th>
                <th className="px-6 py-4 font-bold">Période (Mois/Année)</th>
                <th className="px-6 py-4 font-bold">Salaire Base</th>
                <th className="px-6 py-4 font-bold">Primes</th>
                <th className="px-6 py-4 font-bold">Retenues</th>
                <th className="px-6 py-4 font-bold">Net à Payer</th>
                <th className="px-6 py-4 font-bold">Statut</th>
                <th className="px-6 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icons.Calendar />
                      <p className="font-semibold">Aucun enregistrement trouvé pour ces critères de recherche.</p>
                      <p className="text-xs text-gray-400">Essayez de sélectionner "Toutes les années" ou un autre mois.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {record.employePrenom} {record.employeNom}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{record.fonction}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {formatMonthYearDisplay(record.mois)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">
                      ${record.salaireBase.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      +${record.bonus.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-rose-600 dark:text-rose-400">
                      -${record.deductions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-gray-900 dark:text-white">
                      ${record.netAPayer.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(record.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                          record.statut === "paye"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 hover:bg-amber-200"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            record.statut === "paye" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        {record.statut === "paye" ? "Payé" : "En attente"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePrintSlip(record)}
                          title="Imprimer Bulletin de Paie"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Icons.Printer />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          title="Supprimer"
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Icons.Trash />
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

      {/* Add Payroll Record Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Nouveau Bulletin de Paie
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePayroll} className="space-y-4">
              {/* Year & Month Picker in Modal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Année
                  </label>
                  <select
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {YEARS_LIST.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Mois
                  </label>
                  <select
                    value={formData.mois}
                    onChange={(e) => setFormData({ ...formData, mois: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {MONTHS_LIST.filter((m) => m.value !== "all").map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Sélectionner l'Employé
                </label>
                <select
                  required
                  value={formData.employeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const emp = employees.find((x) => x.id === empId);
                    setFormData((prev) => ({
                      ...prev,
                      employeId: empId,
                      salaireBase: emp?.salaire || 500,
                    }));
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">-- Choisir un employé --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.prenom} {emp.nom} ({emp.fonction || "Employé"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Salaire Base ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.salaireBase}
                    onChange={(e) =>
                      setFormData({ ...formData, salaireBase: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Bonus ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Retenues ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.deductions}
                    onChange={(e) =>
                      setFormData({ ...formData, deductions: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Statut du Paiement
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) =>
                      setFormData({ ...formData, statut: e.target.value as "paye" | "en_attente" })
                    }
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="paye">Payé</option>
                    <option value="en_attente">En attente</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Mode de Règlement
                  </label>
                  <select
                    value={formData.modePaiement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modePaiement: e.target.value as "virement" | "especes" | "chèque" | "mobile",
                      })
                    }
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="virement">Virement bancaire</option>
                    <option value="especes">Espèces</option>
                    <option value="chèque">Chèque</option>
                    <option value="mobile">MonCash / Mobile</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Notes / Remarques
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Pièce Jointe (PDF, JPG, PNG)
                </label>
                <input
                  type="file"
                  accept=".pdf, .jpg, .jpeg, .png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({ ...formData, file });
                    }
                  }}
                  className="w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800 file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Pay Slip Template */}
      {selectedSlip && (
        <div className="hidden print:block print:p-8">
          <div className="mx-auto max-w-2xl rounded-xl border border-gray-300 p-8 text-black">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <div>
                <h1 className="text-2xl font-bold uppercase text-brand-600">FC TORO</h1>
                <p className="text-xs font-medium">Académie de Football SMG FC TORO</p>
                <p className="text-xs text-gray-600">Port-au-Prince, Haïti</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold uppercase">BULLETIN DE PAIE</h2>
                <p className="text-xs font-semibold">Période: {formatMonthYearDisplay(selectedSlip.mois)}</p>
                <p className="text-xs text-gray-600">Réf: {selectedSlip.id}</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-xs">
              <div>
                <p className="font-bold text-gray-700 uppercase">Informations Employé</p>
                <p className="mt-1 text-sm font-bold">
                  {selectedSlip.employePrenom} {selectedSlip.employeNom}
                </p>
                <p>Fonction: {selectedSlip.fonction}</p>
                <p>ID Employé: {selectedSlip.employeId}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-700 uppercase">Règlement</p>
                <p className="mt-1">Date: {selectedSlip.datePaiement || "En attente"}</p>
                <p>Mode: {selectedSlip.modePaiement}</p>
                <p>Statut: {selectedSlip.statut === "paye" ? "PAYÉ" : "EN ATTENTE"}</p>
              </div>
            </div>

            <table className="mb-6 w-full border text-left text-xs">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-2.5 font-bold">Description</th>
                  <th className="p-2.5 text-right font-bold">Montant ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2.5">Salaire de Base</td>
                  <td className="p-2.5 text-right font-medium">${selectedSlip.salaireBase.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2.5">Primes / Extra</td>
                  <td className="p-2.5 text-right font-medium text-emerald-600">+${selectedSlip.bonus.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2.5">Déductions / Retenues</td>
                  <td className="p-2.5 text-right font-medium text-rose-600">-${selectedSlip.deductions.toFixed(2)}</td>
                </tr>
                <tr className="border-t bg-gray-50 font-bold">
                  <td className="p-2.5 text-sm">NET À PAYER</td>
                  <td className="p-2.5 text-right text-sm font-extrabold">${selectedSlip.netAPayer.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-12 flex justify-between border-t pt-8 text-xs">
              <div>
                <p className="font-semibold">Signature Employé:</p>
                <div className="mt-8 w-40 border-b"></div>
              </div>
              <div className="text-right">
                <p className="font-semibold">Pour la Direction FC TORO:</p>
                <div className="ml-auto mt-8 w-40 border-b"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
