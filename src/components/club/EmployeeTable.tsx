"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/tables/Pagination";
import Badge from "@/components/ui/badge/Badge";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Employee } from "@/types/club";
import { formatClubDate } from "@/lib/club/metrics";

interface EmployeeTableProps {
  employees: Employee[];
  title?: string;
  showToolbar?: boolean;
  actionButton?: React.ReactNode;
  exportButton?: React.ReactNode;
  onEditEmployee?: (employee: Employee) => void;
  onDeleteEmployee?: (employee: Employee) => void;
}

const fonctionBadgeColor = (fonction: string) => {
  const f = (fonction || "").toLowerCase();
  if (f.includes("directeur") || f.includes("responsable")) {
    return "primary";
  }
  if (f.includes("assistant") || f.includes("secretaire")) {
    return "warning";
  }
  if (f.includes("chauffeur") || f.includes("gardien") || f.includes("services")) {
    return "info";
  }
  return "success";
};

export default function EmployeeTable({
  employees,
  onEditEmployee,
  onDeleteEmployee,
  title = "Employés",
  showToolbar = true,
  actionButton,
  exportButton,
}: EmployeeTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fonctionFilter, setFonctionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  const fonctions = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.fonction || e.role || "Non spécifié"))).filter(Boolean);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      const isInactive = Boolean(emp.desactive);
      const empStatus = isInactive ? "inactif" : "actif";
      if (statusFilter !== "all" && empStatus !== statusFilter) return false;

      const empFunc = emp.fonction || emp.role || "Non spécifié";
      if (fonctionFilter !== "all" && empFunc !== fonctionFilter) return false;

      if (!query) return true;
      const fullName = `${emp.prenom} ${emp.nom}`.toLowerCase();
      const reversedName = `${emp.nom} ${emp.prenom}`.toLowerCase();
      const func = (emp.fonction || emp.role || "").toLowerCase();
      const mail = (emp.email || "").toLowerCase();
      const phone = (emp.telephone || "").toLowerCase();
      const addr = (emp.adresse || "").toLowerCase();

      return (
        fullName.includes(query) ||
        reversedName.includes(query) ||
        func.includes(query) ||
        mail.includes(query) ||
        phone.includes(query) ||
        addr.includes(query)
      );
    });
  }, [searchQuery, employees, statusFilter, fonctionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedEmployees = filteredEmployees.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  return (
    <div className="space-y-4">
      {showToolbar || actionButton ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {showToolbar ? (
            <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Rechercher par nom, fonction, email, téléphone..."
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <select
                value={fonctionFilter}
                onChange={(event) => {
                  setFonctionFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">Toutes fonctions</option>
                {fonctions.map((f, idx) => (
                  <option key={idx} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">Tous statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          ) : null}

          {actionButton ? (
            <div className="shrink-0">{actionButton}</div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredEmployees.length} employé(s)
            </p>
          </div>
          {exportButton ? (
            <div className="shrink-0">{exportButton}</div>
          ) : null}
        </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Nom & Prénom
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Fonction / Poste
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Sexe
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Téléphone
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Email
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Adresse
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Statut
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {pagedEmployees.length === 0 ? (
              <TableRow>
                <td
                  colSpan={8}
                  className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                >
                  Aucun employé trouvé.
                </td>
              </TableRow>
            ) : (
              pagedEmployees.map((emp) => {
                const isInactive = Boolean(emp.desactive);
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {emp.prenom} {emp.nom}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <Badge size="sm" color={fonctionBadgeColor(emp.fonction || emp.role || "")}>
                        {emp.fonction || emp.role || "Non spécifié"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {emp.sexe || "-"}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {emp.telephone || "-"}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {emp.email || "-"}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {emp.adresse || "-"}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <Badge size="sm" color={isInactive ? "error" : "success"}>
                        {isInactive ? "Inactif" : "Actif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
                          onClick={() => onDeleteEmployee?.(emp)}
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          <TrashBinIcon className="size-5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          onClick={() => onEditEmployee?.(emp)}
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <PencilIcon className="size-5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex justify-end">
        <Pagination
          currentPage={currentPageSafe}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={currentPageSize}
          onPageSizeChange={(size) => {
            setCurrentPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
      </div>
    </div>
  );
}
