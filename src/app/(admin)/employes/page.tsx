"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useConfirm } from "@/hooks/useConfirm";
import EmployeeTable from "@/components/club/EmployeeTable";
import { useClubData } from "@/context/ClubDataContext";
import { softDeleteEmployeeInSupabase } from "@/lib/club/supabase-crud";

import { EmployeeEditModal } from "@/components/club/modals/EmployeeEditModal";
import { EmployeeAddModal } from "@/components/club/modals/EmployeeAddModal";
import { Employee } from "@/types/club";

export default function EmployesPage() {
  const router = useRouter();
  const { employees, setEmployees } = useClubData();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { confirm, ConfirmComponent } = useConfirm();

  const [selectedEditEmployee, setSelectedEditEmployee] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des employés au format CSV ?",
      onConfirm: () => {
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
      }
    });
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des employés au format Excel ?",
      onConfirm: () => {
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
      }
    });
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const target = employees.find((emp) => emp.id === employeeId);
    if (!target) return;

    confirm({
      title: "Supprimer l'employé",
      message: `Voulez-vous vraiment supprimer l'employé ${target.prenom} ${target.nom} ?`,
      isDestructive: true,
      onConfirm: async () => {
        setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
        try {
          await softDeleteEmployeeInSupabase(employeeId);
        } catch (error) {
          console.error("Erreur soft delete employé:", error);
        }
      }
    });
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Employés" />

      <EmployeeTable
        employees={employees}
        onEditEmployee={(emp) => setSelectedEditEmployee(emp)}
        onDeleteEmployee={(emp) => handleDeleteEmployee(emp.id)}
        actionButton={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 cursor-pointer"
          >
            + Ajouter un employé
          </button>
        }
        exportButton={
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
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
      
      <EmployeeEditModal
        isOpen={!!selectedEditEmployee}
        onClose={() => setSelectedEditEmployee(null)}
        employee={selectedEditEmployee}
      />
      
      <EmployeeAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      
      <ConfirmComponent />
    </div>
  );
}
