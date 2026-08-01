"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function getUsersList() {
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError || !authData?.users) {
      return { users: [] };
    }

    const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const users = authData.users.map(u => {
      const prof = profileMap.get(u.id);
      const metaRole = u.user_metadata?.role;
      return {
        id: u.id,
        email: u.email || "",
        full_name: prof?.full_name || u.user_metadata?.full_name || u.email || "Utilisateur",
        role: prof?.role || metaRole || (u.email === "footballclubtoro@gmail.com" ? "Super Admin" : "Admin"),
        sections: prof?.sections || u.user_metadata?.sections || [],
        categories: u.user_metadata?.categories || [],
        created_at: u.created_at || new Date().toISOString()
      };
    });

    return { users };
  } catch (err: any) {
    return { users: [] };
  }
}

async function upsertProfile(profile: Record<string, any>) {
  const { error } = await supabaseAdmin.from("profiles").upsert([profile]);
  if (!error) {
    return { error: null };
  }

  if (error.code === "PGRST204" && error.message?.includes("sections")) {
    const { sections, ...profileWithoutSections } = profile;
    const { error: retryError } = await supabaseAdmin.from("profiles").upsert([profileWithoutSections]);
    return { error: retryError };
  }

  return { error };
}

export async function createUser(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const rawFullName = formData.get("fullName") as string;
    const role = formData.get("role") as string;
    const rawSections = formData.get("sections") as string;
    const rawCategories = formData.get("categories") as string;

    if (!email || !password || !role) {
      return { error: "Veuillez remplir l'adresse email et le mot de passe." };
    }

    const sections = rawSections ? JSON.parse(rawSections) : [];
    const categories = rawCategories ? JSON.parse(rawCategories) : [];
    const fullName = rawFullName && rawFullName.trim() ? rawFullName.trim() : email;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: role, sections: sections, categories: categories }
    });

    if (authError) {
      return { error: authError.message };
    }

    if (authData.user) {
      const { error: profileError } = await upsertProfile({
        id: authData.user.id,
        full_name: fullName,
        role: role,
        sections: sections,
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
      }
    }

    revalidatePath("/parametres/acces");
    return { success: true };
    
  } catch (err: any) {
    return { error: err.message || "Une erreur inattendue est survenue." };
  }
}

export async function updateUserAccess(userId: string, role: string, sections: string[], categories: string[] = []) {
  try {
    if (!userId || !role) return { error: "Données utilisateur manquantes." };

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role, sections, categories }
    });

    if (updateErr) {
      return { error: updateErr.message };
    }

    const { data: profileData } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    let fullName = profileData?.full_name;

    if (!fullName) {
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
      fullName = authUserData?.user?.user_metadata?.full_name || authUserData?.user?.email || "Utilisateur";
    }

    const { error: profileError } = await upsertProfile({
      id: userId,
      full_name: fullName,
      role,
      sections,
    });

    if (profileError) {
      return { error: profileError.message };
    }

    revalidatePath("/parametres/acces");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Impossible de mettre à jour les droits utilisateur." };
  }
}

export async function deleteUser(userId: string) {
  try {
    if (!userId) return { error: "ID utilisateur manquant." };

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) {
      return { error: authErr.message };
    }

    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    revalidatePath("/parametres/acces");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Impossible de supprimer l'utilisateur." };
  }
}

export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    if (!userId || !newPassword) return { error: "Données manquantes." };

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateErr) {
      return { error: updateErr.message };
    }

    revalidatePath("/parametres/acces");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Impossible de modifier le mot de passe." };
  }
}
