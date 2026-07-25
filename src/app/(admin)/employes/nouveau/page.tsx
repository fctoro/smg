"use client";

import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EmployeeForm from "@/components/club/forms/EmployeeForm";
import { useClubData } from "@/context/ClubDataContext";
import { Employee, EmployeeFormValues } from "@/types/club";

export default function NewEmployeePage() {
  const router = useRouter();
  const { setEmployees } = useClubData();

  const handleSubmit = (values: EmployeeFormValues) => {
    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      employeId: Date.now(),
      ...values,
      photoUrl: "/images/user/silhouette.svg",
    };
    setEmployees((prev) => [newEmployee, ...prev]);
    router.push("/employes");
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
