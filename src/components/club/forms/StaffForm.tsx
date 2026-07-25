"use client";

import EmployeeForm from "./EmployeeForm";
import { StaffFormValues } from "@/types/club";

interface StaffFormProps {
  initialValues?: Partial<StaffFormValues>;
  onSubmit: (values: StaffFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function StaffForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: StaffFormProps) {
  return (
    <EmployeeForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel={submitLabel}
    />
  );
}
