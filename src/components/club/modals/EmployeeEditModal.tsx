import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import EmployeeForm from "@/components/club/forms/EmployeeForm";
import { Employee, EmployeeFormValues } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { updateEmployeeInSupabase } from "@/lib/club/supabase-crud";

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const { setEmployees, setPayrollRecords } = useClubData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!employee) return null;

  const handleSubmit = async (values: EmployeeFormValues) => {
    setIsSubmitting(true);
    try {
      await updateEmployeeInSupabase(employee.id, values);
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id ? { ...emp, ...values } : emp,
        ),
      );
      setPayrollRecords((prev) =>
        prev.map((rec) =>
          String(rec.employeId) === String(employee.id)
            ? {
                ...rec,
                employeNom: values.nom ?? rec.employeNom,
                employePrenom: values.prenom ?? rec.employePrenom,
                fonction: values.fonction ?? rec.fonction,
              }
            : rec,
        ),
      );
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la modification. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Modifier l'employé
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mettez à jour les informations de {employee.prenom} {employee.nom}.
          </p>
        </div>
        
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <EmployeeForm
            initialValues={employee}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel="Mettre à jour"
          />
        </div>
      </div>
    </Modal>
  );
};
