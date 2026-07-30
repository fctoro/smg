"use server";

import { createClient } from "@supabase/supabase-js";

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

export async function insertPlayerAdmin(insertPayload: any) {
  const { data, error } = await supabaseAdmin
    .from("tblEtudiants")
    .insert(insertPayload)
    .select("EtudiantID")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}
