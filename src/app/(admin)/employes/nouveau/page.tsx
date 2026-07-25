"use client";

import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EmployeeForm from "@/components/club/forms/EmployeeForm";
import { useClubData } from "@/context/ClubDataContext";
import { Employee, EmployeeFormValues } from "@/types/club";
import { addEmployeeToSupabase } from "@/lib/club/supabase-crud";

export default function NewEmployeePage() {
  const router = useRouter();
  const { setEmployees } = useClubData();

  const handleSubmit = async (values: EmployeeFormValues) => {
    const newEmployeeLocal: Employee = {
      id: `emp-temp-${Date.now()}`,
      employeId: Date.now(),
      ...values,
      photoUrl: "/images/user/silhouette.svg",
    };
    
    try {
      const inserted = await addEmployeeToSupabase(newEmployeeLocal);
      if (inserted && inserted.EmployeId) {
        const newEmployee = { ...newEmployeeLocal, id: String(inserted.EmployeId), employeId: inserted.EmployeId };
        setEmployees((prev) => [newEmployee, ...prev]);
        router.push("/employes");
      }
    } catch (error) {
      alert("Erreur lors de l'ajout. Veuillez réessayer.");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Ajouter un employé" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <EmployeeForm
          onCancel={() => router.push("/employes")}
          onSubmit={handleSubmit}
          submitLabel="Enregistrer"
        />
      </div>
    </div>
  );
}
