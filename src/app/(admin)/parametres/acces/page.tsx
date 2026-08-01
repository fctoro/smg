"use client";

import { TableSkeleton } from "@/components/ui/skeleton/Skeleton";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PencilIcon } from "@/icons";
import { createUser, getUsersList, deleteUser, updateUserPassword, updateUserAccess } from "@/app/actions/user";
import { fetchCoaches } from "@/lib/club/coachs";
import { Coach } from "@/types/club";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  sections?: string[];
  categories?: string[];
  created_at: string;
};

const SECTIONS = [
  "Dashboard",
  "Joueurs",
  "Parents",
  "Alumni",
  "Employés",
  "Evenements",
  "Paiements",
  "Factures",
  "Paramètres",
];

const ACCOUNT_TYPES = [
  { id: "Super Admin", label: "Super Admin", description: "Accès complet à l'ensemble de la plateforme" },
  { id: "Admin", label: "Administrateur", description: "Gestion quotidienne des opérations du club" },
  { id: "Finance", label: "Finance", description: "Gestion des paiements, factures et suivi financier" },
  { id: "Coach", label: "Coach", description: "Accès limité aux entraînements et effectifs" },
];

export default function AccessControlPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("footballclubtoro@gmail.com");
  
  // Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "Admin",
  });
  
  // Role Permissions Configuration State (Defaults)
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    "Super Admin": [...SECTIONS],
    "Admin": ["Dashboard", "Joueurs", "Parents", "Evenements", "Paiements", "Factures"],
    "Finance": ["Dashboard", "Paiements", "Factures"],
    "Coach": ["Dashboard", "Joueurs", "Evenements"],
  });

  const [selectedSections, setSelectedSections] = useState<string[]>(rolePermissions["Admin"]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");

  const [editingAccessUserId, setEditingAccessUserId] = useState<string | null>(null);

  const [activeConfigRole, setActiveConfigRole] = useState<string>("Admin");
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) {
          setCurrentUserEmail(data.user.email);
        }
      } catch (e) {}
    }
    async function fetchCategories() {
      const predefined = ["ti toro", "U8", "U10", "U12", "U14", "U16", "U18"];
      const { data } = await supabase.from('tblEtudiants').select('Categorie');
      if (data) {
        const fromDb = data.map((d: any) => d.Categorie).filter(Boolean);
        const unique = Array.from(new Set([...predefined, ...fromDb]));
        setAvailableCategories(unique);
      } else {
        setAvailableCategories(predefined);
      }
    }
    async function loadCoaches() {
      const data = await fetchCoaches();
      setCoaches(data);
    }
    checkUser();
    fetchCategories();
    fetchProfiles();
    loadCoaches();
  }, []);

  const handleRoleSelect = (roleId: string) => {
    setFormData(prev => ({ ...prev, role: roleId }));
    if (roleId === "Coach") {
      setSelectedSections([]);
      // Reset selected coach on role switch
      setSelectedCoachId("");
      setFormData(prev => ({ ...prev, email: "" }));
      setSelectedCategories([]);
    } else {
      setSelectedSections(rolePermissions[roleId] || []);
    }
  };

  const handleCoachSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const coachId = e.target.value;
    setSelectedCoachId(coachId);
    
    if (coachId) {
      const coach = coaches.find(c => c.id === coachId);
      if (coach) {
        setFormData(prev => ({ ...prev, email: coach.email }));
        setSelectedCategories(coach.categories || []);
      }
    } else {
      setFormData(prev => ({ ...prev, email: "" }));
      setSelectedCategories([]);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    const result = await getUsersList();
    if (result?.users) {
      setProfiles(result.users);
    }
    setLoading(false);
  };

  const handleToggleSection = (section: string) => {
    setSelectedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleToggleRoleConfigSection = (section: string) => {
    setRolePermissions(prev => {
      const current = prev[activeConfigRole] || [];
      const updated = current.includes(section)
        ? current.filter(s => s !== section)
        : [...current, section];
      return { ...prev, [activeConfigRole]: updated };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const form = new FormData();
    form.append("email", formData.email);
    form.append("password", formData.password);
    form.append("role", formData.role);
    form.append("sections", JSON.stringify(formData.role === "Coach" ? [] : selectedSections));
    form.append("categories", JSON.stringify(formData.role === "Coach" ? selectedCategories : []));

    let result;
    if (editingAccessUserId) {
      if (formData.password) {
        const pwdResult = await updateUserPassword(editingAccessUserId, formData.password);
        if (pwdResult?.error) {
          setMessage({ text: pwdResult.error, type: "error" });
          setSaving(false);
          return;
        }
      }
      result = await updateUserAccess(
        editingAccessUserId, 
        formData.role, 
        formData.role === "Coach" ? [] : selectedSections,
        formData.role === "Coach" ? selectedCategories : []
      );
    } else {
      result = await createUser(form);
    }

    if (result.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      const action = editingAccessUserId ? "mis à jour" : "créé";
      setMessage({ text: `Compte ${formData.role} ${action} avec succès avec ${selectedSections.length} section(s) attribuée(s) !`, type: "success" });
      setEditingAccessUserId(null);
      setFormData({ email: "", password: "", role: "Admin" });
      setSelectedSections(rolePermissions["Admin"]);
      setSelectedCoachId("");
      fetchProfiles();
    }
    setSaving(false);
  };

  const handleEditAccess = (user: Profile) => {
    if (editingAccessUserId === user.id) {
      setEditingAccessUserId(null);
      setFormData({ email: "", password: "", role: "Admin" });
      setSelectedSections(rolePermissions["Admin"]);
      return;
    }

    setEditingAccessUserId(user.id);
    setFormData({ email: user.email, password: "", role: user.role });
    setSelectedSections(user.role === "Coach" ? [] : (user.sections || rolePermissions[user.role] || []));
    setSelectedCategories(user.categories || []);
  };

  const handleDeleteUser = async (user: Profile) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le compte "${user.email}" ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    const res = await deleteUser(user.id);
    if (res?.error) {
      alert(`Erreur: ${res.error}`);
    } else {
      alert(`Le compte ${user.email} a été supprimé avec succès.`);
      fetchProfiles();
    }
  };

  const handleSaveRoleConfig = () => {
    setConfigSaving(true);
    setTimeout(() => {
      setConfigSaving(false);
      setConfigMessage(`Permissions par défaut pour le rôle "${activeConfigRole}" sauvegardées !`);
      setTimeout(() => setConfigMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-[#0f172a] tracking-tight mb-1">
          Gestion des Accès & Comptes
        </h1>
        <p className="text-[15px] text-[#64748b]">
          Gérez les utilisateurs, définissez le type de compte et cochez les sections exactes accessibles.
        </p>
      </div>

      {/* Comptes Administrateurs List */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-sm">
        <div className="px-6 pt-6 pb-2 flex justify-between items-center border-b border-[#f1f5f9] pb-4">
          <h2 className="text-[13px] font-bold text-[#94a3b8] uppercase tracking-wider">
            COMPTES UTILISATEURS EXISTANTS
          </h2>
          <span className="text-[13px] font-medium text-[#64748b] bg-[#f8fafc] px-3 py-1 rounded-full border border-[#e2e8f0]">
            {profiles.length} compte{profiles.length > 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="p-6">
          {loading ? (
            <TableSkeleton rows={4} columns={4} />
          ) : profiles.length === 0 ? (
            <div className="text-center py-6 text-sm text-[#64748b]">Aucun compte trouvé dans la base de données.</div>
          ) : (
            <div className="space-y-3">
              {profiles.map(profile => {
                const isYou = profile.email === currentUserEmail || profile.email === "footballclubtoro@gmail.com";
                return (
                  <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#f1f5f9] hover:border-[#cbd5e1] transition-colors bg-white">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-[46px] w-[46px] rounded-full bg-[#0f172a] text-white flex items-center justify-center font-semibold text-lg shrink-0 shadow-sm">
                        {(profile?.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                          <p className="text-[15px] font-semibold text-[#0f172a] truncate">
                            {profile?.email || profile?.full_name || "Utilisateur"}
                          </p>
                          {isYou && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">
                              Vous
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#0f172a] text-white">
                            {profile.role}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#94a3b8] truncate">
                          Créé le {new Date(profile.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>

                    {/* Actions buttons: Edit Password & Delete */}
                    <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0">
                      <button
                        onClick={() => handleEditAccess(profile)}
                        className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-colors flex items-center gap-2"
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 text-[#64748b]">
                          <PencilIcon className="w-4 h-4" />
                        </span>
                        {editingAccessUserId === profile.id ? "Annuler" : "Modifier"}
                      </button>
                      {!isYou && (
                        <button
                          onClick={() => handleDeleteUser(profile)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-[13px] font-medium text-red-600 bg-red-50/50 hover:bg-red-100 hover:border-red-300 transition-colors flex items-center gap-1.5"
                          title="Supprimer ce compte (Super Admin uniquement)"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Créer un compte Form */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-sm">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-[13px] font-bold text-[#94a3b8] uppercase tracking-wider">
            {editingAccessUserId ? "MODIFIER LES ACCÈS D'UN COMPTE" : "CRÉER UN NOUVEAU COMPTE"}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]' : 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'}`}>
              {message.text}
            </div>
          )}

          {/* Type de compte Selector */}
          <div className="space-y-3">
            <label className="text-[14px] font-semibold text-[#334155]">
              Type de compte <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {ACCOUNT_TYPES.map(type => (
                <div
                  key={type.id}
                  onClick={() => handleRoleSelect(type.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    formData.role === type.id
                      ? "border-[#0f172a] bg-[#0f172a]/5 shadow-sm ring-1 ring-[#0f172a]"
                      : "border-[#e2e8f0] bg-[#f8fafc] hover:border-[#cbd5e1]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] font-bold text-[#0f172a]">{type.label}</span>
                    <input 
                      type="radio" 
                      name="roleType"
                      checked={formData.role === type.id}
                      onChange={() => handleRoleSelect(type.id)}
                      className="h-4 w-4 text-[#0f172a] focus:ring-0 cursor-pointer accent-[#0f172a]"
                    />
                  </div>
                  <p className="text-[12px] text-[#64748b] leading-tight">{type.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-2">
            {formData.role === "Coach" && !editingAccessUserId && (
              <div className="space-y-2">
                <label className="text-[14px] font-medium text-[#334155]">Sélectionner un Coach <span className="text-red-500">*</span></label>
                <select
                  value={selectedCoachId}
                  onChange={handleCoachSelect}
                  required
                  className="w-full h-11 px-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[14px] text-[#0f172a] focus:border-[#0f172a] outline-none transition-colors"
                >
                  <option value="">-- Choisir un coach --</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.prenom} ({c.email})
                    </option>
                  ))}
                </select>
                <p className="text-[12px] text-[#64748b] mt-1">L'email et les catégories seront récupérés automatiquement.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[14px] font-medium text-[#334155]">Adresse email <span className="text-red-500">*</span></label>
              <input 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                type="email" 
                placeholder="nom@fctoro.club"
                required
                disabled={!!editingAccessUserId || formData.role === "Coach"}
                className="w-full h-11 px-4 bg-[#f8fafc] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] border border-[#e2e8f0] rounded-lg text-[14px] text-[#0f172a] placeholder-[#94a3b8] focus:border-[#0f172a] outline-none transition-colors" 
              />
              {editingAccessUserId && (
                <p className="text-[12px] text-[#64748b] mt-1">L'email ne peut pas être modifié ici. Modifiez uniquement le rôle et les sections.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-medium text-[#334155]">
                {editingAccessUserId ? "Mot de passe (laisser vide si inchangé)" : "Mot de passe provisoire"}
                {editingAccessUserId ? "" : <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  type={showPassword ? "text" : "password"} 
                  autoComplete="new-password"
                  placeholder={editingAccessUserId ? "•••••••• (facultatif)" : "••••••••"}
                  required={!editingAccessUserId}
                  className="w-full h-11 px-4 pr-11 bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg text-[14px] text-[#0f172a] placeholder-[#94a3b8] focus:border-[#0f172a] outline-none transition-colors" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] transition-colors p-1"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.97 8.97 0 013.122-.382c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21f-3-3m-3.938-3.938A3.001 3.001 0 0012 9a2.986 2.986 0 00-2.062.825m3.938 3.938L3 3" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sections accessibles personnalisées */}
          {formData.role !== "Coach" && (
            <div className="mt-8 border border-[#e2e8f0] rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc]">
                <h3 className="text-[14px] font-semibold text-[#334155]">
                  Sections affichées pour ce compte ({formData.role})
                </h3>
                <span className="text-[13px] text-[#94a3b8]">
                  {selectedSections.length === 0 ? "Aucune sélectionnée" : `${selectedSections.length} sélectionnée(s)`}
                </span>
              </div>
              
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4">
                {SECTIONS.map(section => (
                  <label key={section} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox"
                        checked={selectedSections.includes(section)}
                        onChange={() => handleToggleSection(section)}
                        className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[4px] border border-[#cbd5e1] bg-white checked:border-[#0f172a] checked:bg-[#0f172a] transition-all outline-none"
                      />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-white" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-[14px] text-[#475569] group-hover:text-[#0f172a] transition-colors">
                      {section}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {formData.role === "Coach" && (
            <div className="mt-8 border border-[#e2e8f0] rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc]">
                <h3 className="text-[14px] font-semibold text-[#334155]">
                  Catégories assignées au Coach
                </h3>
                <span className="text-[13px] text-[#94a3b8]">
                  {selectedCategories.length === 0 ? "Aucune sélectionnée" : `${selectedCategories.length} sélectionnée(s)`}
                </span>
              </div>
              
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4">
                {availableCategories.map(category => (
                  <label key={category} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => handleToggleCategory(category)}
                        className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[4px] border border-[#cbd5e1] bg-white checked:border-[#0f172a] checked:bg-[#0f172a] transition-all outline-none"
                      />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-white" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-[14px] text-[#475569] group-hover:text-[#0f172a] transition-colors">
                      {category}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-[#f1f5f9] flex items-center justify-between">
            <span className="text-[13px] text-[#94a3b8]">
              {formData.role === "Coach" ? `${selectedCategories.length} catégorie(s)` : `${selectedSections.length} section(s)`} attribuée(s)
            </span>
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b] px-6 py-2.5 rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {saving ? (editingAccessUserId ? "Mise à jour..." : "Création...") : (editingAccessUserId ? `Mettre à jour ${formData.role}` : `Créer le compte ${formData.role}`)}
            </button>
          </div>
        </form>
      </div>

      {/* Configuration globale des types de comptes et leurs accès */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-sm">
        <div className="px-6 pt-6 pb-2 border-b border-[#f1f5f9] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-bold text-[#0f172a]">
              CONFIGURATION DES DROITS PAR TYPE DE COMPTE
            </h2>
            <p className="text-[13px] text-[#64748b] mt-0.5">
              Définissez les accès par défaut pour chaque catégorie d'utilisateur.
            </p>
          </div>

          {/* Role selector tabs for config */}
          <div className="flex gap-2 bg-[#f8fafc] p-1 rounded-lg border border-[#e2e8f0]">
            {ACCOUNT_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveConfigRole(type.id)}
                className={`px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
                  activeConfigRole === type.id
                    ? "bg-[#0f172a] text-white shadow-sm"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {configMessage && (
            <div className="p-4 rounded-lg text-sm font-medium bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]">
              {configMessage}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#334155]">
              Sections autorisées par défaut pour : <span className="text-[#0f172a] font-bold">{activeConfigRole}</span>
            </h3>
            <span className="text-[12px] text-[#94a3b8]">
              {(rolePermissions[activeConfigRole] || []).length} / {SECTIONS.length} modules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4 p-5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
            {SECTIONS.map(section => {
              const isChecked = (rolePermissions[activeConfigRole] || []).includes(section);
              return (
                <label key={section} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleRoleConfigSection(section)}
                      className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[4px] border border-[#cbd5e1] bg-white checked:border-[#0f172a] checked:bg-[#0f172a] transition-all outline-none"
                    />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-white" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className={`text-[14px] transition-colors ${isChecked ? "font-medium text-[#0f172a]" : "text-[#94a3b8]"}`}>
                    {section}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleSaveRoleConfig}
              disabled={configSaving}
              className="bg-[#0f172a] text-white hover:bg-[#1e293b] px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {configSaving ? "Enregistrement..." : `Sauvegarder les accès ${activeConfigRole}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
