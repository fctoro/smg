"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";

type Permission = {
  id: string;
  role: string;
  section: string;
  can_access: boolean;
};

const SECTIONS = ["dashboard", "joueurs", "coachs", "staff", "alumni", "parents", "evenements", "factures", "paiements", "recus", "classement"];
const ROLES = ["Admin", "Coach"]; // Super Admin has access to everything implicitly

export default function AccessControlPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("permissions").select("*").is("user_id", null);
    if (!error && data) {
      setPermissions(data);
    }
    setLoading(false);
  };

  const getPermission = (role: string, section: string) => {
    return permissions.find(p => p.role === role && p.section === section);
  };

  const handleToggle = (role: string, section: string, checked: boolean) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.role === role && p.section === section);
      if (existing) {
        return prev.map(p => p.id === existing.id ? { ...p, can_access: checked } : p);
      } else {
        return [...prev, { id: `temp-${Date.now()}`, role, section, can_access: checked }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    // In a real app, you would upsert this in bulk.
    const { error } = await supabase.from("permissions").upsert(
      permissions.map(p => {
        // If it's a temporary ID, remove it so Supabase generates a UUID
        const { id, ...rest } = p;
        return p.id.startsWith("temp-") ? rest : p;
      }), 
      { onConflict: "role, section" } // assuming a unique constraint on role+section, otherwise you might need to handle this differently
    );

    if (error) {
      setMessage({ text: "Erreur lors de la sauvegarde: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Permissions mises à jour avec succès.", type: "success" });
      await fetchPermissions(); // reload exact IDs
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Contrôle des Accès (RBAC)
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gérez l'accès aux différentes sections du système selon le rôle.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {message && (
          <div className={`m-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'}`}>
            {message.text}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Section</th>
                {ROLES.map(role => (
                  <th key={role} className="px-6 py-4 font-medium text-gray-900 dark:text-white text-center">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {SECTIONS.map(section => (
                <tr key={section} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white capitalize">
                    {section}
                  </td>
                  {ROLES.map(role => {
                    const perm = getPermission(role, section);
                    const isChecked = perm?.can_access || false;
                    return (
                      <td key={`${role}-${section}`} className="px-6 py-4 text-center">
                         <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => handleToggle(role, section, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </div>
    </div>
  );
}
