"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EmployeeTable from "@/components/club/EmployeeTable";
import { useClubData } from "@/context/ClubDataContext";
import { softDeleteEmployeeInSupabase } from "@/lib/club/supabase-crud";

export default function EmployesPage() {
  const router = useRouter();
  const { employees, setEmployees } = useClubData();

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

      <div className="mb-6 flex items-center justify-end">
        <Link
          href="/employes/nouveau"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          + Ajouter un employé
        </Link>
      </div>

      <EmployeeTable
        employees={employees}
        onEditEmployee={(emp) => router.push(`/employes/${emp.id}/modifier`)}
        onDeleteEmployee={(emp) => handleDeleteEmployee(emp.id)}
      />
    </div>
  );
}
