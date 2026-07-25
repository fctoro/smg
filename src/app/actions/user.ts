"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize Supabase Admin client (requires service_role_key to bypass RLS and create users)
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

export async function createUser(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const role = formData.get("role") as string;

    if (!email || !password || !fullName || !role) {
      return { error: "Veuillez remplir tous les champs obligatoires." };
    }

    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email so they can log in immediately
      user_metadata: { full_name: fullName }
    });

    if (authError) {
      return { error: authError.message };
    }

    if (authData.user) {
      // 2. Insert into the public.profiles table
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            full_name: fullName,
            phone: phone,
            role: role,
          }
        ]);

      if (profileError) {
        // If profile creation fails, we might want to delete the user or handle it, 
        // but for now return the error.
        return { error: `User created but profile failed: ${profileError.message}` };
      }
    }

    revalidatePath("/parametres/utilisateurs");
    return { success: true };
    
  } catch (err: any) {
    return { error: err.message || "Une erreur inattendue est survenue." };
  }
}
