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
  const { employees, setEmployees } = useClubData();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
