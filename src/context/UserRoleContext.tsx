"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "super admin" | "admin" | "coach";

const ALL_SECTIONS = [
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

interface UserRoleContextType {
  role: UserRole;
  userEmail: string;
  isCoach: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userSections: string[];
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization from localStorage for INSTANT role load (no delay)
  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fctoro_user_role");
      if (saved === "coach" || saved === "admin" || saved === "super admin") {
        return saved as UserRole;
      }
    }
    return "admin";
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fctoro_user_email") || "";
    }
    return "";
  });

  const [userSections, setUserSections] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fctoro_user_sections");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return ALL_SECTIONS;
  });

  const pathname = usePathname();

  useEffect(() => {
    async function syncUserRole() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const email = data.user.email || "";
          setUserEmail(email);
          localStorage.setItem("fctoro_user_email", email);

          // 1. Primary check: Super Admin
          if (email === "footballclubtoro@gmail.com") {
            setRoleState("super admin");
            setUserSections(ALL_SECTIONS);
            localStorage.setItem("fctoro_user_role", "super admin");
            localStorage.setItem("fctoro_user_sections", JSON.stringify(ALL_SECTIONS));
            return;
          }

          // 2. Check metadata role and sections
          const metaRole = data.user.user_metadata?.role;
          const metaSections = data.user.user_metadata?.sections;
          if (metaRole) {
            const normalized = metaRole.toLowerCase() as UserRole;
            setRoleState(normalized);
            localStorage.setItem("fctoro_user_role", normalized);
            const activeSections = (Array.isArray(metaSections) && metaSections.length > 0)
              ? metaSections
              : (normalized === "coach" 
                  ? ["Dashboard", "Joueurs", "Evenements"] 
                  : ["Dashboard", "Joueurs", "Parents", "Evenements", "Paiements", "Factures"]);
            setUserSections(activeSections);
            localStorage.setItem("fctoro_user_sections", JSON.stringify(activeSections));
            return;
          }

          // 3. Fallback check profiles table
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, sections")
            .eq("id", data.user.id)
            .single();

          if (profile?.role) {
            const normalized = profile.role.toLowerCase() as UserRole;
            setRoleState(normalized);
            localStorage.setItem("fctoro_user_role", normalized);
            const activeSections = (Array.isArray(profile.sections) && profile.sections.length > 0)
              ? profile.sections
              : (normalized === "coach" 
                  ? ["Dashboard", "Joueurs", "Evenements"] 
                  : ["Dashboard", "Joueurs", "Parents", "Evenements", "Paiements", "Factures"]);
            setUserSections(activeSections);
            localStorage.setItem("fctoro_user_sections", JSON.stringify(activeSections));
            return;
          }

          setRoleState("admin");
        }
      } catch (e) {
        // Keep initial state
      }
    }

    syncUserRole();
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("fctoro_user_role", newRole);
    } catch {}
  };

  const toggleRole = () => {
    const nextRole = role === "coach" ? "admin" : "coach";
    setRole(nextRole);
  };

  const isSuperAdmin = role === "super admin" || userEmail === "footballclubtoro@gmail.com";
  const isCoach = role === "coach";
  const isAdmin = role === "admin" && !isSuperAdmin;

  return (
    <UserRoleContext.Provider
      value={{
        role,
        userEmail,
        isCoach,
        isAdmin,
        isSuperAdmin,
        userSections: isSuperAdmin ? ALL_SECTIONS : userSections,
        setRole,
        toggleRole,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error("useUserRole must be used within UserRoleProvider");
  }
  return context;
};
