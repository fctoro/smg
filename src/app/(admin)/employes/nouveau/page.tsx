"use client";

import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EmployeeForm from "@/components/club/forms/EmployeeForm";
import { useClubData } from "@/context/ClubDataContext";
import { Employee, EmployeeFormValues } from "@/types/club";
import { addEmployeeToSupabase } from "@/lib/club/supabase-crud";

export default function NewEmployeePage() {
  const router = useRouter();
  const { employees, setEmployees } = useClubData();

  const handleSubmit = async (values: EmployeeFormValues) => {
    // Vérification anti-doublon
    const normalize = (str: string) =>
      (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const nomInput = normalize(values.nom);
    const prenomInput = normalize(values.prenom);
    const emailInput = normalize(values.email);
    const phoneInput = (values.telephone || "").replace(/\D/g, "");

    const duplicate = employees.find((emp) => {
      const empNom = normalize(emp.nom);
      const empPrenom = normalize(emp.prenom);
      const empEmail = normalize(emp.email);
      const empPhone = (emp.telephone || "").replace(/\D/g, "");

      if (nomInput && prenomInput && empNom === nomInput && empPrenom === prenomInput) {
        return true;
      }
      if (emailInput && empEmail && empEmail === emailInput) {
        return true;
      }
      if (phoneInput && phoneInput.length >= 7 && empPhone && empPhone === phoneInput) {
        return true;
      }
      return false;
    });

    if (duplicate) {
      alert(
        `❌ Cet employé existe déjà dans le système : ${duplicate.nom.toUpperCase()} ${duplicate.prenom}${
          duplicate.fonction ? ` (${duplicate.fonction})` : ""
        }. L'ajout a été bloqué pour éviter les doublons.`
      );
      return;
    }

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
