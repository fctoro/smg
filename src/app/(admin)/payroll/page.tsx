"use client";

import React, { useState, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { PayrollRecord } from "@/types/club";
import {
  DollarLineIcon,
  UserIcon,
  CheckCircleIcon,
  TimeIcon,
  DownloadIcon,
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
} from "@/icons";

export default function PayrollPage() {
  const { employees } = useClubData();

  const [selectedMonth, setSelectedMonth] = useState<string>("2026-07");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedSlip, setSelectedSlip] = useState<PayrollRecord | null>(null);

  // Generate initial mock payroll records from employees if not already generated
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => {
    return (employees || []).map((emp, index) => {
      const baseSalary = emp.salaire || 350 + (index % 4) * 150;
      const bonus = index % 3 === 0 ? 50 : 0;
      const deductions = 20;
      const net = baseSalary + bonus - deductions;
      return {
        id: `pay-${emp.id}-${index}`,
        employeId: emp.id,
        employeNom: emp.nom || "Nom",
        employePrenom: emp.prenom || "Prénom",
        fonction: emp.fonction || emp.role || "Employé FC Toro",
        mois: "2026-07",
        salaireBase: baseSalary,
        bonus: bonus,
        deductions: deductions,
        netAPayer: net,
        statut: index % 4 === 0 ? "en_attente" : "paye",
        datePaiement: index % 4 === 0 ? undefined : "2026-07-25",
        modePaiement: index % 2 === 0 ? "virement" : "especes",
        notes: "Salaire mensuel régulier",
      };
    });
  });

  // Modal form state for adding / editing
  const [formData, setFormData] = useState<{
    employeId: string;
    salaireBase: number;
    bonus: number;
    deductions: number;
    statut: "paye" | "en_attente";
    modePaiement: "virement" | "especes" | "chèque" | "mobile";
    notes: string;
  }>({
    employeId: "",
    salaireBase: 500,
    bonus: 0,
    deductions: 0,
    statut: "paye",
    modePaiement: "virement",
    notes: "",
  });

  // KPI Calculations
  const kpis = useMemo(() => {
    const monthRecords = payrollRecords.filter((r) => r.mois === selectedMonth);
    const totalPayroll = monthRecords.reduce((sum, r) => sum + r.netAPayer, 0);
    const paidCount = monthRecords.filter((r) => r.statut === "paye").length;
    const pendingCount = monthRecords.filter((r) => r.statut === "en_attente").length;
    const avgSalary = monthRecords.length > 0 ? totalPayroll / monthRecords.length : 0;

    return {
      totalPayroll,
      paidCount,
      pendingCount,
      avgSalary,
      totalCount: monthRecords.length,
    };
  }, [payrollRecords, selectedMonth]);

  // Filtered List
  const filteredRecords = useMemo(() => {
    return payrollRecords.filter((rec) => {
      const matchMonth = rec.mois === selectedMonth;
      const fullName = `${rec.employePrenom} ${rec.employeNom} ${rec.fonction}`.toLowerCase();
      const matchSearch = fullName.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || rec.statut === statusFilter;
      return matchMonth && matchSearch && matchStatus;
    });
  }, [payrollRecords, selectedMonth, searchTerm, statusFilter]);

  const handleCreatePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeId) return;

    const targetEmp = employees.find((emp) => emp.id === formData.employeId);
    if (!targetEmp) return;

    const net = formData.salaireBase + formData.bonus - formData.deductions;
    const newRecord: PayrollRecord = {
      id: `pay-${Date.now()}`,
      employeId: targetEmp.id,
      employeNom: targetEmp.nom,
      employePrenom: targetEmp.prenom,
      fonction: targetEmp.fonction || targetEmp.role || "Employé",
      mois: selectedMonth,
      salaireBase: formData.salaireBase,
      bonus: formData.bonus,
      deductions: formData.deductions,
      netAPayer: net,
      statut: formData.statut,
      datePaiement: formData.statut === "paye" ? new Date().toISOString().split("T")[0] : undefined,
      modePaiement: formData.modePaiement,
      notes: formData.notes,
    };

    setPayrollRecords((prev) => [newRecord, ...prev]);
    setShowModal(false);
    setFormData({
      employeId: "",
      salaireBase: 500,
      bonus: 0,
      deductions: 0,
      statut: "paye",
      modePaiement: "virement",
      notes: "",
    });
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
      <PageBreadcrumb pageTitle="Payroll / Gestion des Salaires" />

      {/* KPI Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <DollarLineIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Masse Salariale</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                ${kpis.totalPayroll.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Employés Payés</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.paidCount} / {kpis.totalCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10">
              <TimeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">En Attente</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.pendingCount}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-500/10">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Salaire Moyen</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                ${Math.round(kpis.avgSalary).toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />

          <input
            type="text"
            placeholder="Rechercher par nom ou fonction..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="paye">Payé</option>
            <option value="en_attente">En attente</option>
          </select>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Créer un Bulletin de Paie</span>
        </button>
      </div>

      {/* Payroll Records Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4">Employé / Fonction</th>
                <th className="px-6 py-4">Mois</th>
                <th className="px-6 py-4">Salaire Base</th>
                <th className="px-6 py-4">Primes</th>
                <th className="px-6 py-4">Déductions</th>
                <th className="px-6 py-4">Net à Payer</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucune fiche de paie trouvée pour cette période.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {record.employePrenom} {record.employeNom}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{record.fonction}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{record.mois}</td>
                    <td className="px-6 py-4">${record.salaireBase.toLocaleString()}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">+${record.bonus.toLocaleString()}</td>
                    <td className="px-6 py-4 text-rose-600 font-medium">-${record.deductions.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      ${record.netAPayer.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(record.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          record.statut === "paye"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            record.statut === "paye" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {record.statut === "paye" ? "Payé" : "En attente"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePrintSlip(record)}
                          title="Imprimer / Imprimer Bulletin"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          title="Supprimer"
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <TrashBinIcon className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              Nouveau Bulletin de Paie ({selectedMonth})
            </h3>
            <form onSubmit={handleCreatePayroll} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
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
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">-- Sélectionner --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.prenom} {emp.nom} - {emp.fonction || "Employé"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
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
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Bonus ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Déductions ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.deductions}
                    onChange={(e) =>
                      setFormData({ ...formData, deductions: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Statut du Paiement
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) =>
                      setFormData({ ...formData, statut: e.target.value as "paye" | "en_attente" })
                    }
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="paye">Payé</option>
                    <option value="en_attente">En attente</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
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
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="virement">Virement bancaire</option>
                    <option value="especes">Espèces</option>
                    <option value="chèque">Chèque</option>
                    <option value="mobile">MonCash / Mobile</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Notes / Remarques
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
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
            <div className="mb-6 border-b pb-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold uppercase text-brand-600">FC TORO</h1>
                <p className="text-xs">Académie de Football SMG FC TORO</p>
                <p className="text-xs">Port-au-Prince, Haïti</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold uppercase">BULLETIN DE PAIE</h2>
                <p className="text-xs font-semibold">Période: {selectedSlip.mois}</p>
                <p className="text-xs">Réf: {selectedSlip.id}</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-xs">
              <div>
                <p className="font-bold text-gray-700">INFORMATIONS EMPLOYÉ</p>
                <p className="mt-1 font-semibold text-sm">
                  {selectedSlip.employePrenom} {selectedSlip.employeNom}
                </p>
                <p>Fonction: {selectedSlip.fonction}</p>
                <p>ID Employé: {selectedSlip.employeId}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-700">RÈGLEMENT</p>
                <p className="mt-1">Date: {selectedSlip.datePaiement || "En attente"}</p>
                <p>Mode: {selectedSlip.modePaiement}</p>
                <p>Statut: {selectedSlip.statut === "paye" ? "PAYÉ" : "EN ATTENTE"}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs mb-6 border">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-2">Description</th>
                  <th className="p-2 text-right">Montant ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2">Salaire de Base</td>
                  <td className="p-2 text-right">${selectedSlip.salaireBase.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2">Primes / Extra</td>
                  <td className="p-2 text-right text-emerald-600">+${selectedSlip.bonus.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2">Déductions / Retenues</td>
                  <td className="p-2 text-right text-rose-600">-${selectedSlip.deductions.toFixed(2)}</td>
                </tr>
                <tr className="font-bold bg-gray-50 border-t">
                  <td className="p-2 text-sm">NET À PAYER</td>
                  <td className="p-2 text-right text-sm">${selectedSlip.netAPayer.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-12 flex justify-between text-xs pt-8 border-t">
              <div>
                <p className="font-semibold">Signature Employé:</p>
                <div className="mt-8 border-b w-40"></div>
              </div>
              <div className="text-right">
                <p className="font-semibold">Pour la Direction FC TORO:</p>
                <div className="mt-8 border-b w-40 ml-auto"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
