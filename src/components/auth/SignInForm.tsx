"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else if (data?.user) {
        const u = data.user;
        const uEmail = u.email || email;
        const uMetaRole = u.user_metadata?.role;
        const uMetaSections = u.user_metadata?.sections;

        // Fetch DB profile if metadata is empty
        let userRole = uMetaRole || (uEmail === "footballclubtoro@gmail.com" ? "Super Admin" : "Admin");
        let userSections = uMetaSections || [];

        if (!uMetaRole && uEmail !== "footballclubtoro@gmail.com") {
          const { data: prof } = await supabase
            .from("profiles")
            .select("role, sections")
            .eq("id", u.id)
            .single();
          if (prof?.role) userRole = prof.role;
          if (prof?.sections) userSections = prof.sections;
        }

        const normalizedRole = userRole.toLowerCase();
        localStorage.setItem("fctoro_user_email", uEmail);
        localStorage.setItem("fctoro_user_role", normalizedRole);
        localStorage.setItem("fctoro_user_sections", JSON.stringify(userSections));

        // Perform instant full navigation
        window.location.href = normalizedRole === "coach" ? "/coach" : "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Se Connecter
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Saisissez vos identifiants FC Toro pour vous connecter à la plateforme.
            </p>
          </div>
          <div>
            <form onSubmit={handleSignIn}>
              <div className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-error-600 bg-error-50 rounded-lg border border-error-200">
                    {error}
                  </div>
                )}
                <div>
                  <Label>
                    Adresse Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <input 
                    placeholder="nom@fctoro.club" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 px-4 bg-transparent border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label>
                    Mot de passe <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-11 px-4 bg-transparent border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Rester connecté
                    </span>
                  </div>
                  <a
                    href="/forgot-password"
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={loading}>
                    {loading ? "Connexion en cours..." : "Se connecter"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
