"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const getDefaultSectionsForRole = (normalizedRole: string): string[] => {
  switch (normalizedRole) {
    case "coach":
      return ["Dashboard", "Joueurs", "Evenements"];
    case "finance":
      return ["Dashboard", "Paiements", "Factures"];
    default:
      return ["Dashboard", "Joueurs", "Parents", "Evenements", "Paiements", "Factures"];
  }
};

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else if (data?.user) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          setError("Connexion reussie, mais la session n'a pas ete enregistree. Rechargez la page et reessayez.");
          setLoading(false);
          return;
        }

        const u = data.user;
        const uEmail = u.email || email;
        const uMetaRole = u.user_metadata?.role;
        const uMetaSections = u.user_metadata?.sections;

        let userRole = uMetaRole || (uEmail.toLowerCase() === "footballclubtoro@gmail.com" ? "Super Admin" : "Admin");
        let userSections = Array.isArray(uMetaSections) && uMetaSections.length > 0 ? uMetaSections : [];

        if (!uMetaRole && uEmail.toLowerCase() !== "footballclubtoro@gmail.com") {
          const { data: prof } = await supabase
            .from("profiles")
            .select("role, sections")
            .eq("id", u.id)
            .single();
          if (prof?.role) userRole = prof.role;
          if (Array.isArray(prof?.sections) && prof.sections.length > 0) {
            userSections = prof.sections;
          }
        }

        const normalizedRole = userRole.toLowerCase();
        if (userSections.length === 0) {
          userSections = getDefaultSectionsForRole(normalizedRole);
        }
        
        const userPermissions = u.user_metadata?.permissions || {};
        
        localStorage.setItem("fctoro_user_email", uEmail);
        localStorage.setItem("fctoro_user_role", normalizedRole);
        localStorage.setItem("fctoro_user_sections", JSON.stringify(userSections));
        localStorage.setItem("fctoro_user_permissions", JSON.stringify(userPermissions));

        // Hard redirect to ensure UserRoleContext and Layout are fully re-initialized
        window.location.href = normalizedRole === "coach" ? "/coach" : "/dashboard";
      }
    } catch (err: any) {
      if (err.message === "Invalid login credentials") {
        setError("Ce compte n'existe pas ou le mot de passe est incorrect.");
      } else {
        setError(err.message || "Erreur lors de la connexion.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8">
      {/* Header - ONLY LOGO */}
      <div className="flex justify-center mb-6">
        <Image
          width={84}
          height={84}
          src="/images/logo/fc-toro.png"
          alt="FC Toro Logo"
          className="h-20 w-20 object-contain"
          priority
        />
      </div>

      <form onSubmit={handleSignIn} className="space-y-5">
        {error && (
          <div className="p-3.5 text-xs font-semibold text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
            Adresse Email <span className="text-red-500">*</span>
          </label>
          <input
            placeholder="nom@fctoro.club"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 px-4 pr-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors z-10 cursor-pointer"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.04 10.04 0 013.682-.663c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-3.518-3.518a3 3 0 10-4.243-4.243" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Rester connecté
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Connexion en cours...</span>
            </>
          ) : (
            <span>Se connecter</span>
          )}
        </button>
      </form>
    </div>
  );
}
