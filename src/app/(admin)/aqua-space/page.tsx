"use client";

import React, { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  AquaSpaceMember,
  AquaSpacePayment,
} from "@/types/club";
import {
  fetchAquaSpaceMembers,
  createAquaSpaceMember,
  updateAquaSpaceMember,
  deleteAquaSpaceMember,
  fetchAquaSpacePayments,
  createAquaSpacePayment,
  deleteAquaSpacePayment,
} from "@/lib/club/aqua-space";
import { AquaSpaceMemberModal } from "@/components/club/modals/AquaSpaceMemberModal";
import { AquaSpacePaymentModal } from "@/components/club/modals/AquaSpacePaymentModal";
import { AquaSpaceMemberDetailsModal } from "@/components/club/modals/AquaSpaceMemberDetailsModal";
import { AquaSpaceRegistrationPrint } from "@/components/club/print/AquaSpaceRegistrationPrint";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";
import { useConfirm } from "@/hooks/useConfirm";
import {
  Waves,
  UserPlus,
  CreditCard,
  Search,
  Download,
  Eye,
  Printer,
  Edit3,
  Trash2,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  SlidersHorizontal,
  FileSpreadsheet,
  Receipt,
  UserCheck,
  Building2,
  Calendar,
} from "lucide-react";

export default function AquaSpacePage() {
  const { confirm, ConfirmComponent } = useConfirm();
  const [activeMainTab, setActiveMainTab] = useState<"swimmers" | "payments">("swimmers");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AquaSpaceMember[]>([]);
  const [payments, setPayments] = useState<AquaSpacePayment[]>([]);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<AquaSpaceMember | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPreselectedMemberId, setPaymentPreselectedMemberId] = useState<string | null>(null);

  const [detailsMember, setDetailsMember] = useState<AquaSpaceMember | null>(null);

  // Print state
  const [memberToPrint, setMemberToPrint] = useState<AquaSpaceMember | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);

  // Filters - Swimmers
  const [swimmerSearch, setSwimmerSearch] = useState("");
  const [niveauFilter, setNiveauFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");

  // Filters - Payments
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, paymentsData] = await Promise.all([
        fetchAquaSpaceMembers(),
        fetchAquaSpacePayments(),
      ]);
      setMembers(membersData);
      setPayments(paymentsData);
    } catch (err) {
      console.error("Erreur chargement Aqua Space:", err);
      setToast({ message: "Erreur de chargement des données Aqua Space.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Helper to get total payments for a member
  const getMemberFinancials = (memberId: string) => {
    const memPays = payments.filter((p) => p.memberId === memberId && p.statut === "paid");
    const htg = memPays.filter((p) => p.devise === "HTG").reduce((sum, p) => sum + p.montant, 0);
    const usd = memPays.filter((p) => p.devise === "US").reduce((sum, p) => sum + p.montant, 0);
    const hasPaid = memPays.length > 0;
    return { htg, usd, hasPaid, count: memPays.length };
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalSwimmers = members.length;
    const clubPlayersCount = members.filter((m) => Boolean(m.etudiantId)).length;
    const externalCount = totalSwimmers - clubPlayersCount;

    const totalHTG = payments
      .filter((p) => p.statut === "paid" && p.devise === "HTG")
      .reduce((s, p) => s + p.montant, 0);
    const totalUSD = payments
      .filter((p) => p.statut === "paid" && p.devise === "US")
      .reduce((s, p) => s + p.montant, 0);

    const paidSwimmersCount = members.filter((m) => getMemberFinancials(m.id).hasPaid).length;
    const pendingSwimmersCount = totalSwimmers - paidSwimmersCount;

    return {
      totalSwimmers,
      clubPlayersCount,
      externalCount,
      totalHTG,
      totalUSD,
      paidSwimmersCount,
      pendingSwimmersCount,
    };
  }, [members, payments]);

  // Filtered Swimmers
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = swimmerSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.nom.toLowerCase().includes(q) ||
        m.prenom.toLowerCase().includes(q) ||
        m.matricule.toLowerCase().includes(q) ||
        (m.parentTelephone && m.parentTelephone.includes(q)) ||
        (m.parentNom && m.parentNom.toLowerCase().includes(q));

      const matchNiveau = niveauFilter === "all" || m.niveau === niveauFilter;

      const isClub = Boolean(m.etudiantId);
      const matchOrigin =
        originFilter === "all" ||
        (originFilter === "club" && isClub) ||
        (originFilter === "externe" && !isClub);

      const fin = getMemberFinancials(m.id);
      const matchPayment =
        paymentFilter === "all" ||
        (paymentFilter === "paid" && fin.hasPaid) ||
        (paymentFilter === "pending" && !fin.hasPaid);

      return matchSearch && matchNiveau && matchOrigin && matchPayment;
    });
  }, [members, payments, swimmerSearch, niveauFilter, originFilter, paymentFilter]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = paymentSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nomMembre.toLowerCase().includes(q) ||
        p.matricule.toLowerCase().includes(q) ||
        (p.recuNumero && p.recuNumero.toLowerCase().includes(q)) ||
        (p.periode && p.periode.toLowerCase().includes(q));

      const matchType = paymentTypeFilter === "all" || p.typePaiement === paymentTypeFilter;
      const matchMethod = paymentMethodFilter === "all" || p.methode === paymentMethodFilter;

      return matchSearch && matchType && matchMethod;
    });
  }, [payments, paymentSearch, paymentTypeFilter, paymentMethodFilter]);

  // Handlers
  const handleSaveMember = async (memberData: Omit<AquaSpaceMember, "id">) => {
    if (editingMember) {
      const res = await updateAquaSpaceMember(editingMember.id, memberData);
      if (res.success) {
        setToast({ message: "Nageur mis à jour avec succès.", type: "success" });
        await loadData();
      } else {
        throw new Error(res.error || "Échec de la mise à jour");
      }
    } else {
      const res = await createAquaSpaceMember(memberData);
      if (res.success) {
        setToast({ message: "Nouveau membre inscrit avec succès.", type: "success" });
        await loadData();
      } else {
        throw new Error(res.error || "Échec de l'enregistrement");
      }
    }
  };

  const handleDeleteMember = (id: string, name: string) => {
    confirm({
      title: "Supprimer le nageur",
      message: `Êtes-vous sûr de vouloir supprimer ${name} d'Aqua Space ? Cette action est irréversible et supprimera également les données associées.`,
      isDestructive: true,
      confirmText: "Supprimer",
      cancelText: "Annuler",
      onConfirm: async () => {
        const ok = await deleteAquaSpaceMember(id);
        if (ok) {
          setToast({ message: `${name} a été supprimé avec succès.`, type: "success" });
          await loadData();
        } else {
          setToast({ message: "Erreur lors de la suppression.", type: "error" });
        }
      },
    });
  };

  const handleSavePayment = async (paymentData: Omit<AquaSpacePayment, "id">) => {
    const res = await createAquaSpacePayment(paymentData);
    if (res.success) {
      setToast({ message: "Paiement enregistré avec succès.", type: "success" });
      await loadData();
    } else {
      throw new Error(res.error || "Échec de l'enregistrement du paiement");
    }
  };

  const handleDeletePayment = (id: string, num: string) => {
    confirm({
      title: "Supprimer le versement",
      message: `Êtes-vous sûr de vouloir supprimer ce paiement (${num}) ? Cette action est irréversible.`,
      isDestructive: true,
      confirmText: "Supprimer",
      cancelText: "Annuler",
      onConfirm: async () => {
        const ok = await deleteAquaSpacePayment(id);
        if (ok) {
          setToast({ message: "Paiement supprimé avec succès.", type: "success" });
          await loadData();
        } else {
          setToast({ message: "Erreur de suppression du paiement.", type: "error" });
        }
      },
    });
  };

  const handleOpenPrint = (member: AquaSpaceMember) => {
    setMemberToPrint(member);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleOpenAddPayment = (member?: AquaSpaceMember) => {
    setPaymentPreselectedMemberId(member ? member.id : null);
    setIsPaymentModalOpen(true);
  };

  // CSV Export for Swimmers
  const exportSwimmersCSV = () => {
    const headers = [
      "Matricule",
      "Nom",
      "Prenom",
      "Niveau",
      "Sexe",
      "Date Naissance",
      "Statut Joueur Club",
      "Parent",
      "Telephone Parent",
      "Total Payé (HTG)",
      "Total Payé (USD)",
      "Statut Cotisation",
    ];

    const rows = filteredMembers.map((m) => {
      const fin = getMemberFinancials(m.id);
      return [
        `"${m.matricule}"`,
        `"${m.nom}"`,
        `"${m.prenom}"`,
        `"${m.niveau}"`,
        `"${m.sexe}"`,
        `"${m.dateNaissance || ""}"`,
        `"${m.etudiantId ? "Joueur FC Toro" : "Externe"}"`,
        `"${m.parentPrenom} ${m.parentNom}"`,
        `"${m.parentTelephone}"`,
        `"${fin.htg}"`,
        `"${fin.usd}"`,
        `"${fin.hasPaid ? "Payé" : "En attente"}"`,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AquaSpace_Nageurs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Export for Payments
  const exportPaymentsCSV = () => {
    const headers = [
      "N° Reçu",
      "Date",
      "Matricule",
      "Nageur",
      "Type",
      "Période",
      "Montant",
      "Devise",
      "Méthode",
      "Statut",
      "Remarque",
    ];

    const rows = filteredPayments.map((p) => [
      `"${p.recuNumero || ""}"`,
      `"${p.datePaiement}"`,
      `"${p.matricule}"`,
      `"${p.nomMembre}"`,
      `"${p.typePaiement}"`,
      `"${p.periode}"`,
      `"${p.montant}"`,
      `"${p.devise}"`,
      `"${p.methode}"`,
      `"${p.statut}"`,
      `"${(p.remarque || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AquaSpace_Paiements_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getNiveauBadgeClass = (niveau: string) => {
    switch (niveau) {
      case "Apprentissage":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40";
      case "Perfectionnement":
        return "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800/40";
      case "Nage libre":
        return "bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800/40";
      case "Aqua gym":
        return "bg-violet-50 text-violet-700 border-violet-200/80 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/40";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200/80 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Breadcrumb */}
      <PageBreadcrumb pageTitle="Aqua Space · Club de Natation" />

      {/* Header action panel */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                Aqua Space
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20">
                <Waves className="h-3.5 w-3.5 text-brand-500" />
                Natation
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gestion des membres, cours de natation et cotisations de la section aquatique du FC Toro.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Nouveau Nageur</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddPayment()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
            >
              <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Encaisser Paiement</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {/* Total Nageurs */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <Users className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="mt-5">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Nageurs
            </span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              {stats.totalSwimmers}
            </h4>
          </div>
        </div>

        {/* Joueurs FC Toro */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <ShieldCheck className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="mt-5">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Joueurs FC Toro
            </span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              {stats.clubPlayersCount}
            </h4>
          </div>
        </div>

        {/* Recettes HTG */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <Receipt className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="mt-5">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Recettes HTG
            </span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              {stats.totalHTG.toLocaleString()} <span className="text-xs font-normal text-gray-400">HTG</span>
            </h4>
          </div>
        </div>

        {/* Recettes USD */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <DollarSign className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="mt-5">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Recettes USD
            </span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              ${stats.totalUSD.toLocaleString()} <span className="text-xs font-normal text-gray-400">USD</span>
            </h4>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs: Nageurs vs Paiements */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <button
            type="button"
            onClick={() => setActiveMainTab("swimmers")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeMainTab === "swimmers"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Nageurs & Inscriptions</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeMainTab === "swimmers"
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300"
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {members.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("payments")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeMainTab === "payments"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Paiements & Cotisations</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeMainTab === "payments"
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300"
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {payments.length}
            </span>
          </button>
        </div>

        <div>
          {activeMainTab === "swimmers" ? (
            <button
              type="button"
              onClick={exportSwimmersCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-theme-xs transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Exporter Nageurs (CSV)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={exportPaymentsCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-theme-xs transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Exporter Paiements (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: NAGEURS & INSCRIPTIONS */}
      {/* ========================================================= */}
      {activeMainTab === "swimmers" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher nom, prénom, matricule..."
                  value={swimmerSearch}
                  onChange={(e) => setSwimmerSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-transparent pl-9 pr-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* Filter Niveau */}
              <div className="relative">
                <select
                  value={niveauFilter}
                  onChange={(e) => setNiveauFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="all">Toutes disciplines (4)</option>
                  <option value="Apprentissage">Apprentissage</option>
                  <option value="Perfectionnement">Perfectionnement</option>
                  <option value="Nage libre">Nage libre</option>
                  <option value="Aqua gym">Aqua gym</option>
                </select>
              </div>

              {/* Filter Statut Paiement */}
              <div className="relative">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="all">Tous statuts de paiement</option>
                  <option value="paid">À jour (Cotisation réglée)</option>
                  <option value="pending">En attente de paiement</option>
                </select>
              </div>

              {/* Filter Joueur Club vs Externe */}
              <div className="relative">
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="all">Toutes affiliations</option>
                  <option value="club">Joueurs FC Toro (Club)</option>
                  <option value="externe">Nageurs externes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-800 overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-sm text-gray-500">
                <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-brand-500 border-t-transparent mb-3" />
                <p className="font-medium">Chargement des nageurs d'Aqua Space...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <Waves className="h-7 w-7" />
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Aucun nageur trouvé</h4>
                <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                  {members.length === 0
                    ? "Inscrivez le premier nageur pour démarrer le registre d'Aqua Space."
                    : "Aucun profil ne correspond aux critères de recherche actuels."}
                </p>
                {members.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMember(null);
                      setIsMemberModalOpen(true);
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-medium text-white shadow-theme-xs hover:bg-brand-600"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Inscrire un premier nageur</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3.5">Nageur</th>
                      <th className="px-4 py-3.5">Matricule & Affiliation</th>
                      <th className="px-4 py-3.5">Discipline</th>
                      <th className="px-4 py-3.5">Cotisation</th>
                      <th className="px-4 py-3.5">Responsable</th>
                      <th className="px-4 py-3.5">Fiche Médicale</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {filteredMembers.map((member) => {
                      const financials = getMemberFinancials(member.id);
                      const hasMedicalAlert =
                        (member.maladies && member.maladies.length > 0) ||
                        Boolean(member.allergies) ||
                        Boolean(member.priseMedicaments);

                      return (
                        <tr
                           key={member.id}
                           className="transition-colors hover:bg-slate-50/80 dark:hover:bg-gray-700/30"
                        >
                          {/* Nageur */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.photoUrl || "/images/user/silhouette.svg"}
                                alt={member.nom}
                                className="h-10 w-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                              />
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setDetailsMember(member)}
                                  className="text-left font-bold text-gray-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400 text-sm transition"
                                >
                                  {member.prenom} {member.nom.toUpperCase()}
                                </button>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                                  {member.sexe} {member.dateNaissance ? `· ${member.dateNaissance}` : ""}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Matricule & Affiliation */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-gray-600">
                              {member.matricule}
                            </span>
                            {member.etudiantId ? (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                <ShieldCheck className="h-3 w-3 text-amber-600" />
                                <span>Joueur Club FC Toro</span>
                              </span>
                            ) : (
                              <span className="mt-1 block text-[10px] text-gray-400">
                                Nageur externe
                              </span>
                            )}
                          </td>

                          {/* Niveau */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getNiveauBadgeClass(member.niveau)}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              <span>{member.niveau}</span>
                            </span>
                          </td>

                          {/* Statut Paiement */}
                          <td className="px-4 py-3.5">
                            {financials.hasPaid ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>À jour ({financials.count})</span>
                                </span>
                                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                  {financials.htg > 0 && `${financials.htg.toLocaleString()} HTG`}
                                  {financials.htg > 0 && financials.usd > 0 && " · "}
                                  {financials.usd > 0 && `$${financials.usd.toLocaleString()} USD`}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                                <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                <span>En attente</span>
                              </span>
                            )}
                          </td>

                          {/* Contact Parent */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                              {member.parentPrenom} {member.parentNom}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span>{member.parentTelephone || "Non renseigné"}</span>
                            </div>
                          </td>

                          {/* Fiche Médicale */}
                          <td className="px-4 py-3.5">
                            {hasMedicalAlert ? (
                              <button
                                type="button"
                                onClick={() => setDetailsMember(member)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
                                title="Voir les antécédents médicaux"
                              >
                                <AlertTriangle className="h-3 w-3 text-rose-600" />
                                <span>Signalement</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>Conforme</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Quick Cash-in */}
                              <button
                                type="button"
                                onClick={() => handleOpenAddPayment(member)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                                title="Encaisser une cotisation ou session"
                              >
                                <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Encaisser</span>
                              </button>

                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => setDetailsMember(member)}
                                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                                title="Consulter la fiche complète"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {/* Print Registration Form */}
                              <button
                                type="button"
                                onClick={() => handleOpenPrint(member)}
                                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                                title="Imprimer le formulaire officiel (2 pages)"
                              >
                                <Printer className="h-4 w-4" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(member);
                                  setIsMemberModalOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                                title="Modifier"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id, `${member.prenom} ${member.nom}`)}
                                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PAIEMENTS & COTISATIONS */}
      {/* ========================================================= */}
      {activeMainTab === "payments" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher nageur, matricule, reçu..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-transparent pl-9 pr-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="all">Toutes rubriques de paiement</option>
                  <option value="Cotisation">Cotisation mensuelle</option>
                  <option value="Inscription">Frais d'inscription</option>
                  <option value="Session">Session / Forfait de cours</option>
                  <option value="Autre">Autre versement</option>
                </select>
              </div>

              <div>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="all">Tous modes de règlement</option>
                  <option value="especes">Espèces / Cash</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="carte">Carte de crédit / débit</option>
                  <option value="cheque">Chèque bancaire</option>
                  <option value="mobile">MonCash / Natcash</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-800 overflow-hidden">
            {filteredPayments.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <Receipt className="h-7 w-7" />
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Aucun paiement enregistré</h4>
                <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                  Enregistrez le premier versement pour un membre d'Aqua Space.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddPayment()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-brand-600"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Encaisser un premier versement</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Nageur & Matricule</th>
                      <th className="px-4 py-3.5">Rubrique & Période</th>
                      <th className="px-4 py-3.5">Montant</th>
                      <th className="px-4 py-3.5">Mode</th>
                      <th className="px-4 py-3.5">Statut</th>
                      <th className="px-4 py-3.5">N° Reçu</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3.5 font-medium text-gray-600 dark:text-gray-300">
                          {payment.datePaiement}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-gray-900 dark:text-white block">
                            {payment.nomMembre}
                          </span>
                          <span className="font-mono text-[11px] text-brand-600 dark:text-brand-400">
                            {payment.matricule}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                            {payment.typePaiement}
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {payment.periode}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {payment.montant.toLocaleString()} {payment.devise === "US" ? "USD" : "HTG"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 capitalize text-gray-600 dark:text-gray-400">
                          {payment.methode}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              payment.statut === "paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                                : "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${payment.statut === "paid" ? "bg-emerald-500" : "bg-amber-500"}`} />
                            <span>{payment.statut === "paid" ? "Payé" : "En attente"}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                          {payment.recuNumero || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(payment.id, payment.recuNumero || payment.id)}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                            title="Supprimer ce versement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Registration / Edit Modal */}
      {isMemberModalOpen && (
        <AquaSpaceMemberModal
          isOpen={isMemberModalOpen}
          onClose={() => {
            setIsMemberModalOpen(false);
            setEditingMember(null);
          }}
          onSave={handleSaveMember}
          initialData={editingMember}
          existingMembers={members}
        />
      )}

      {/* Payment Cash-in Modal */}
      {isPaymentModalOpen && (
        <AquaSpacePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentPreselectedMemberId(null);
          }}
          onSave={handleSavePayment}
          members={members}
          preselectedMemberId={paymentPreselectedMemberId}
        />
      )}

      {/* Member Details Modal */}
      {detailsMember && (
        <AquaSpaceMemberDetailsModal
          isOpen={Boolean(detailsMember)}
          onClose={() => setDetailsMember(null)}
          member={detailsMember}
          payments={payments}
          onEdit={(m) => {
            setDetailsMember(null);
            setEditingMember(m);
            setIsMemberModalOpen(true);
          }}
          onAddPayment={(m) => {
            setDetailsMember(null);
            handleOpenAddPayment(m);
          }}
          onPrint={(m) => {
            handleOpenPrint(m);
          }}
        />
      )}

      {/* Hidden printable element for 2-page registration form */}
      {memberToPrint && (
        <div className="hidden print:block fixed inset-0 bg-white z-[999999]">
          <AquaSpaceRegistrationPrint member={memberToPrint} />
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmComponent />
    </div>
  );
}
