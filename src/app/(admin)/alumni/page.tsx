"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { deleteAlumniInSupabase } from "@/lib/club/supabase-crud";

export default function AlumniPage() {
  const router = useRouter();
  const { alumni, setAlumni } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAlumni = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return alumni;
    }
    return alumni.filter((entry) => {
      return (
        entry.nom.toLowerCase().includes(query) ||
        entry.poste.toLowerCase().includes(query) ||
        entry.situationActuelle.toLowerCase().includes(query)
      );
    });
  }, [alumni, searchQuery]);

  const handleDelete = async (alumniId: string) => {
    const target = alumni.find((entry) => entry.id === alumniId);
    if (!target) {
      return;
    }
    if (!window.confirm(`Supprimer ${target.nom} ?`)) {
      return;
    }
    try {
      await deleteAlumniInSupabase(alumniId);
      setAlumni((prevEntries) =>
        prevEntries.filter((entry) => entry.id !== alumniId),
      );
    } catch (error) {
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Alumni" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Rechercher un alumni"
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 sm:max-w-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
        <Link
          href="/alumni/nouveau"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          + Ajouter un alumni
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
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
                  Periode club
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
                  Situation actuelle
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
              {filteredAlumni.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    Aucun alumni trouve.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlumni.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                      {entry.nom}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {entry.anneeEntree} - {entry.anneeSortie}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {entry.poste}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {entry.situationActuelle}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          onClick={() => router.push(`/alumni/${entry.id}/modifier`)}
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <PencilIcon className="size-5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-gray-500 transition hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
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
      </div>
    </div>
  );
}
