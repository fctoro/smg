"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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

import { useClubData } from "@/context/ClubDataContext";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";

const getSafeAvatarSrc = (photoUrl?: string) => {
  const trimmed = (photoUrl || "").trim();
  if (trimmed.length > 0 && !trimmed.includes("user-01")) {
    return trimmed;
  }
  return "/images/user/silhouette.svg";
};

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
  const { hydrated } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fonctionFilter, setFonctionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(100);

  const fonctions = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.fonction || e.role || "Non spécifié"))).filter(Boolean);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees
      .filter((emp) => {
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
      })
      .sort((a, b) => {
        const nomA = (a.nom || "").trim();
        const nomB = (b.nom || "").trim();
        const nomCompare = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
        if (nomCompare !== 0) return nomCompare;

        const prenomA = (a.prenom || "").trim();
        const prenomB = (b.prenom || "").trim();
        return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
      });
  }, [searchQuery, employees, statusFilter, fonctionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedEmployees = filteredEmployees.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* En-tête avec Titre à gauche, Boutons d'action à droite */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filteredEmployees.length} employé(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actionButton ? (
            <div className="shrink-0">{actionButton}</div>
          ) : null}
          {exportButton ? (
            <div className="shrink-0">{exportButton}</div>
          ) : null}
        </div>
      </div>

      {/* Barre d'outils de filtres */}
      {showToolbar ? (
        <div className="mb-4 grid flex-1 gap-2 grid-cols-1 sm:grid-cols-3 min-w-0">
          <div className="min-w-0">
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher par nom, fonction, email..."
              className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div className="min-w-0">
            <select
              value={fonctionFilter}
              onChange={(event) => {
                setFonctionFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes fonctions</option>
              {fonctions.map((f, idx) => (
                <option key={idx} value={f}>
                  {f.length > 28 ? f.slice(0, 26) + "..." : f}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Photo + Nom
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Fonction / Rôle
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Contact
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Salaire & Devise
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Date d'embauche
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Statut
              </TableCell>
              {(onEditEmployee || onDeleteEmployee) && (
                <TableCell
                  isHeader
                  className="py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {!hydrated && pagedEmployees.length === 0 ? (
              <TableBodySkeleton rows={5} columns={7} />
            ) : pagedEmployees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Aucun employé trouvé.
                </TableCell>
              </TableRow>
            ) : (
              pagedEmployees.map((emp) => {
                const isInactive = Boolean(emp.desactive);
                return (
                  <TableRow
                    key={emp.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="py-3 font-medium text-gray-800 dark:text-white/90">
                      <div className="flex items-center gap-3">
                        <Image
                          width={40}
                          height={40}
                          src={getSafeAvatarSrc(emp.photoUrl)}
                          alt={`${emp.prenom || ""} ${emp.nom || ""}`}
                          className="h-10 w-10 rounded-full object-cover shadow-xs border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-0.5"
                          unoptimized
                        />
                        <div>
                          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                            {emp.prenom} {emp.nom}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <Badge
                        variant="light"
                        color={fonctionBadgeColor(emp.fonction || emp.role || "")}
                        size="sm"
                      >
                        {emp.fonction || emp.role || "Non spécifié"}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        {emp.email && <p className="text-xs text-gray-800 dark:text-gray-200">{emp.email}</p>}
                        {emp.telephone && <p className="text-xs text-gray-500">{emp.telephone}</p>}
                        {!emp.email && !emp.telephone && <span className="text-gray-400">-</span>}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                      {emp.salaire ? (
                        <span>
                          {(emp.devise === "HTG" || (emp.salaire && emp.salaire >= 1000))
                            ? `${emp.salaire.toLocaleString("fr-FR")} HTG`
                            : `$${emp.salaire.toLocaleString("en-US")}`}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatClubDate(emp.dateEmbauche)}
                    </TableCell>

                    <TableCell className="py-3">
                      <Badge
                        variant="light"
                        color={isInactive ? "error" : "success"}
                        size="sm"
                      >
                        {isInactive ? "Inactif" : "Actif"}
                      </Badge>
                    </TableCell>

                    {(onEditEmployee || onDeleteEmployee) && (
                      <TableCell className="py-3 text-end">
                        <div className="flex items-center justify-end gap-3">
                          {onEditEmployee && (
                            <button
                              type="button"
                              onClick={() => onEditEmployee(emp)}
                              className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                              aria-label="Modifier"
                              title="Modifier"
                            >
                              <PencilIcon className="size-5" />
                            </button>
                          )}
                          {onDeleteEmployee && (
                            <button
                              type="button"
                              onClick={() => onDeleteEmployee(emp)}
                              className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                              aria-label="Supprimer"
                              title="Supprimer"
                            >
                              <TrashBinIcon className="size-5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
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
  );
}
