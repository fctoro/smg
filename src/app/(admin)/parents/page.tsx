"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useConfirm } from "@/hooks/useConfirm";
import ParentTable from "@/components/club/ParentTable";
import { useClubData } from "@/context/ClubDataContext";
import { getParentLinkedPlayerIds } from "@/lib/club/parents";
import { deleteParentInSupabase } from "@/lib/club/supabase-crud";

export default function ParentsPage() {
  const router = useRouter();
  const { parents, setParents, players } = useClubData();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { confirm, ConfirmComponent } = useConfirm();

  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des parents au format CSV ?",
      onConfirm: () => {
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
      }
    });
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des parents au format Excel ?",
      onConfirm: () => {
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
      }
    });
  };

  const handleDeleteParent = (parentId: string) => {
    const target = parents.find((p) => p.id === parentId);
    if (!target) return;

    confirm({
      title: "Supprimer le parent",
      message: `Voulez-vous vraiment supprimer le parent ${target.prenom} ${target.nom} ?`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteParentInSupabase(getParentLinkedPlayerIds(target));
          setParents((prev) => prev.filter((p) => p.id !== parentId));
        } catch (error) {
          alert("Erreur lors de la suppression. Veuillez réessayer.");
        }
      }
    });
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
        }
      />
      <ConfirmComponent />
    </div>
  );
}
