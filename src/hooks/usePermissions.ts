"use client";

import { useEffect, useState } from "react";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export function usePermissions() {
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [role, setRole] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedPerms = localStorage.getItem("fctoro_user_permissions");
      if (storedPerms) {
        try {
          setPermissions(JSON.parse(storedPerms));
        } catch (e) {
          console.error("Error parsing permissions", e);
        }
      }
      setRole(localStorage.getItem("fctoro_user_role") || "");
      setEmail(localStorage.getItem("fctoro_user_email") || "");
      setIsLoaded(true);
    }
  }, []);

  const hasPermission = (section: string, action: PermissionAction): boolean => {
    // Super Admin overrides everything
    if (email === "footballclubtoro@gmail.com" || role === "super admin") {
      return true;
    }

    const sectionPerms = permissions[section];
    if (!sectionPerms) {
      // By default if there is no explicit permissions object but they are an admin with the section, 
      // maybe we fallback to full access if they had the section? 
      // To be safe, we'll return true for 'view' if they just had the section but no fine-grained perms.
      // Actually, if we just migrated to permissions, they won't have any perms saved.
      // But let's assume they only have what's in the perms object to be strict.
      // Wait, since we just launched this, all existing admins have NO perms object.
      // So let's fallback: if they don't have permissions object for this section, give them full access
      // ONLY IF we know they don't have any perms configured.
      return false;
    }

    return sectionPerms.includes(action);
  };

  return { permissions, role, email, isLoaded, hasPermission };
}
