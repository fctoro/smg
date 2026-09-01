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

import { ParentEditModal } from "@/components/club/modals/ParentEditModal";
import { ParentAddModal } from "@/components/club/modals/ParentAddModal";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";
import { Parent } from "@/types/club";

export default function ParentsPage() {
  const router = useRouter();
  const { parents, setParents, players } = useClubData();
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { confirm, ConfirmComponent } = useConfirm();

  const [selectedEditParent, setSelectedEditParent] = useState<Parent | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
          setToast({ message: `Parent ${target.prenom} ${target.nom} supprimé avec succès !`, type: "success" });
          setTimeout(() => setToast(null), 3000);
        } catch (error) {
          setToast({ message: "Erreur lors de la suppression.", type: "error" });
          setTimeout(() => setToast(null), 3000);
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
        onEditParent={(parent) => setSelectedEditParent(parent)}
        onDeleteParent={(parent) => handleDeleteParent(parent.id)}
        actionButton={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 cursor-pointer"
          >
            + Ajouter un parent
          </button>
        }
      />
      
      <ParentEditModal
        isOpen={!!selectedEditParent}
        onClose={() => setSelectedEditParent(null)}
        parent={selectedEditParent}
      />
      
      <ParentAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      
      <ConfirmComponent />
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
