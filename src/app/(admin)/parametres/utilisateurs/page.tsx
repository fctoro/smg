"use client";
import React, { useState } from "react";
import { createUser } from "@/app/actions/user";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

export default function UserManagementPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);

    if (result.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      setMessage({ text: "Utilisateur créé avec succès !", type: "success" });
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Gestion des Utilisateurs
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Créez de nouveaux comptes pour les membres du club.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Ajouter un utilisateur
        </h2>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nom Complet *</Label>
              <Input name="fullName" type="text" placeholder="Ex: Jean Dupont" required />
            </div>
            <div>
              <Label>Numéro de téléphone</Label>
              <Input name="phone" type="tel" placeholder="Ex: +33 6 12 34 56 78" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Email *</Label>
              <Input name="email" type="email" placeholder="jean.dupont@email.com" required />
            </div>
            <div>
              <Label>Rôle *</Label>
              <select 
                name="role" 
                required
                className="w-full px-4 py-3 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white/90"
              >
                <option value="">Sélectionner un rôle</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Coach">Coach</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Mot de passe initial *</Label>
            <Input name="password" type="password" placeholder="Mot de passe provisoire" required />
            <p className="mt-1 text-xs text-gray-500">L'utilisateur pourra changer ce mot de passe une fois connecté.</p>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Création en cours..." : "Créer l'utilisateur"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
