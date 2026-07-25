"use client";

import EmployeeTable from "./EmployeeTable";
import { StaffMember } from "@/types/club";

interface StaffTableProps {
  staff: StaffMember[];
  onEditStaff?: (member: StaffMember) => void;
  onDeleteStaff?: (member: StaffMember) => void;
}

export default function StaffTable({
  staff,
  onEditStaff,
  onDeleteStaff,
}: StaffTableProps) {
  return (
    <EmployeeTable
      employees={staff}
      onEditEmployee={onEditStaff}
      onDeleteEmployee={onDeleteStaff}
    />
  );
}
