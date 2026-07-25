"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setMessage({ text: "Les mots de passe ne correspondent pas.", type: "error" });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ text: "Le mot de passe doit contenir au moins 6 caractères.", type: "error" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ text: "Erreur: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Mot de passe mis à jour avec succès !", type: "success" });
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Mon Profil
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gérez vos informations personnelles et votre sécurité.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-xl">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Changer le mot de passe
        </h2>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input name="password" type="password" placeholder="Nouveau mot de passe" />
          </div>
          <div>
            <Label>Confirmer le mot de passe</Label>
            <Input name="confirmPassword" type="password" placeholder="Confirmer le mot de passe" />
          </div>

          <div className="pt-2">
            <Button disabled={loading}>
              {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
