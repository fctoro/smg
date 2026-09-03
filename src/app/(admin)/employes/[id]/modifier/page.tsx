"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EmployeeForm from "@/components/club/forms/EmployeeForm";
import { useClubData } from "@/context/ClubDataContext";
import { EmployeeFormValues } from "@/types/club";
import { updateEmployeeInSupabase } from "@/lib/club/supabase-crud";

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const empId = params.id;
  const { employees, setEmployees, setPayrollRecords } = useClubData();

  const targetEmployee = employees.find((emp) => emp.id === empId);

  if (!targetEmployee) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Modifier employé" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
          Employé introuvable.
        </div>
        <Link
          href="/employes"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Retour à la liste des employés
        </Link>
      </div>
    );
  }

  const handleSubmit = async (values: EmployeeFormValues) => {
    try {
      await updateEmployeeInSupabase(empId, values);
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === empId ? { ...emp, ...values } : emp,
        ),
      );
      setPayrollRecords((prev) =>
        prev.map((rec) =>
          String(rec.employeId) === String(empId)
            ? {
                ...rec,
                employeNom: values.nom ?? rec.employeNom,
                employePrenom: values.prenom ?? rec.employePrenom,
                fonction: values.fonction ?? rec.fonction,
              }
            : rec,
        ),
      );
      router.push("/employes");
    } catch (error) {
      alert("Erreur lors de la modification. Veuillez réessayer.");
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={`Modifier ${targetEmployee.prenom} ${targetEmployee.nom}`} />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <EmployeeForm
          initialValues={targetEmployee}
          onCancel={() => router.push("/employes")}
          onSubmit={handleSubmit}
          submitLabel="Mettre à jour"
        />
      </div>
    </div>
  );
}
