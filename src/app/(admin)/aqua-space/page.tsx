"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  AquaSpaceMember,
  AquaSpacePayment,
  AquaSpaceNiveau,
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
      // Search
      const q = swimmerSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.nom.toLowerCase().includes(q) ||
        m.prenom.toLowerCase().includes(q) ||
        m.matricule.toLowerCase().includes(q) ||
        (m.parentTelephone && m.parentTelephone.includes(q)) ||
        (m.parentNom && m.parentNom.toLowerCase().includes(q));

      // Niveau
      const matchNiveau = niveauFilter === "all" || m.niveau === niveauFilter;

      // Source / Origin
      const isClub = Boolean(m.etudiantId);
      const matchOrigin =
        originFilter === "all" ||
        (originFilter === "club" && isClub) ||
        (originFilter === "externe" && !isClub);

      // Payment Status
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
        setToast({ message: "Nageur mis à jour avec succès !", type: "success" });
        await loadData();
      } else {
        throw new Error(res.error || "Échec de la mise à jour");
      }
    } else {
      const res = await createAquaSpaceMember(memberData);
      if (res.success) {
        setToast({ message: "Nouveau nageur inscrit avec succès !", type: "success" });
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
      setToast({ message: "Paiement enregistré avec succès !", type: "success" });
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
      <PageBreadcrumb pageTitle="Aqua Space - Club de Natation" />

      {/* Hero Banner with Title & Quick Actions */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-6 sm:p-8 text-white shadow-xl shadow-cyan-900/10">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wide uppercase backdrop-blur-md">
              <span>🏊 Section Natation FC TORO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Aqua Space
            </h1>
            <p className="text-sm text-cyan-100 max-w-xl">
              Gestion complète du club de natation : fiches d'inscription officielles,
              suivi médical préventif et gestion des cotisations.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-cyan-900 font-bold text-sm shadow-md hover:bg-cyan-50 transition transform active:scale-95"
            >
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nouveau Nageur</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddPayment()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition transform active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Encaisser Paiement</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Nageurs */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Nageurs</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                {stats.totalSwimmers}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-bold text-cyan-600 dark:text-cyan-400">{stats.clubPlayersCount} du club</span>
            <span>•</span>
            <span>{stats.externalCount} externes</span>
          </div>
        </div>

        {/* Joueurs FC Toro inscrits */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Joueurs Club FC Toro</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {stats.clubPlayersCount}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <span className="text-xl">⚽</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Conservent leur matricule officiel
          </div>
        </div>

        {/* Total Encaissé HTG */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Encaissé (HTG)</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.totalHTG.toLocaleString()} <span className="text-sm font-bold text-gray-500">G</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black">
              G
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {payments.filter((p) => p.devise === "HTG" && p.statut === "paid").length} versements reçus
          </div>
        </div>

        {/* Total Encaissé USD & Statut */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Encaissé (USD)</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {stats.totalUSD.toLocaleString()} <span className="text-sm font-bold text-gray-500">$</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black">
              $
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.paidSwimmersCount} à jour</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{stats.pendingSwimmersCount} en attente</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs: Nageurs vs Paiements */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab("swimmers")}
            className={`pb-3 pt-1 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeMainTab === "swimmers"
                ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}
          >
            <span>🏊 Nageurs & Inscriptions</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-extrabold">
              {members.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("payments")}
            className={`pb-3 pt-1 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeMainTab === "payments"
                ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}
          >
            <span>💳 Paiements & Cotisations</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-extrabold">
              {payments.length}
            </span>
          </button>
        </div>

        <div>
          {activeMainTab === "swimmers" ? (
            <button
              type="button"
              onClick={exportSwimmersCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Exporter CSV</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={exportPaymentsCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Exporter Paiements</span>
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
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Rechercher par nom, matricule, parent..."
                  value={swimmerSearch}
                  onChange={(e) => setSwimmerSearch(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Filter Niveau */}
              <div>
                <select
                  value={niveauFilter}
                  onChange={(e) => setNiveauFilter(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="all">Tous les niveaux (4)</option>
                  <option value="Apprentissage">Apprentissage</option>
                  <option value="Perfectionnement">Perfectionnement</option>
                  <option value="Nage libre">Nage libre</option>
                  <option value="Aqua gym">Aqua gym</option>
                </select>
              </div>

              {/* Filter Statut Paiement */}
              <div>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="all">Tous statuts de paiement</option>
                  <option value="paid">Payé / À jour</option>
                  <option value="pending">En attente de paiement</option>
                </select>
              </div>

              {/* Filter Joueur Club vs Externe */}
              <div>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="all">Toutes origines</option>
                  <option value="club">Joueurs FC Toro (Club)</option>
                  <option value="externe">Nouveaux externes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-800 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mb-2"></div>
                <p>Chargement des membres d'Aqua Space...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                <div className="w-16 h-16 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 flex items-center justify-center mx-auto mb-3 text-2xl">
                  🏊
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white text-base">Aucun membre trouvé</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  {members.length === 0
                    ? "Inscrivez le premier nageur ou ajoutez un joueur du club dans Aqua Space."
                    : "Aucun membre ne correspond à vos filtres de recherche."}
                </p>
                {members.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMember(null);
                      setIsMemberModalOpen(true);
                    }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-md hover:bg-cyan-700"
                  >
                    + Inscrire un nageur
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3.5">Nageur</th>
                      <th className="px-4 py-3.5">Matricule & Origine</th>
                      <th className="px-4 py-3.5">Discipline / Niveau</th>
                      <th className="px-4 py-3.5">Statut Paiement</th>
                      <th className="px-4 py-3.5">Parent / Contact</th>
                      <th className="px-4 py-3.5">Fiche Médicale</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredMembers.map((member) => {
                      const financials = getMemberFinancials(member.id);
                      const hasMedicalAlert =
                        (member.maladies && member.maladies.length > 0) ||
                        Boolean(member.allergies) ||
                        Boolean(member.priseMedicaments);

                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-cyan-50/30 dark:hover:bg-cyan-950/10 transition group"
                        >
                          {/* Nageur */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.photoUrl || "/images/user/silhouette.svg"}
                                alt={member.nom}
                                className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                              />
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setDetailsMember(member)}
                                  className="font-bold text-gray-900 dark:text-white hover:text-cyan-600 text-left block text-sm"
                                >
                                  {member.prenom} {member.nom.toUpperCase()}
                                </button>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {member.sexe} {member.dateNaissance ? `• ${member.dateNaissance}` : ""}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Matricule & Origine */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-0.5 rounded-md border border-cyan-200/50 dark:border-cyan-800/50">
                              {member.matricule}
                            </span>
                            {member.etudiantId ? (
                              <span className="mt-1 block text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                ⭐ Joueur Club FC Toro
                              </span>
                            ) : (
                              <span className="mt-1 block text-[10px] text-gray-400">
                                Externe
                              </span>
                            )}
                          </td>

                          {/* Niveau */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              🏊 {member.niveau}
                            </span>
                          </td>

                          {/* Statut Paiement */}
                          <td className="px-4 py-3.5">
                            {financials.hasPaid ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  À jour ({financials.count})
                                </span>
                                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                  {financials.htg > 0 && `${financials.htg.toLocaleString()} G`}
                                  {financials.htg > 0 && financials.usd > 0 && " • "}
                                  {financials.usd > 0 && `${financials.usd.toLocaleString()} $`}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                En attente
                              </span>
                            )}
                          </td>

                          {/* Contact Parent */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                              {member.parentPrenom} {member.parentNom}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              📞 {member.parentTelephone || "Non renseigné"}
                            </div>
                          </td>

                          {/* Fiche Médicale */}
                          <td className="px-4 py-3.5">
                            {hasMedicalAlert ? (
                              <span
                                onClick={() => setDetailsMember(member)}
                                className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[11px] font-bold border border-red-200 dark:border-red-800"
                                title="Voir les détails médicaux"
                              >
                                ⚠️ Signalement
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                ✅ RAS
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Cash-in */}
                              <button
                                type="button"
                                onClick={() => handleOpenAddPayment(member)}
                                className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition flex items-center gap-1"
                                title="Encaisser un paiement pour ce nageur"
                              >
                                💳 Encaisser
                              </button>

                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => setDetailsMember(member)}
                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
                                title="Voir la fiche complète"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* Print Registration Form */}
                              <button
                                type="button"
                                onClick={() => handleOpenPrint(member)}
                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-cyan-600 dark:text-cyan-400 transition"
                                title="Imprimer la fiche d'inscription officielle (2 pages)"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(member);
                                  setIsMemberModalOpen(true);
                                }}
                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
                                title="Modifier"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id, `${member.prenom} ${member.nom}`)}
                                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition"
                                title="Supprimer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
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
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Rechercher par nageur, matricule, reçu..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="all">Tous les types de paiement</option>
                  <option value="Cotisation">Cotisation mensuelle</option>
                  <option value="Inscription">Frais d'inscription</option>
                  <option value="Session">Session / Forfait cours</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="all">Toutes méthodes de règlement</option>
                  <option value="especes">Espèces / Cash</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="carte">Carte de crédit</option>
                  <option value="cheque">Chèque</option>
                  <option value="mobile">MonCash / Natcash</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-800 overflow-hidden">
            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-2xl">
                  💳
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white text-base">Aucun paiement trouvé</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Enregistrez un premier versement pour un nageur d'Aqua Space.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddPayment()}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700"
                >
                  + Enregistrer un paiement
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Nageur & Matricule</th>
                      <th className="px-4 py-3.5">Type & Période</th>
                      <th className="px-4 py-3.5">Montant</th>
                      <th className="px-4 py-3.5">Mode</th>
                      <th className="px-4 py-3.5">Statut</th>
                      <th className="px-4 py-3.5">N° Reçu</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3.5 font-medium text-gray-600 dark:text-gray-300">
                          {payment.datePaiement}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-gray-900 dark:text-white block">
                            {payment.nomMembre}
                          </span>
                          <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
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
                          <span className="text-sm font-black text-gray-900 dark:text-white">
                            {payment.montant.toLocaleString()} {payment.devise === "US" ? "USD" : "HTG"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 capitalize text-gray-600 dark:text-gray-400">
                          {payment.methode}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              payment.statut === "paid"
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${payment.statut === "paid" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {payment.statut === "paid" ? "Payé" : "En attente"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                          {payment.recuNumero || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(payment.id, payment.recuNumero || payment.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition"
                            title="Supprimer ce versement"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
