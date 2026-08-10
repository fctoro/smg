"use client";

import React, { useState, useEffect } from "react";
import { useUserRole } from "@/context/UserRoleContext";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton/Skeleton";

export default function ProfilePage() {
  const { userEmail, isSuperAdmin, isCoach, isFinance, userSections } = useUserRole();
  const [createdDate, setCreatedDate] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Show password states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchUserData() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.created_at) {
          setCreatedDate(new Date(data.user.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }));
        }
      } catch (e) {}
    }
    fetchUserData();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword) {
      setMessage({ text: "Veuillez saisir votre mot de passe actuel.", type: "error" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setMessage({ text: "Le nouveau mot de passe doit contenir au moins 6 caractères.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: "Les mots de passe ne correspondent pas.", type: "error" });
      return;
    }

    setUpdating(true);

    try {
      // Step 1: Re-authenticate with current password to verify it
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      if (!email) {
        setMessage({ text: "Impossible de récupérer votre compte.", type: "error" });
        setUpdating(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        setMessage({ text: "Mot de passe actuel incorrect. Veuillez réessayer.", type: "error" });
        setUpdating(false);
        return;
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        setMessage({ text: updateError.message, type: "error" });
      } else {
        setMessage({ text: "✅ Votre mot de passe a été mis à jour avec succès !", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Erreur lors de la mise à jour.", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  const roleLabel = !mounted ? "Administrateur" : isSuperAdmin ? "Super Admin" : isFinance ? "Finance" : isCoach ? "Coach" : "Administrateur";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 font-sans">
      {/* Title */}
      <div>
        <h1 className="text-[28px] font-bold text-[#0f172a] tracking-tight mb-1">
          Mon Profil FC Toro
        </h1>
        <p className="text-[15px] text-[#64748b]">
          Consultez les détails de votre compte et gérez votre mot de passe.
        </p>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="h-20 w-20 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-3xl font-bold shrink-0 shadow-md border-4 border-white" suppressHydrationWarning>
          {(userEmail || "F").charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-[#0f172a]" suppressHydrationWarning>
              {mounted ? (userEmail || "—") : <Skeleton className="h-6 w-48" />}
            </h2>
            <span className="self-center sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-[#0f172a] text-white w-fit" suppressHydrationWarning>
              {roleLabel}
            </span>
          </div>

          <p className="text-sm text-[#64748b]">
            Membre actif de la plateforme FC Toro {createdDate ? `depuis le ${createdDate}` : ""}
          </p>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-[#0f172a] border-b border-[#f1f5f9] pb-3">
          Informations Générales du Compte
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold uppercase text-[#94a3b8]">Adresse Email</label>
            <p className="text-[#0f172a] font-medium text-sm mt-1" suppressHydrationWarning>{mounted ? (userEmail || "—") : "—"}</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-[#94a3b8]">Type de Compte</label>
            <p className="text-[#0f172a] font-medium text-sm mt-1" suppressHydrationWarning>{roleLabel}</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-[#94a3b8]">Statut de la session</label>
            <p className="text-[#15803d] font-semibold text-sm mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#16a34a]"></span>
              Connecté &amp; Sécurisé
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-[#94a3b8]">Sections autorisées ({userSections.length})</label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {userSections.map((sec) => (
                <span key={sec} className="px-2.5 py-1 bg-[#f1f5f9] border border-[#e2e8f0] text-[#334155] rounded-md text-xs font-medium">
                  {sec}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-[#0f172a] border-b border-[#f1f5f9] pb-3">
          Sécurité &amp; Mot de Passe
        </h3>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]' : 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#334155]">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder={showCurrentPassword ? "Votre mot de passe" : "••••••••"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full h-11 px-4 pr-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] outline-none focus:border-[#0f172a] transition-colors"
              />
              <button 
                type="button" 
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#334155]">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder={showNewPassword ? "Nouveau mot de passe" : "••••••••"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-11 px-4 pr-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] outline-none focus:border-[#0f172a] transition-colors"
              />
              <button 
                type="button" 
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#334155]">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={showConfirmPassword ? "Confirmez le mot de passe" : "••••••••"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-11 px-4 pr-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] outline-none focus:border-[#0f172a] transition-colors"
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={updating}
            className="px-6 py-2.5 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-[#1e293b] transition-colors disabled:opacity-50 shadow-sm"
          >
            {updating ? "Vérification en cours..." : "Enregistrer le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
