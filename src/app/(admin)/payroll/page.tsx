"use client";

import React, { useState, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { PayrollRecord } from "@/types/club";
import {
  addPayrollToSupabase,
  updatePayrollInSupabase,
  deletePayrollInSupabase,
} from "@/lib/club/supabase-crud";
import { ConfirmModal } from "@/components/ui/modal/ConfirmModal";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { formatClubDate } from "@/lib/club/metrics";
import { ToastNotification, ToastType } from "@/components/ui/toast/ToastNotification";

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
  Edit: () => (
    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.117 2.117 0 013 3L7.5 19.85 3 21l1.15-4.5L16.862 3.487z" />
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

const formatAmountWithDevise = (amount: number, devise?: "US" | "HTG") => {
  if (devise === "HTG") {
    return `${amount.toLocaleString("fr-FR")} Gdes`;
  }
  return `$${amount.toLocaleString("en-US")}`;
};

const getDefaultTaxPercentage = (salary: number, devise: "US" | "HTG" = "HTG") => {
  if (devise === "HTG") {
    return salary > 5000 ? 2 : 0;
  }
  return 0;
};

const calculatePrelevement = (salary: number, percentage: number) =>
  Math.round(((salary * percentage) / 100) * 100) / 100;

const getPrelevementAmount = (record: PayrollRecord) => {
  const baseSalary = record.salaireBase || 0;
  const isExempt = (record.devise || "HTG") === "HTG" && baseSalary <= 5000;
  if (isExempt) return 0;
  return record.prelevementMontant ?? calculatePrelevement(baseSalary, record.prelevementPourcentage ?? getDefaultTaxPercentage(baseSalary, record.devise));
};

export default function PayrollPage() {
  const { employees, payrollRecords, setPayrollRecords, rubriques } = useClubData();

  // Liste triée par ordre alphabétique (Nom, Prénom A-Z) des employés et coachs
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const nomA = (a.nom || "").trim();
      const nomB = (b.nom || "").trim();
      const nomCompare = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
      if (nomCompare !== 0) return nomCompare;
      const prenomA = (a.prenom || "").trim();
      const prenomB = (b.prenom || "").trim();
      return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
    });
  }, [employees]);

  // Filters
  const currentYearStr = String(CURRENT_YEAR);
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedSlip, setSelectedSlip] = useState<PayrollRecord | null>(null);
  const [editingPayrollId, setEditingPayrollId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<PayrollRecord | null>(null);

  // Modal form state
  const [formData, setFormData] = useState<{
    employeId: string;
    annee: string;
    mois: string;
    salaireBase: number;
    typeSalaire: "fixe" | "variable";
    nombreSeances: number;
    tauxParSeance: number;
    nombreJoursSemaine: number;
    tauxJourSemaine: number;
    nombreJoursWeekend: number;
    tauxJourWeekend: number;
    bonus: number;
    deductions: number;
    prelevementPourcentage: number;
    prelevementType: "taxe" | "credit" | "avance" | "pret";
    prelevementSnowizz: number;
    ajustement: number;
    taxeIRI: number;
    taxeCFGDCT: number;
    taxeCAS: number;
    taxeFDU: number;
    taxeONA: number;
    vacancesPayees: number;
    congeSansSolde: number;
    cumulPaiements: number;
    devise: "US" | "HTG";
    statut: "paye" | "en_attente";
    modePaiement: "virement" | "especes" | "chèque" | "mobile";
    notes: string;
    file: File | null;
  }>({
    employeId: "",
    annee: currentYearStr,
    mois: currentMonthStr,
    salaireBase: 500,
    typeSalaire: "fixe",
    nombreSeances: 0,
    tauxParSeance: 0,
    nombreJoursSemaine: 0,
    tauxJourSemaine: 0,
    nombreJoursWeekend: 0,
    tauxJourWeekend: 0,
    bonus: 0,
    deductions: 0,
    prelevementPourcentage: 0,
    prelevementType: "taxe",
    prelevementSnowizz: 0,
    ajustement: 0,
    taxeIRI: 0,
    taxeCFGDCT: 0,
    taxeCAS: 0,
    taxeFDU: 0,
    taxeONA: 0,
    vacancesPayees: 0,
    congeSansSolde: 0,
    cumulPaiements: 0,
    devise: "HTG",
    statut: "en_attente",
    modePaiement: "virement",
    notes: "",
    file: null,
  });

  // Filtered & Alphabetically Sorted List
  const filteredRecords = useMemo(() => {
    return payrollRecords
      .filter((rec) => {
        const [recYear, recMonth] = rec.mois ? rec.mois.split("-") : ["", ""];

        const matchYear = selectedYear === "all" || recYear === selectedYear;
        const matchMonth = selectedMonth === "all" || recMonth === selectedMonth;

        const fullName = `${rec.employePrenom} ${rec.employeNom} ${rec.fonction}`.toLowerCase();
        const matchSearch = fullName.includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === "all" || rec.statut === statusFilter;

        return matchYear && matchMonth && matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const nomA = (a.employeNom || "").trim();
        const nomB = (b.employeNom || "").trim();
        const nomCompare = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
        if (nomCompare !== 0) return nomCompare;
        const prenomA = (a.employePrenom || "").trim();
        const prenomB = (b.employePrenom || "").trim();
        return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
      });
  }, [payrollRecords, selectedYear, selectedMonth, searchTerm, statusFilter]);

  // KPI Calculations based on active filters (separate by currency)
  const kpis = useMemo(() => {
    const totalPayrollUS = filteredRecords
      .filter((r) => r.devise !== "HTG")
      .reduce((sum, r) => sum + r.netAPayer, 0);

    const totalPayrollHTG = filteredRecords
      .filter((r) => r.devise === "HTG")
      .reduce((sum, r) => sum + r.netAPayer, 0);

    const paidCount = filteredRecords.filter((r) => r.statut === "paye").length;
    const pendingCount = filteredRecords.filter((r) => r.statut === "en_attente").length;

    return {
      totalPayrollUS,
      totalPayrollHTG,
      paidCount,
      pendingCount,
      totalCount: filteredRecords.length,
    };
  }, [filteredRecords]);

  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const generatePayrollExportContent = (delimiter: string) => {
    let csvContent = "\uFEFF";
    const headers = [
      "Employe_Nom",
      "Employe_Prenom",
      "Fonction",
      "Periode_Mois",
      "Type_Salaire",
      "Salaire_Base",
      "Primes_Bonus",
      "Vacances_Payees",
      "Snowizz_Pret",
      "Autres_Retenues",
      "Net_A_Payer",
      "Devise",
      "Statut",
      "Date_Paiement",
      "Mode_Paiement",
      "Notes",
    ];
    csvContent += headers.join(delimiter) + "\n";

    filteredRecords.forEach((r) => {
      const snowizzAmt = Number(r.prelevementSnowizz || 0);
      const otherDeductions = Math.max(0, Number(r.deductions || 0) - snowizzAmt);
      const row = [
        r.employeNom,
        r.employePrenom,
        r.fonction,
        formatMonthYearDisplay(r.mois),
        r.typeSalaire === "variable" ? "Variable / Séance" : "Fixe",
        Number(r.salaireBase || 0).toFixed(2),
        Number(r.bonus || 0).toFixed(2),
        Number(r.vacancesPayees || 0).toFixed(2),
        snowizzAmt.toFixed(2),
        otherDeductions.toFixed(2),
        Number(r.netAPayer || 0).toFixed(2),
        r.devise || "HTG",
        r.statut === "paye" ? "Payé" : "En attente",
        r.datePaiement || "",
        r.modePaiement || "",
        r.notes || "",
      ];
      const formattedRow = row.map((field) => `"${String(field || "").replace(/"/g, '""')}"`);
      csvContent += formattedRow.join(delimiter) + "\n";
    });

    // Summary totals
    const totalNetHTG = filteredRecords.filter((r) => r.devise === "HTG").reduce((sum, r) => sum + (r.netAPayer || 0), 0);
    const totalNetUSD = filteredRecords.filter((r) => r.devise !== "HTG").reduce((sum, r) => sum + (r.netAPayer || 0), 0);

    csvContent += `\nTOTAL${delimiter}${delimiter}${delimiter}TOTAL NET HTG ENCAISSE${delimiter}${delimiter}${delimiter}${delimiter}${delimiter}${delimiter}${totalNetHTG.toFixed(2)} HTG\n`;
    csvContent += `TOTAL${delimiter}${delimiter}${delimiter}TOTAL NET USD ENCAISSE${delimiter}${delimiter}${delimiter}${delimiter}${delimiter}${delimiter}${totalNetUSD.toFixed(2)} USD\n`;

    return csvContent;
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    const headers = [
      "Nom & Prénom",
      "Fonction / Rôle",
      "Période",
      "Type de Salaire",
      "Salaire de Base",
      "Primes & Bonus",
      "Vacances Payées",
      "Snowizz / Prêt",
      "Autres Retenues",
      "Net à Payer",
      "Devise",
      "Statut",
      "Date de Paiement",
      "Mode de Paiement",
      "Remarques / Notes",
    ];

    const totalNetHTG = filteredRecords
      .filter((r) => r.devise === "HTG")
      .reduce((sum, r) => sum + (r.netAPayer || 0), 0);
    const totalNetUSD = filteredRecords
      .filter((r) => r.devise !== "HTG")
      .reduce((sum, r) => sum + (r.netAPayer || 0), 0);

    const thead = headers.map((h) => `<th>${h}</th>`).join("");
    const tbody = filteredRecords
      .map((r) => {
        const nomComplet = r.employeNom ? `${r.employeNom.toUpperCase()} ${r.employePrenom}` : r.employePrenom;
        const snowizzAmt = Number(r.prelevementSnowizz || 0);
        const otherDeductions = Math.max(0, Number(r.deductions || 0) - snowizzAmt);
        const row = [
          nomComplet,
          r.fonction || "-",
          formatMonthYearDisplay(r.mois),
          r.typeSalaire === "variable" ? "Variable / Séance" : "Fixe",
          Number(r.salaireBase || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          Number(r.bonus || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          Number(r.vacancesPayees || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          snowizzAmt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          otherDeductions.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          Number(r.netAPayer || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          r.devise || "HTG",
          r.statut === "paye" ? "Payé" : "En attente",
          r.datePaiement ? formatClubDate(r.datePaiement) : "-",
          r.modePaiement || "-",
          r.notes || "-",
        ];
        return `<tr>${row
          .map(
            (field) =>
              `<td>${String(field || "")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</td>`,
          )
          .join("")}</tr>`;
      })
      .join("");

    const summaryRows = `
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colspan="8" style="text-align: right;">TOTAL NET HTG :</td>
        <td>${totalNetHTG.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>HTG</td>
        <td colspan="4"></td>
      </tr>
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colspan="8" style="text-align: right;">TOTAL NET USD :</td>
        <td>${totalNetUSD.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>USD</td>
        <td colspan="4"></td>
      </tr>
    `;

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 13px; }
          td, th { border: 1px solid #cccccc; padding: 6px 10px; text-align: left; }
          th { background-color: #107C41; color: white; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${thead}</tr></thead>
          <tbody>
            ${tbody}
            ${summaryRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_export_${selectedYear}_${selectedMonth}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    const content = generatePayrollExportContent(",");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_export_${selectedYear}_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.employeId) {
      setModalError("Veuillez sélectionner un employé ou coach dans la liste.");
      return;
    }

    if (formData.typeSalaire === "fixe" && (!formData.salaireBase || formData.salaireBase <= 0)) {
      setModalError("Veuillez indiquer un salaire de base valide supérieur à 0.");
      return;
    }

    if (formData.file && formData.file.size > 5 * 1024 * 1024) {
      setFileError("La photo justificative doit faire au maximum 5 MB.");
      setModalError("La photo justificative dépasse la taille autorisée (maximum 5 MB).");
      return;
    }

    const targetEmp = employees.find((emp) => emp.id === formData.employeId);
    if (!targetEmp) {
      setModalError("Employé introuvable. Veuillez re-sélectionner l'employé.");
      return;
    }

    const targetMois = `${formData.annee}-${formData.mois}`;

    // Anti-doublon Payroll: Vérifier si un bulletin existe déjà pour cet employé et ce mois
    if (!editingPayrollId) {
      const duplicatePayroll = payrollRecords.find(
        (rec) => rec.employeId === targetEmp.id && rec.mois === targetMois
      );
      if (duplicatePayroll) {
        const errorMsg = `Un bulletin de paie existe déjà pour ${targetEmp.nom ? targetEmp.nom.toUpperCase() : ""} ${targetEmp.prenom} pour la période ${formatMonthYearDisplay(targetMois)}. La création d'un doublon est bloquée.`;
        setModalError(errorMsg);
        setToast({ message: errorMsg, type: "error" });
        return;
      }
    }

    // Calculate gross base salary based on fixed vs variable per session
    const grossBaseSalary =
      formData.typeSalaire === "variable"
        ? (formData.nombreJoursSemaine * formData.tauxJourSemaine) +
          (formData.nombreJoursWeekend * formData.tauxJourWeekend) +
          (formData.nombreSeances * formData.tauxParSeance)
        : formData.salaireBase;

    // Règle d'exonération fiscale : si salaire brut <= 5000 HTG, taxe 2% = 0% et 0 HTG
    const isExempt2Percent = formData.devise === "HTG" && grossBaseSalary <= 5000;
    const effectivePrelevementPourcentage = isExempt2Percent ? 0 : formData.prelevementPourcentage;
    const prelevementMontant = isExempt2Percent ? 0 : calculatePrelevement(grossBaseSalary, effectivePrelevementPourcentage);

    const iriMontant = formData.devise === "HTG" ? (formData.taxeIRI || 0) : 0;
    const cfgdctMontant = formData.devise === "HTG" ? calculatePrelevement(grossBaseSalary, formData.taxeCFGDCT) : 0;
    const casMontant = formData.devise === "HTG" ? calculatePrelevement(grossBaseSalary, formData.taxeCAS) : 0;
    const fduMontant = formData.devise === "HTG" ? calculatePrelevement(grossBaseSalary, formData.taxeFDU) : 0;
    const onaMontant = formData.devise === "HTG" ? calculatePrelevement(grossBaseSalary, formData.taxeONA) : 0;
    
    const totalTaxes = prelevementMontant + iriMontant + cfgdctMontant + casMontant + fduMontant + onaMontant;
    const snowizzDeduction = Number(formData.prelevementSnowizz || 0);
    const ajustementVal = formData.devise === "HTG" ? formData.ajustement : 0;
    const usdDeduction = formData.devise === "US" ? formData.deductions : 0;

    const totalDeductions = totalTaxes + snowizzDeduction + ajustementVal + usdDeduction + formData.congeSansSolde;
    
    // Net Pay = Gross + Bonus + Paid Vacations - Total Deductions
    const net = grossBaseSalary + formData.bonus + formData.vacancesPayees - totalDeductions;

    // Calculate cumulative payments for this employee
    const existingEmpRecords = payrollRecords.filter(
      (r) => r.employeId === targetEmp.id && r.id !== editingPayrollId && r.statut === "paye"
    );
    const prevCumul = existingEmpRecords.reduce((sum, r) => sum + r.netAPayer, 0);
    const cumulPaiements = prevCumul + (formData.statut === "paye" ? Math.max(0, net) : 0);

    const recordData: Omit<PayrollRecord, "id"> = {
      employeId: targetEmp.id,
      employeNom: targetEmp.nom,
      employePrenom: targetEmp.prenom,
      fonction: targetEmp.fonction || targetEmp.role || "Employé",
      mois: targetMois,
      salaireBase: grossBaseSalary,
      typeSalaire: formData.typeSalaire,
      nombreSeances: formData.nombreSeances,
      tauxParSeance: formData.tauxParSeance,
      nombreJoursSemaine: formData.nombreJoursSemaine,
      tauxJourSemaine: formData.tauxJourSemaine,
      nombreJoursWeekend: formData.nombreJoursWeekend,
      tauxJourWeekend: formData.tauxJourWeekend,
      bonus: formData.bonus,
      deductions: totalDeductions,
      prelevementPourcentage: effectivePrelevementPourcentage,
      prelevementMontant,
      prelevementAvance: usdDeduction,
      prelevementSnowizz: formData.prelevementSnowizz,
      ajustement: formData.ajustement,
      taxeIRI: formData.taxeIRI,
      taxeCFGDCT: formData.taxeCFGDCT,
      taxeCAS: formData.taxeCAS,
      taxeFDU: formData.taxeFDU,
      taxeONA: formData.taxeONA,
      prelevementType: formData.prelevementType,
      vacancesPayees: formData.vacancesPayees,
      congeSansSolde: formData.congeSansSolde,
      cumulPaiements,
      netAPayer: net,
      devise: formData.devise,
      statut: formData.statut,
      datePaiement:
        formData.statut === "paye"
          ? (editingPayrollId
              ? (payrollRecords.find((r) => String(r.id) === String(editingPayrollId))?.datePaiement || new Date().toISOString().split("T")[0])
              : new Date().toISOString().split("T")[0])
          : undefined,
      modePaiement: formData.modePaiement,
      notes: formData.notes,
    };

    try {
      if (editingPayrollId) {
        const updatedData = await updatePayrollInSupabase(editingPayrollId, recordData, formData.file || undefined);
        setPayrollRecords((prev) =>
          prev.map((rec) =>
            rec.id === editingPayrollId
              ? {
                  ...rec,
                  ...recordData,
                  pieceJointe: updatedData.PieceJointe || rec.pieceJointe,
                }
              : rec
          )
        );
      } else {
        const insertedData = await addPayrollToSupabase(recordData, formData.file || undefined);
        const normalizedDatePaiement = typeof recordData.datePaiement === "string" ? recordData.datePaiement : undefined;
        const newRecord: PayrollRecord = {
          id: insertedData.Id || `pay-${Date.now()}`,
          employeId: recordData.employeId,
          employeNom: recordData.employeNom,
          employePrenom: recordData.employePrenom,
          fonction: recordData.fonction,
          mois: recordData.mois,
          salaireBase: recordData.salaireBase,
          typeSalaire: recordData.typeSalaire,
          nombreSeances: recordData.nombreSeances,
          tauxParSeance: recordData.tauxParSeance,
          bonus: recordData.bonus,
          deductions: recordData.deductions,
          prelevementPourcentage: recordData.prelevementPourcentage,
          prelevementMontant: recordData.prelevementMontant,
          prelevementAvance: recordData.prelevementAvance,
          prelevementSnowizz: recordData.prelevementSnowizz,
          ajustement: recordData.ajustement,
          taxeIRI: recordData.taxeIRI,
          taxeCFGDCT: recordData.taxeCFGDCT,
          taxeCAS: recordData.taxeCAS,
          taxeFDU: recordData.taxeFDU,
          taxeONA: recordData.taxeONA,
          prelevementType: recordData.prelevementType,
          vacancesPayees: recordData.vacancesPayees,
          congeSansSolde: recordData.congeSansSolde,
          cumulPaiements: recordData.cumulPaiements,
          netAPayer: recordData.netAPayer,
          statut: recordData.statut,
          datePaiement: normalizedDatePaiement as string | undefined,
          modePaiement: recordData.modePaiement,
          notes: recordData.notes,
          devise: recordData.devise,
          pieceJointe: insertedData.PieceJointe || undefined,
        };
        setPayrollRecords((prev) => [newRecord, ...prev]);
      }

      setShowModal(false);
      setEditingPayrollId(null);
      setFileError(null);
      setFormData({
        employeId: "",
        annee: selectedYear !== "all" ? selectedYear : currentYearStr,
        mois: selectedMonth !== "all" ? selectedMonth : currentMonthStr,
        salaireBase: 500,
        typeSalaire: "fixe",
        nombreSeances: 0,
        tauxParSeance: 0,
        nombreJoursSemaine: 0,
        tauxJourSemaine: 0,
        nombreJoursWeekend: 0,
        tauxJourWeekend: 0,
        bonus: 0,
        deductions: 0,
        prelevementPourcentage: 0,
        prelevementType: "taxe",
        prelevementSnowizz: 0,
        ajustement: 0,
        taxeIRI: 0,
        taxeCFGDCT: 0,
        taxeCAS: 0,
        taxeFDU: 0,
        taxeONA: 0,
        vacancesPayees: 0,
        congeSansSolde: 0,
        cumulPaiements: 0,
        devise: "HTG",
        statut: "en_attente",
        modePaiement: "virement",
        notes: "",
        file: null,
      });

      setShowModal(false);
      setToast({
        message: editingPayrollId
          ? "Bulletin de paie mis à jour avec succès !"
          : "Nouveau bulletin de paie créé avec succès !",
        type: "success",
      });
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du bulletin de paie :", error);
      const errMsg = `Erreur lors de l'enregistrement du bulletin : ${error?.message || error || "Veuillez réessayer."}`;
      setModalError(errMsg);
      setToast({ message: errMsg, type: "error" });
    }
  };

  const handleToggleStatus = async (id: string) => {
    const target = payrollRecords.find((r) => String(r.id) === String(id));
    if (!target) return;

    const nextStatut = target.statut === "paye" ? "en_attente" : "paye";
    const nextDatePaiement = nextStatut === "paye" ? (target.datePaiement || new Date().toISOString().split("T")[0]) : undefined;

    setPayrollRecords((prev) =>
      prev.map((rec) => {
        if (String(rec.id) === String(id)) {
          return {
            ...rec,
            statut: nextStatut,
            datePaiement: nextDatePaiement,
          };
        }
        return rec;
      })
    );

    if (!String(id).startsWith("pay-")) {
      try {
        await updatePayrollInSupabase(String(id), {
          statut: nextStatut,
          datePaiement: nextDatePaiement,
        });
        setToast({
          message: `Statut mis à jour : ${nextStatut === "paye" ? "Payé" : "En attente"}.`,
          type: "info",
        });
      } catch (err) {
        console.error("Erreur mise à jour statut paie :", err);
        setToast({ message: "Erreur lors de la mise à jour du statut.", type: "error" });
      }
    }
  };

  const handleDeleteRecord = (record: PayrollRecord) => {
    setDeletingRecord(record);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    const rawId = deletingRecord.id;
    const strId = String(rawId);
    setPayrollRecords((prev) => prev.filter((r) => String(r.id) !== strId));

    if (!strId.startsWith("pay-")) {
      try {
        await deletePayrollInSupabase(strId);
        setToast({ message: "Bulletin de paie supprimé avec succès.", type: "info" });
      } catch (err) {
        console.error("Erreur suppression paie :", err);
        setToast({ message: "Erreur lors de la suppression.", type: "error" });
      }
    } else {
      setToast({ message: "Bulletin supprimé.", type: "info" });
    }
    setDeletingRecord(null);
  };

  const handlePrintSlip = (record: PayrollRecord) => {
    setSelectedSlip(record);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleEditPayroll = (record: PayrollRecord) => {
    const [year, month] = record.mois ? record.mois.split("-") : ["", ""];
    const prelevementPourcentage = record.prelevementPourcentage ?? 0;
    const prelevementMontant = record.prelevementMontant ?? calculatePrelevement(record.salaireBase, prelevementPourcentage);
    setEditingPayrollId(record.id);
    setFileError(null);
    setModalError(null);
    setFormData({
      employeId: record.employeId,
      annee: year || (selectedYear !== "all" ? selectedYear : currentYearStr),
      mois: month || (selectedMonth !== "all" ? selectedMonth : currentMonthStr),
      salaireBase: record.salaireBase,
      typeSalaire: record.typeSalaire || "fixe",
      nombreSeances: record.nombreSeances || 0,
      tauxParSeance: record.tauxParSeance || 0,
      nombreJoursSemaine: record.nombreJoursSemaine || 0,
      tauxJourSemaine: record.tauxJourSemaine || 0,
      nombreJoursWeekend: record.nombreJoursWeekend || 0,
      tauxJourWeekend: record.tauxJourWeekend || 0,
      bonus: record.bonus || 0,
      deductions: record.prelevementAvance || 0,
      prelevementPourcentage,
      prelevementType: record.prelevementType || "taxe",
      prelevementSnowizz: record.prelevementSnowizz || 0,
      ajustement: record.ajustement || 0,
      taxeIRI: record.taxeIRI || 0,
      taxeCFGDCT: record.taxeCFGDCT ?? 0,
      taxeCAS: record.taxeCAS ?? 0,
      taxeFDU: record.taxeFDU ?? 0,
      taxeONA: record.taxeONA ?? 0,
      vacancesPayees: record.vacancesPayees || 0,
      congeSansSolde: record.congeSansSolde || 0,
      cumulPaiements: record.cumulPaiements || 0,
      devise: record.devise || "HTG",
      statut: record.statut === "paye" ? "paye" : "en_attente",
      modePaiement: record.modePaiement || "virement",
      notes: record.notes || "",
      file: null,
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="print:hidden">
        <PageBreadcrumb pageTitle="Payroll / Gestion Historique des Salaires" />
      </div>

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
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                {kpis.totalPayrollHTG > 0 && `${kpis.totalPayrollHTG.toLocaleString("fr-FR")} Gdes`}
                {kpis.totalPayrollHTG > 0 && kpis.totalPayrollUS > 0 && " / "}
                {kpis.totalPayrollUS > 0 && `$${kpis.totalPayrollUS.toLocaleString("en-US")}`}
                {kpis.totalPayrollHTG === 0 && kpis.totalPayrollUS === 0 && "$0"}
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
                Total Fiches
              </p>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {kpis.totalCount}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Top Action Bar (Filters + Add Button) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden mb-6">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          <div className="min-w-0">
            <input
              type="text"
              placeholder="Rechercher un employé"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="min-w-0">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
            >
              <option value="all">Toutes les années</option>
              {YEARS_LIST.map((year) => (
                <option key={year} value={String(year)}>
                  Année {year}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
            >
              <option value="all">Tous statuts</option>
              <option value="paye">Payé</option>
              <option value="en_attente">En attente</option>
            </select>
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => {
              setEditingPayrollId(null);
              setFileError(null);
              setFormData({
                employeId: "",
                annee: selectedYear !== "all" ? selectedYear : currentYearStr,
                mois: selectedMonth !== "all" ? selectedMonth : currentMonthStr,
                salaireBase: 500,
                typeSalaire: "fixe",
                nombreSeances: 0,
                tauxParSeance: 0,
                nombreJoursSemaine: 0,
                tauxJourSemaine: 0,
                nombreJoursWeekend: 0,
                tauxJourWeekend: 0,
                bonus: 0,
                deductions: 0,
                prelevementPourcentage: 0,
                prelevementType: "taxe",
                prelevementSnowizz: 0,
                ajustement: 0,
                taxeIRI: 0,
                taxeCFGDCT: 0,
                taxeCAS: 0,
                taxeFDU: 0,
                taxeONA: 0,
                vacancesPayees: 0,
                congeSansSolde: 0,
                cumulPaiements: 0,
                devise: "HTG",
                statut: "en_attente",
                modePaiement: "virement",
                notes: "",
                file: null,
              });
              setModalError(null);
              setFileError(null);
              setShowModal(true);
            }}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors cursor-pointer"
          >
            + Nouveau Bulletin
          </button>
        </div>
      </div>

      {/* Printable Title */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rapport de Paie - {formatMonthYearDisplay(`${selectedYear}-${selectedMonth}`)}</h1>
      </div>

      {/* Payroll Records Table Container */}
      <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 ${selectedSlip ? 'print:hidden' : ''}`}>
        {/* Table Header: Title on Left, Export Excel Button on Right */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Journal de Paie
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredRecords.length} fiche(s)
            </p>
          </div>

          {/* Export Excel / CSV Button inside table header */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M8 13h2"></path>
                <path d="M14 13h2"></path>
                <path d="M8 17h2"></path>
                <path d="M14 17h2"></path>
              </svg>
              <span>Exporter Excel / CSV</span>
            </button>
            <Dropdown
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              className="w-36 right-0"
            >
              <DropdownItem onItemClick={handleExportExcel}>
                Excel (.csv)
              </DropdownItem>
              <DropdownItem onItemClick={handleExportCSV}>
                CSV (.csv)
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50/80 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4 font-bold">Employé & Fonction</th>
                <th className="px-6 py-4 font-bold">Période (Mois/Année)</th>
                <th className="px-6 py-4 font-bold">Salaire Base</th>
                <th className="px-6 py-4 font-bold">Primes</th>
                <th className="px-6 py-4 font-bold">Snowizz / Prêt</th>
                <th className="px-6 py-4 font-bold">Autres Retenues</th>
                <th className="px-6 py-4 font-bold">Net à Payer</th>
                <th className="px-6 py-4 font-bold">Statut</th>
                <th className="px-6 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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
                      {formatAmountWithDevise(record.salaireBase, record.devise)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatAmountWithDevise(record.bonus, record.devise)}
                    </td>
                    <td className="px-6 py-4 font-medium text-amber-700 dark:text-amber-400">
                      {(record.prelevementSnowizz || 0) > 0 ? (
                        `-${formatAmountWithDevise(record.prelevementSnowizz || 0, record.devise)}`
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-rose-600 dark:text-rose-400">
                      {(() => {
                        const snowizzAmt = record.prelevementSnowizz || 0;
                        const otherDeductions = Math.max(0, (record.deductions || 0) - snowizzAmt);
                        return otherDeductions > 0 ? (
                          `-${formatAmountWithDevise(otherDeductions, record.devise)}`
                        ) : (
                          <span className="text-gray-400">-</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-gray-900 dark:text-white">
                      {formatAmountWithDevise(record.netAPayer, record.devise)}
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
                          onClick={() => handleEditPayroll(record)}
                          title="Modifier"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          onClick={() => handlePrintSlip(record)}
                          title="Imprimer Bulletin de Paie"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Icons.Printer />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record)}
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
        <div className="fixed inset-0 z-[999999] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs print:hidden sm:p-6">
          <div className="my-6 w-full max-w-5xl rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingPayrollId ? "Modifier le Bulletin de Paie" : "Nouveau Bulletin de Paie"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Remplissez les informations salariales, primes et déductions légales
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* In-system Error Notification Banner */}
            {modalError && (
              <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 animate-in fade-in duration-200 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300 mt-0.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-100">
                      Message du système
                    </h5>
                    <p className="text-xs font-medium mt-0.5 leading-relaxed">{modalError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="rounded-lg p-1 text-rose-400 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
            )}

            <form noValidate onSubmit={handleCreatePayroll} className="space-y-6">
              {/* SECTION 1: INFORMATIONS GÉNÉRALES (4 colonnes) */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30 p-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  1. Période & Employé
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Année
                    </label>
                    <select
                      value={formData.annee}
                      onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      {MONTHS_LIST.filter((m) => m.value !== "all").map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Sélectionner l'Employé *
                    </label>
                    <select
                      required
                      value={formData.employeId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = sortedEmployees.find((x) => x.id === empId);
                        const empSal = emp?.salaire || 0;
                        const empDev: "US" | "HTG" = emp?.devise || (empSal >= 1000 ? "HTG" : "US");
                        const isCoach = (emp?.fonction || emp?.role || "").toLowerCase().includes("coach");
                        const defaultType = emp?.typeSalaire || (isCoach ? "variable" : "fixe");
                        const defaultTaux = emp?.tauxParSeance || 0;
                        setFormData((prev) => ({
                          ...prev,
                          employeId: empId,
                          typeSalaire: defaultType,
                          tauxParSeance: defaultTaux,
                          salaireBase: empSal,
                          prelevementPourcentage: getDefaultTaxPercentage(empSal, empDev),
                          devise: empDev,
                        }));
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">-- Choisir un employé / coach (A-Z) --</option>
                      {sortedEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nom ? `${emp.nom.toUpperCase()} ${emp.prenom}` : `${emp.prenom}`} ({emp.fonction || emp.role || "Employé"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Type de Rémunération
                    </label>
                    <select
                      value={formData.typeSalaire}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          typeSalaire: e.target.value as "fixe" | "variable",
                        })
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="fixe">Salaire Fixe Mensuel</option>
                      <option value="variable">Salaire Variable / Par séance (Coachs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Devise du Salaire
                    </label>
                    <select
                      value={formData.devise}
                      onChange={(e) => {
                        const newDev = e.target.value as "US" | "HTG";
                        setFormData((prev) => {
                          const gross = prev.typeSalaire === "variable"
                            ? ((prev.nombreJoursSemaine || 0) * (prev.tauxJourSemaine || 0)) +
                              ((prev.nombreJoursWeekend || 0) * (prev.tauxJourWeekend || 0)) +
                              ((prev.nombreSeances || 0) * (prev.tauxParSeance || 0))
                            : prev.salaireBase;
                          return {
                            ...prev,
                            devise: newDev,
                            prelevementPourcentage: getDefaultTaxPercentage(gross, newDev),
                          };
                        });
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="HTG">Gourdes (HTG / Gdes)</option>
                      <option value="US">Dollars (USD / $)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Statut du Paiement
                    </label>
                    <select
                      value={formData.statut}
                      onChange={(e) =>
                        setFormData({ ...formData, statut: e.target.value as "paye" | "en_attente" })
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="paye">Payé</option>
                      <option value="en_attente">En attente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DÉCOMPTE SALAIRE & PRIMES (4 colonnes) */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30 p-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  2. Calcul du Salaire & Primes
                </h4>

                {formData.typeSalaire === "variable" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Jours Semaine
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.nombreJoursSemaine === 0 ? "" : formData.nombreJoursSemaine}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            setFormData((prev) => {
                              const total = (val * prev.tauxJourSemaine) + (prev.nombreJoursWeekend * prev.tauxJourWeekend) + (prev.nombreSeances * prev.tauxParSeance);
                              return {
                                ...prev,
                                nombreJoursSemaine: val,
                                prelevementPourcentage: getDefaultTaxPercentage(total, prev.devise),
                              };
                            });
                          }}
                          placeholder="Ex: 8"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Taux Semaine ({formData.devise === "HTG" ? "Gdes" : "$"})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.tauxJourSemaine === 0 ? "" : formData.tauxJourSemaine}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            setFormData((prev) => {
                              const total = (prev.nombreJoursSemaine * val) + (prev.nombreJoursWeekend * prev.tauxJourWeekend) + (prev.nombreSeances * prev.tauxParSeance);
                              return {
                                ...prev,
                                tauxJourSemaine: val,
                                prelevementPourcentage: getDefaultTaxPercentage(total, prev.devise),
                              };
                            });
                          }}
                          placeholder="Ex: 500"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Jours Weekend
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.nombreJoursWeekend === 0 ? "" : formData.nombreJoursWeekend}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            setFormData((prev) => {
                              const total = (prev.nombreJoursSemaine * prev.tauxJourSemaine) + (val * prev.tauxJourWeekend) + (prev.nombreSeances * prev.tauxParSeance);
                              return {
                                ...prev,
                                nombreJoursWeekend: val,
                                prelevementPourcentage: getDefaultTaxPercentage(total, prev.devise),
                              };
                            });
                          }}
                          placeholder="Ex: 4"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Taux Weekend ({formData.devise === "HTG" ? "Gdes" : "$"})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.tauxJourWeekend === 0 ? "" : formData.tauxJourWeekend}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            setFormData((prev) => {
                              const total = (prev.nombreJoursSemaine * prev.tauxJourSemaine) + (prev.nombreJoursWeekend * val) + (prev.nombreSeances * prev.tauxParSeance);
                              return {
                                ...prev,
                                tauxJourWeekend: val,
                                prelevementPourcentage: getDefaultTaxPercentage(total, prev.devise),
                              };
                            });
                          }}
                          placeholder="Ex: 750"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Autres séances
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.nombreSeances === 0 ? "" : formData.nombreSeances}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            setFormData((prev) => {
                              const total = (prev.nombreJoursSemaine * prev.tauxJourSemaine) + (prev.nombreJoursWeekend * prev.tauxJourWeekend) + (val * prev.tauxParSeance);
                              return {
                                ...prev,
                                nombreSeances: val,
                                prelevementPourcentage: getDefaultTaxPercentage(total, prev.devise),
                              };
                            });
                          }}
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          placeholder="Ex: 2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Taux par séance
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.tauxParSeance === 0 ? "" : formData.tauxParSeance}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            setFormData((prev) => {
                              const total = (prev.nombreJoursSemaine * prev.tauxJourSemaine) + (prev.nombreJoursWeekend * prev.tauxJourWeekend) + (prev.nombreSeances * val);
                              return {
                                ...prev,
                                tauxParSeance: val,
                                prelevementPourcentage: getDefaultTaxPercentage(total, prev.devise),
                              };
                            });
                          }}
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          placeholder="Ex: 1000"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Primes / Bonus ({formData.devise === "HTG" ? "Gdes" : "$"})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.bonus === 0 ? "" : formData.bonus}
                          onChange={(e) => setFormData({ ...formData, bonus: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
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
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="virement">Virement bancaire</option>
                          <option value="especes">Espèces</option>
                          <option value="chèque">Chèque</option>
                          <option value="mobile">MonCash / Mobile</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs font-bold text-amber-900 dark:text-amber-300">
                      Sous-total séances (Brut) = {formatAmountWithDevise(
                        (formData.nombreJoursSemaine * formData.tauxJourSemaine) +
                        (formData.nombreJoursWeekend * formData.tauxJourWeekend) +
                        (formData.nombreSeances * formData.tauxParSeance),
                        formData.devise
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Salaire Fixe de Base ({formData.devise === "HTG" ? "Gdes" : "$"}) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={formData.salaireBase === 0 ? "" : formData.salaireBase}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                          setFormData((prev) => ({
                            ...prev,
                            salaireBase: val,
                            prelevementPourcentage: getDefaultTaxPercentage(val, prev.devise),
                          }));
                        }}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Primes / Bonus ({formData.devise === "HTG" ? "Gdes" : "$"})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.bonus === 0 ? "" : formData.bonus}
                        onChange={(e) => setFormData({ ...formData, bonus: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
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
                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="virement">Virement bancaire</option>
                        <option value="especes">Espèces</option>
                        <option value="chèque">Chèque</option>
                        <option value="mobile">MonCash / Mobile</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: TAXES & RETENUES (4 colonnes) */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30 p-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  3. Déductions & Retenues Légales
                </h4>

                {formData.devise === "HTG" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {(() => {
                        const curGross = formData.typeSalaire === "variable"
                          ? ((formData.nombreJoursSemaine || 0) * (formData.tauxJourSemaine || 0)) +
                            ((formData.nombreJoursWeekend || 0) * (formData.tauxJourWeekend || 0)) +
                            ((formData.nombreSeances || 0) * (formData.tauxParSeance || 0))
                          : (formData.salaireBase || 0);
                        const isExempt = curGross <= 5000;

                        return (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                Taxe Revenu (%)
                              </label>
                              {isExempt && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded">
                                  Exonéré
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={isExempt}
                              value={isExempt ? 0 : (formData.prelevementPourcentage === 0 ? "" : formData.prelevementPourcentage)}
                              onChange={(e) =>
                                setFormData({ ...formData, prelevementPourcentage: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                              }
                              placeholder={isExempt ? "0" : "2"}
                              className={`w-full rounded-lg border p-2 text-xs font-semibold ${
                                isExempt
                                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300 cursor-not-allowed"
                                  : "border-brand-300 bg-white dark:border-brand-700 dark:bg-gray-800 dark:text-white"
                              }`}
                            />
                            {isExempt && (
                              <span className="mt-1 block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Exonéré (≤ 5 000 HTG)
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                          IRI (Gdes)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.taxeIRI === 0 ? "" : formData.taxeIRI}
                          onChange={(e) =>
                            setFormData({ ...formData, taxeIRI: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                          CFGDCT (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.taxeCFGDCT === 0 ? "" : formData.taxeCFGDCT}
                          onChange={(e) =>
                            setFormData({ ...formData, taxeCFGDCT: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                          CAS (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.taxeCAS === 0 ? "" : formData.taxeCAS}
                          onChange={(e) =>
                            setFormData({ ...formData, taxeCAS: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                          FDU (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.taxeFDU === 0 ? "" : formData.taxeFDU}
                          onChange={(e) =>
                            setFormData({ ...formData, taxeFDU: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                          ONA (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.taxeONA === 0 ? "" : formData.taxeONA}
                          onChange={(e) =>
                            setFormData({ ...formData, taxeONA: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Prélèvement Snowizz / Prêt (Gdes)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.prelevementSnowizz === 0 ? "" : formData.prelevementSnowizz}
                          onChange={(e) =>
                            setFormData({ ...formData, prelevementSnowizz: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0.00"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Ajustement (Gdes)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.ajustement === 0 ? "" : formData.ajustement}
                          onChange={(e) =>
                            setFormData({ ...formData, ajustement: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0.00"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Taxe / Retenue (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.prelevementPourcentage === 0 ? "" : formData.prelevementPourcentage}
                        onChange={(e) =>
                          setFormData({ ...formData, prelevementPourcentage: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Montant Taxe
                      </label>
                      <div className="flex h-[42px] items-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-rose-600 dark:border-gray-700 dark:bg-gray-900 dark:text-rose-400">
                        -{formatAmountWithDevise(
                          calculatePrelevement(
                            formData.typeSalaire === "variable"
                              ? formData.nombreSeances * formData.tauxParSeance
                              : formData.salaireBase,
                            formData.prelevementPourcentage
                          ),
                          formData.devise
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Prélèvement Snowizz / Prêt ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.prelevementSnowizz === 0 ? "" : formData.prelevementSnowizz}
                        onChange={(e) =>
                          setFormData({ ...formData, prelevementSnowizz: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Autres Prélèvements / Avances ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.deductions === 0 ? "" : formData.deductions}
                        onChange={(e) =>
                          setFormData({ ...formData, deductions: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Motif du Prélèvement
                      </label>
                      <select
                        value={formData.prelevementType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            prelevementType: e.target.value as "taxe" | "credit" | "avance" | "pret",
                          })
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="avance">Avance sur salaire</option>
                        <option value="pret">Remboursement Prêt</option>
                        <option value="credit">Compte à crédit</option>
                        <option value="taxe">Autre prélèvement / Ajustement</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: NOTES & PIÈCE JOINTE (4 colonnes) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Notes / Remarques
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Précisions ou commentaires sur ce versement..."
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Justificatif (JPG/PNG)
                  </label>
                  <input
                    type="file"
                    accept=".jpg, .jpeg, .png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) {
                        setFormData({ ...formData, file: null });
                        setFileError(null);
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setFileError("Max 5 MB.");
                        setFormData({ ...formData, file: null });
                        return;
                      }
                      setFileError(null);
                      setFormData({ ...formData, file });
                    }}
                    className="w-full rounded-xl border border-gray-300 p-1.5 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800"
                  />
                  {editingPayrollId && payrollRecords.find((rec) => rec.id === editingPayrollId)?.pieceJointe && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      <a
                        href={payrollRecords.find((rec) => rec.id === editingPayrollId)?.pieceJointe}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        Document joint
                      </a>
                    </p>
                  )}
                  {fileError && <p className="mt-1 text-[11px] text-rose-500">{fileError}</p>}
                </div>
              </div>

              {/* SECTION 5: CARD SYNTHÈSE FINANCIÈRE */}
              {(() => {
                const gross = formData.typeSalaire === "variable"
                  ? ((formData.nombreJoursSemaine || 0) * (formData.tauxJourSemaine || 0)) +
                    ((formData.nombreJoursWeekend || 0) * (formData.tauxJourWeekend || 0)) +
                    ((formData.nombreSeances || 0) * (formData.tauxParSeance || 0))
                  : formData.salaireBase;

                const isExempt = formData.devise === "HTG" && gross <= 5000;
                const taxBase = isExempt ? 0 : calculatePrelevement(gross, formData.prelevementPourcentage);
                const iriAmt = formData.devise === "HTG" ? (formData.taxeIRI || 0) : 0;
                const cfgdctAmt = formData.devise === "HTG" ? calculatePrelevement(gross, formData.taxeCFGDCT) : 0;
                const casAmt = formData.devise === "HTG" ? calculatePrelevement(gross, formData.taxeCAS) : 0;
                const fduAmt = formData.devise === "HTG" ? calculatePrelevement(gross, formData.taxeFDU) : 0;
                const onaAmt = formData.devise === "HTG" ? calculatePrelevement(gross, formData.taxeONA) : 0;

                const totalTaxesCalc = taxBase + iriAmt + cfgdctAmt + casAmt + fduAmt + onaAmt;
                const snowizzCalc = formData.devise === "HTG" ? (formData.prelevementSnowizz || 0) : 0;
                const ajustementCalc = formData.devise === "HTG" ? (formData.ajustement || 0) : 0;
                const usdDeductionCalc = formData.devise === "US" ? (formData.deductions || 0) : 0;

                const totalRetenuesCalc = totalTaxesCalc + snowizzCalc + ajustementCalc + usdDeductionCalc;
                const netPayCalc = gross + (formData.bonus || 0) + (formData.vacancesPayees || 0) - totalRetenuesCalc;

                return (
                  <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:border-gray-800 dark:from-gray-800/40 dark:via-gray-800/20 dark:to-gray-800/40 p-4 sm:p-5 shadow-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                      <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
                          Salaire Brut
                        </span>
                        <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                          {formatAmountWithDevise(gross, formData.devise)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
                          Total Retenues
                        </span>
                        <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                          -{formatAmountWithDevise(totalRetenuesCalc, formData.devise)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
                          Bonus & Primes
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                          +{formatAmountWithDevise(formData.bonus || 0, formData.devise)}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right shadow-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
                          NET À PAYER
                        </span>
                        <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                          {formatAmountWithDevise(netPayCalc, formData.devise)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 shadow-md transition-all active:scale-95"
                >
                  Enregistrer le Bulletin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Pay Slip Template */}
      {selectedSlip && (
        <div className="hidden print:block print:p-8">
          <div className="mx-auto max-w-2xl bg-white p-10 text-gray-800 print:shadow-none">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between border-b border-gray-200 pb-6">
              <div className="flex items-center gap-4">
                <img src="/images/logo/fc-toro.png" alt="FC TORO Logo" className="h-[72px] w-auto" />
                <div>
                  <h1 className="text-[26px] font-black uppercase tracking-tight text-slate-800">FC TORO</h1>
                  <p className="mt-1 text-[11px] font-medium text-gray-500">Football Club</p>
                  <p className="text-[11px] text-gray-500">7 Rue Rigaud, Pétion-Ville, Haïti</p>
                  <p className="text-[11px] text-gray-500">+509 2817-8676 | footballclubtoro@gmail.com</p>
                  <p className="text-[11px] text-gray-500">www.fctoro.com</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="mb-3 text-[20px] font-black uppercase tracking-wide text-slate-800">BULLETIN DE PAIE</h2>
                <p className="text-[13px] font-bold text-gray-800">
                  {selectedSlip.employePrenom} {selectedSlip.employeNom}
                </p>
                <p className="text-[11px] text-gray-500">Fonction: {selectedSlip.fonction}</p>
                <p className="text-[11px] text-gray-500">ID Employé: {String(selectedSlip.employeId).replace(/\D/g, '') || selectedSlip.employeId}</p>
              </div>
            </div>

            {/* Middle Section */}
            <div className="mb-8 flex justify-between border-b border-gray-200 pb-6 text-[13px] font-bold text-gray-800">
              <div>
                <p>
                  Période: <span className="uppercase">{formatMonthYearDisplay(selectedSlip.mois)}</span>
                </p>
                <p className="mt-2">Réf: {String(selectedSlip.id).replace(/\D/g, '') || selectedSlip.id}</p>
              </div>
              <div className="text-right">
                <p>Date de paiement: {selectedSlip.datePaiement || "En attente"}</p>
                <p className="mt-2">
                  Mode: <span className="capitalize">{selectedSlip.modePaiement}</span>
                </p>
              </div>
            </div>

            {/* Table Section */}
            <table className="mb-12 w-full text-left text-[13px] text-gray-800">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-2.5 font-bold">Rubrique / Description</th>
                  <th className="p-2.5 text-right font-bold">
                    Montant ({selectedSlip.devise === "HTG" ? "Gdes" : "$"})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-2.5">
                    Salaire Brut Base
                    {selectedSlip.typeSalaire === "variable" && selectedSlip.nombreSeances ? (
                      <span className="block text-[11px] text-gray-500">
                        (Salaire variable : {selectedSlip.nombreSeances} séance(s) × {formatAmountWithDevise(selectedSlip.tauxParSeance || 0, selectedSlip.devise)})
                      </span>
                    ) : (
                      <span className="block text-[11px] text-gray-500">(Salaire fixe mensuel)</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-medium">
                    {formatAmountWithDevise(selectedSlip.salaireBase, selectedSlip.devise)}
                  </td>
                </tr>

                {selectedSlip.bonus > 0 && (
                  <tr>
                    <td className="p-2.5">Primes / Extra / Bonus</td>
                    <td className="p-2.5 text-right font-medium text-emerald-600">
                      +{formatAmountWithDevise(selectedSlip.bonus, selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {selectedSlip.vacancesPayees > 0 && (
                  <tr>
                    <td className="p-2.5">Vacances Payées</td>
                    <td className="p-2.5 text-right font-medium text-emerald-600">
                      +{formatAmountWithDevise(selectedSlip.vacancesPayees, selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {(() => {
                  const baseSalary = selectedSlip.salaireBase || 0;
                  const isExempt = (selectedSlip.devise || "HTG") === "HTG" && baseSalary <= 5000;
                  const taxAmount = isExempt ? 0 : getPrelevementAmount(selectedSlip);
                  const taxPercent = isExempt ? 0 : (selectedSlip.prelevementPourcentage ?? getDefaultTaxPercentage(baseSalary, selectedSlip.devise));
                  if (taxAmount <= 0 && taxPercent <= 0) return null;

                  return (
                    <tr>
                      <td className="p-2.5">
                        Taxe sur le Revenu ({taxPercent}%)
                      </td>
                      <td className="p-2.5 text-right font-medium text-rose-600">
                        -{formatAmountWithDevise(taxAmount, selectedSlip.devise)}
                      </td>
                    </tr>
                  );
                })()}

                {(selectedSlip.taxeIRI || 0) > 0 && (
                  <tr>
                    <td className="p-2.5">IRI ({selectedSlip.taxeIRI}%)</td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      -{formatAmountWithDevise(calculatePrelevement(selectedSlip.salaireBase, selectedSlip.taxeIRI || 0), selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {(selectedSlip.taxeCFGDCT || 0) > 0 && (
                  <tr>
                    <td className="p-2.5">CFGDCT ({selectedSlip.taxeCFGDCT}%)</td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      -{formatAmountWithDevise(calculatePrelevement(selectedSlip.salaireBase, selectedSlip.taxeCFGDCT || 0), selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {(selectedSlip.taxeCAS || 0) > 0 && (
                  <tr>
                    <td className="p-2.5">CAS ({selectedSlip.taxeCAS}%)</td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      -{formatAmountWithDevise(calculatePrelevement(selectedSlip.salaireBase, selectedSlip.taxeCAS || 0), selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {(selectedSlip.taxeFDU || 0) > 0 && (
                  <tr>
                    <td className="p-2.5">FDU ({selectedSlip.taxeFDU}%)</td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      -{formatAmountWithDevise(calculatePrelevement(selectedSlip.salaireBase, selectedSlip.taxeFDU || 0), selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {(selectedSlip.taxeONA || 0) > 0 && (
                  <tr>
                    <td className="p-2.5">ONA ({selectedSlip.taxeONA}%)</td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      -{formatAmountWithDevise(calculatePrelevement(selectedSlip.salaireBase, selectedSlip.taxeONA || 0), selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {(selectedSlip.prelevementSnowizz || 0) > 0 && (
                  <tr>
                    <td className="p-2.5">Prélèvement Snowizz / Prêt</td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      -{formatAmountWithDevise(selectedSlip.prelevementSnowizz || 0, selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {(selectedSlip.ajustement || 0) !== 0 && (
                  <tr>
                    <td className="p-2.5">Ajustement</td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      {(selectedSlip.ajustement || 0) > 0 ? "-" : "+"}{formatAmountWithDevise(Math.abs(selectedSlip.ajustement || 0), selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {(selectedSlip.prelevementAvance || 0) > 0 && (
                  <tr>
                    <td className="p-2.5">
                      Prélèvement sur salaire (
                      {selectedSlip.prelevementType === "avance"
                        ? "Avance sur salaire"
                        : selectedSlip.prelevementType === "pret"
                          ? "Remboursement Prêt"
                          : selectedSlip.prelevementType === "credit"
                            ? "Compte à crédit"
                            : "Prélèvement divers"}
                      )
                    </td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      -{formatAmountWithDevise(selectedSlip.prelevementAvance || 0, selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                {selectedSlip.congeSansSolde > 0 && (
                  <tr>
                    <td className="p-2.5">Déduction Congé sans solde</td>
                    <td className="p-2.5 text-right font-medium text-rose-600">
                      -{formatAmountWithDevise(selectedSlip.congeSansSolde, selectedSlip.devise)}
                    </td>
                  </tr>
                )}

                <tr className="border-t bg-gray-50 font-bold">
                  <td className="p-2.5 text-sm">MONTANT NET À PAYER</td>
                  <td className="p-2.5 text-right text-sm font-extrabold text-brand-700">
                    {formatAmountWithDevise(selectedSlip.netAPayer, selectedSlip.devise)}
                  </td>
                </tr>

                <tr className="border-t bg-gray-100/70 font-semibold text-gray-700">
                  <td className="p-2.5 text-xs uppercase">CUMUL DES PAIEMENTS (Historique versé)</td>
                  <td className="p-2.5 text-right text-xs font-bold">
                    {formatAmountWithDevise(selectedSlip.cumulPaiements || selectedSlip.netAPayer, selectedSlip.devise)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signatures */}
            <div className="mt-20 flex justify-between text-[12px] font-bold text-gray-800">
              <div className="w-56">
                <p>Signature de l'Employé</p>
                <div className="mt-12 border-b-2 border-gray-200"></div>
              </div>
              <div className="w-56 text-right">
                <p>Pour la Direction FC TORO</p>
                <div className="mt-12 border-b-2 border-gray-200"></div>
              </div>
            </div>


          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer la fiche de paie"
        message={`Êtes-vous sûr de vouloir supprimer la fiche de paie de ${deletingRecord?.employePrenom} ${deletingRecord?.employeNom} (${deletingRecord ? formatMonthYearDisplay(deletingRecord.mois) : ""}) ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        isDestructive
      />
    </div>
  );
}
