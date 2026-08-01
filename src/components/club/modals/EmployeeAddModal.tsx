import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import EmployeeForm from "@/components/club/forms/EmployeeForm";
import { Employee, EmployeeFormValues } from "@/types/club";
import { useClubData } from "@/context/ClubDataContext";
import { addEmployeeToSupabase } from "@/lib/club/supabase-crud";

interface EmployeeAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeAddModal({ isOpen, onClose }: EmployeeAddModalProps) {
  const { setEmployees } = useClubData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: EmployeeFormValues) => {
    setIsSubmitting(true);
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
        onClose();
      } else {
        alert("Erreur lors de la création. Aucune ID retournée.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajout. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Ajouter un employé
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Remplissez les informations du nouvel employé
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <EmployeeForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel="Enregistrer"
          />
        </div>
      </div>
    </Modal>
  );
}
