"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EmployeeTable from "@/components/club/EmployeeTable";
import { useClubData } from "@/context/ClubDataContext";
import { softDeleteEmployeeInSupabase } from "@/lib/club/supabase-crud";

export default function EmployesPage() {
  const router = useRouter();
  const { employees, setEmployees } = useClubData();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleExportCSV = () => {
    setIsExportOpen(false);
    const headers = ["Nom", "Prénom", "Fonction", "Sexe", "Téléphone", "Email", "Statut"];
    let csvContent = headers.join(",") + "\n";
    employees.forEach(emp => {
      const row = [emp.nom, emp.prenom, emp.fonction || emp.role, emp.sexe, emp.telephone, emp.email, emp.desactive ? "Inactif" : "Actif"];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "employes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!window.confirm("Voulez-vous vraiment exporter la liste des employés au format Excel ?")) return;
    setIsExportOpen(false);
    const headers = ["Nom", "Prénom", "Fonction", "Sexe", "Téléphone", "Email", "Statut"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n";
    employees.forEach(emp => {
      const row = [emp.nom, emp.prenom, emp.fonction || emp.role, emp.sexe, emp.telephone, emp.email, emp.desactive ? "Inactif" : "Actif"];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(";") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "employes_excel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    const target = employees.find((emp) => emp.id === employeeId);
    if (!target) {
      return;
    }

    if (!window.confirm(`Supprimer l'employé ${target.prenom} ${target.nom} ?`)) {
      return;
    }
    
    try {
      await softDeleteEmployeeInSupabase(employeeId);
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
    } catch (error) {
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Employés" />

      <EmployeeTable
        employees={employees}
        onEditEmployee={(emp) => router.push(`/employes/${emp.id}/modifier`)}
        onDeleteEmployee={(emp) => handleDeleteEmployee(emp.id)}
        actionButton={
          <Link
            href="/employes/nouveau"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            + Ajouter un employé
          </Link>
        }
        exportButton={
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-success-500 px-3 text-sm font-medium text-white shadow-theme-xs hover:bg-success-600"
            >
              Exporter
            </button>
            <Dropdown
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              className="absolute right-0 top-full mt-1 w-40"
            >
              <DropdownItem
                onItemClick={handleExportExcel}
                className="cursor-pointer"
              >
                Excel
              </DropdownItem>
              <DropdownItem
                onItemClick={handleExportCSV}
                className="cursor-pointer"
              >
                CSV
              </DropdownItem>
            </Dropdown>
          </div>
        }
      />
    </div>
  );
}
