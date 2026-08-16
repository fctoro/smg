"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

export async function getRoleConfig() {
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("site_messages")
      .select("payload")
      .eq("type", "role_config")
      .limit(1)
      .single();
    if (error || !data) return null;
    return data.payload;
  } catch (err) {
    return null;
  }
}

export async function saveRoleConfig(config: Record<string, string[]>) {
  if (!supabaseAdmin) return { error: "No DB connection" };
  try {
    const { data: existing } = await supabaseAdmin
      .from("site_messages")
      .select("id")
      .eq("type", "role_config")
      .limit(1)
      .single();

    const payload = {
      name: "Role Config",
      email: "system@fctoro.com",
      type: "role_config",
      payload: config,
      status: "system"
    };

    if (existing?.id) {
      const { error } = await supabaseAdmin.from("site_messages").update(payload).eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("site_messages").insert([payload]);
      if (error) return { error: error.message };
    }

    // Apply the new config to all existing users for each role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (!authError && authData?.users) {
      for (const user of authData.users) {
        const userRole = user.user_metadata?.role;
        // Also check if they have an active profile role
        const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
        const effectiveRole = profile?.role || userRole;
        
        if (effectiveRole) {
          const roleKey = Object.keys(config).find(k => k.toLowerCase() === effectiveRole.toLowerCase());
          if (roleKey) {
            const roleSections = config[roleKey];
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              user_metadata: {
                ...user.user_metadata,
                sections: roleSections
              }
            });
          }
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getUsersList() {
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError || !authData?.users) {
      return { users: [] };
    }

    const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
    const profileMap = new Map((profiles || []).map((p: Record<string, any>) => [p.id, p]));

    const users = authData.users.map((u: Record<string, any>) => {
      const prof = profileMap.get(u.id) as Record<string, any> | undefined;
      const metaRole = u.user_metadata?.role;
      return {
        id: u.id,
        email: u.email || "",
        full_name: prof?.full_name || u.user_metadata?.full_name || u.email || "Utilisateur",
        role: prof?.role || metaRole || (u.email?.toLowerCase() === "footballclubtoro@gmail.com" ? "Super Admin" : "Admin"),
        sections: prof?.sections || u.user_metadata?.sections || [],
        categories: u.user_metadata?.categories || [],
        permissions: u.user_metadata?.permissions || {},
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
    const fs = require('fs');
    fs.appendFileSync('server_action.log', `[${new Date().toISOString()}] createUser called\n`);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    fs.appendFileSync('server_action.log', `Email: ${email}, Role: ${formData.get("role")}\n`);
    const rawFullName = formData.get("fullName") as string;
    const role = formData.get("role") as string;
    const rawSections = formData.get("sections") as string;
    const rawCategories = formData.get("categories") as string;
    const rawPermissions = formData.get("permissions") as string;

    if (!email || !password || !role) {
      return { error: "Veuillez remplir l'adresse email et le mot de passe." };
    }

    const sections = rawSections ? JSON.parse(rawSections) : [];
    const categories = rawCategories ? JSON.parse(rawCategories) : [];
    const permissions = rawPermissions ? JSON.parse(rawPermissions) : {};
    const fullName = rawFullName && rawFullName.trim() ? rawFullName.trim() : email;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: role, sections: sections, categories: categories, permissions: permissions }
    });
    fs.appendFileSync('server_action.log', `createUser auth done. authError: ${!!authError}\n`);

    if (authError) {
      fs.appendFileSync('server_action.log', `authError message: ${authError.message}\n`);
      return { error: authError.message };
    }

    if (authData.user) {
      fs.appendFileSync('server_action.log', `upserting profile for user ${authData.user.id}\n`);
      const { error: profileError } = await upsertProfile({
        id: authData.user.id,
        full_name: fullName,
        role: role,
        sections: sections,
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
        fs.appendFileSync('server_action.log', `profileError: ${JSON.stringify(profileError)}\n`);
      }

      if (role.toLowerCase() === "coach") {
        await syncCoachTable(email, fullName, categories);
      }
    }

    fs.appendFileSync('server_action.log', `revalidating path\n`);
    revalidatePath("/parametres/acces");
    fs.appendFileSync('server_action.log', `done\n`);
    return { success: true };
    
  } catch (err: any) {
    const fs = require('fs');
    fs.appendFileSync('server_action.log', `Catch block hit: ${err?.message}\n${err?.stack}\n`);
    return { error: err.message || "Une erreur inattendue est survenue." };
  }
}

export async function updateUserAccess(userId: string, role: string, sections: string[], categories: string[] = [], permissions: Record<string, string[]> = {}) {
  try {
    if (!userId || !role) return { error: "Données utilisateur manquantes." };

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role, sections, categories, permissions }
    });

    if (updateErr) {
      return { error: updateErr.message };
    }

    const { data: profileData } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUserData?.user?.email || "";
    let fullName = profileData?.full_name;

    if (!fullName) {
      fullName = authUserData?.user?.user_metadata?.full_name || email || "Utilisateur";
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

    if (role.toLowerCase() === "coach" && email) {
      await syncCoachTable(email, fullName, categories);
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

async function syncCoachTable(email: string, fullName: string, categories: string[]) {
  try {
    if (!email) return;

    const { data: existingCoach } = await supabaseAdmin
      .from("tblCoachs")
      .select("id, nom, prenom")
      .ilike("email", email)
      .maybeSingle();

    if (existingCoach) {
      await supabaseAdmin
        .from("tblCoachs")
        .update({ categories })
        .eq("id", existingCoach.id);
    } else {
      let nom = "Coach";
      let prenom = "Nouveau";
      if (fullName) {
        const parts = fullName.split(" ");
        if (parts.length > 1) {
          prenom = parts[0];
          nom = parts.slice(1).join(" ");
        } else {
          nom = fullName;
        }
      }
      await supabaseAdmin
        .from("tblCoachs")
        .insert([{
          nom,
          prenom,
          email,
          categories,
          sexe: "Masculin",
          saison: "2026-2027"
        }]);
    }
  } catch (e) {
    console.error("Error syncing coach to tblCoachs:", e);
  }
}

export async function syncCoachAuthMetadata(email: string, categories: string[]) {
  try {
    if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
    if (!email) return { success: false, error: "Email manquant." };

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError || !usersData?.users) {
      return { success: false, error: usersError?.message || "Impossible de lister les utilisateurs." };
    }

    const user = usersData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          role: "Coach",
          categories: categories
        }
      });

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
