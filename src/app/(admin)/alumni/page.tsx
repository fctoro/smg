"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import Pagination from "@/components/tables/Pagination";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { useClubData } from "@/context/ClubDataContext";
import { softDeletePlayerInSupabase } from "@/lib/club/supabase-crud";
import { useConfirm } from "@/hooks/useConfirm";
import { AlumniAddModal } from "@/components/club/modals/AlumniAddModal";
import { AlumniEditModal } from "@/components/club/modals/AlumniEditModal";
import { Alumni } from "@/types/club";

export default function AlumniPage() {
  const router = useRouter();
  const { alumni, setPlayers } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [situationFilter, setSituationFilter] = useState("all");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { confirm, ConfirmComponent } = useConfirm();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEditAlumni, setSelectedEditAlumni] = useState<Alumni | null>(null);

  const situations = useMemo(() => {
    return Array.from(new Set(alumni.map(a => a.statut).filter(Boolean)));
  }, [alumni]);

  const filteredAlumni = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return alumni.filter((entry) => {
      if (situationFilter !== "all" && entry.statut !== situationFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        (entry.nom || "").toLowerCase().includes(query) ||
        (entry.prenom || "").toLowerCase().includes(query) ||
        (entry.poste || "").toLowerCase().includes(query) ||
        (entry.statut || "").toLowerCase().includes(query)
      );
    });
  }, [alumni, searchQuery, situationFilter]);

  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des alumni au format CSV ?",
      onConfirm: () => {
        const headers = ["Nom", "Prénom", "Poste", "Statut"];
        let csvContent = headers.join(",") + "\n";
        filteredAlumni.forEach(entry => {
          const row = [entry.nom, entry.prenom, entry.poste, entry.statut];
          const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
          csvContent += csvRow.join(",") + "\n";
        });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "alumni.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des alumni au format Excel ?",
      onConfirm: () => {
        const headers = ["Nom", "Prénom", "Poste", "Statut"];
        let csvContent = "\uFEFF" + headers.join(";") + "\n";
        filteredAlumni.forEach(entry => {
          const row = [entry.nom, entry.prenom, entry.poste, entry.statut];
          const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
          csvContent += csvRow.join(";") + "\n";
        });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "alumni_excel.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleDelete = (alumniId: string) => {
    const target = alumni.find((entry) => entry.id === alumniId);
    if (!target) return;
    
    confirm({
      title: "Supprimer l'alumni",
      message: `Voulez-vous vraiment supprimer ${target.nom} ?`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await softDeletePlayerInSupabase(alumniId);
          setPlayers((prevEntries) =>
            prevEntries.filter((entry) => entry.id !== alumniId),
          );
        } catch (error) {
          alert("Erreur lors de la suppression.");
        }
      }
    });
  };

  return (
    <div className="space-y-3">
      <PageBreadcrumb pageTitle="Alumni" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-2">
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher un alumni"
            className="h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <select
            value={situationFilter}
            onChange={(e) => {
              setSituationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-11 w-48 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">Toutes situations</option>
            {situations.map((sit, idx) => (
              <option key={idx} value={sit}>
                {sit}
              </option>
            ))}
          </select>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            + Ajouter un alumni
          </button>
        </div>
      </div>

      {(() => {
        const totalPages = Math.max(1, Math.ceil(filteredAlumni.length / currentPageSize));
        const currentPageSafe = Math.min(currentPage, totalPages);
        const pagedAlumni = filteredAlumni.slice(
          (currentPageSafe - 1) * currentPageSize,
          currentPageSafe * currentPageSize,
        );

        return (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-3 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Alumni
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {filteredAlumni.length} alumni(s)
                  </p>
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <path d="M14 2v6h6"></path>
                      <path d="M8 13h2"></path>
                      <path d="M14 13h2"></path>
                      <path d="M8 17h2"></path>
                      <path d="M14 17h2"></path>
                    </svg>
                    Exporter Excel / CSV
                  </button>
                  <Dropdown
                    isOpen={isExportOpen}
                    onClose={() => setIsExportOpen(false)}
                    className="absolute right-0 top-full mt-1 w-40"
                  >
                    <DropdownItem
                      onItemClick={handleExportExcel}
                      className="cursor-pointer"
                    >
                      Excel
                    </DropdownItem>
                    <DropdownItem
                      onItemClick={handleExportCSV}
                      className="cursor-pointer"
                    >
                      CSV
                    </DropdownItem>
                  </Dropdown>
                </div>
              </div>

              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        Nom
                      </TableCell>
                      <TableCell
                        isHeader
                        className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        Prénom
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
                        Poste
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
                    {pagedAlumni.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                        >
                          Aucun alumni trouve.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedAlumni.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                            {entry.nom}
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                            {entry.prenom}
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                            {entry.sexe}
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                            {entry.poste}
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${entry.statut === 'actif' ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                              {entry.statut}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                                onClick={() => setSelectedEditAlumni(entry)}
                                aria-label="Modifier"
                                title="Modifier"
                              >
                                <PencilIcon className="size-5" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center text-error-500 transition hover:text-error-600 dark:text-error-500 dark:hover:text-error-400 cursor-pointer"
                                onClick={() => handleDelete(entry.id)}
                                aria-label="Supprimer"
                                title="Supprimer"
                              >
                                <TrashBinIcon className="size-5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex justify-end">
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
              <AlumniAddModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
              />
              <AlumniEditModal
                isOpen={!!selectedEditAlumni}
                onClose={() => setSelectedEditAlumni(null)}
                alumniEntry={selectedEditAlumni}
              />
              <ConfirmComponent />
            </div>
          </>
        );
      })()}
    </div>
  );
}