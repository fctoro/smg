"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export type UserRole = "admin" | "coach";

interface UserRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isCoach: boolean;
  isAdmin: boolean;
  toggleRole: () => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>("admin");
  const pathname = usePathname();

  useEffect(() => {
    const savedRole = localStorage.getItem("fctoro_user_role") as UserRole;
    if (savedRole === "coach" || savedRole === "admin") {
      setRoleState(savedRole);
    }
  }, []);

  // Automatically adjust active role context when on /coach route if needed
  useEffect(() => {
    if (pathname && pathname.startsWith("/coach") && role !== "coach") {
      setRoleState("coach");
    }
  }, [pathname, role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("fctoro_user_role", newRole);
    } catch {
      // localStorage fallback
    }
  };

  const toggleRole = () => {
    const nextRole = role === "admin" ? "coach" : "admin";
    setRole(nextRole);
  };

  return (
    <UserRoleContext.Provider
      value={{
        role,
        setRole,
        isCoach: role === "coach",
        isAdmin: role === "admin",
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
