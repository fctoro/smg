"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ParentTable from "@/components/club/ParentTable";
import { useClubData } from "@/context/ClubDataContext";
import { getParentLinkedPlayerIds } from "@/lib/club/parents";
import { deleteParentInSupabase } from "@/lib/club/supabase-crud";

export default function ParentsPage() {
  const router = useRouter();
  const { parents, setParents, players } = useClubData();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleExportCSV = () => {
    setIsExportOpen(false);
    const headers = ["Nom", "Prénom", "Lien", "Téléphone", "Email"];
    let csvContent = headers.join(",") + "\n";
    parents.forEach(p => {
      const row = [p.nom, p.prenom, p.lien, p.telephone, p.email];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "parents.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!window.confirm("Voulez-vous vraiment exporter la liste des parents au format Excel ?")) return;
    setIsExportOpen(false);
    const headers = ["Nom", "Prénom", "Lien", "Téléphone", "Email"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n";
    parents.forEach(p => {
      const row = [p.nom, p.prenom, p.lien, p.telephone, p.email];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(";") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "parents_excel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteParent = async (parentId: string) => {
    const target = parents.find((p) => p.id === parentId);
    if (!target) return;

    if (!window.confirm(`Supprimer le parent ${target.prenom} ${target.nom} ?`)) {
      return;
    }
    
    try {
      await deleteParentInSupabase(getParentLinkedPlayerIds(target));
      setParents((prev) => prev.filter((p) => p.id !== parentId));
    } catch (error) {
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Parents" />

      <ParentTable
        parents={parents}
        players={players}
        onEditParent={(parent) => router.push(`/parents/${parent.id}/modifier`)}
        onDeleteParent={(parent) => handleDeleteParent(parent.id)}
        actionButton={
          <Link
            href="/parents/nouveau"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            + Ajouter un parent
          </Link>
        }
        exportButton={
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-success-500 px-3 text-sm font-medium text-white shadow-theme-xs hover:bg-success-600"
            >
              Exporter
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
        }
      />
    </div>
  );
}
