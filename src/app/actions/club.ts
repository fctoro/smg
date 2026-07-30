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

export async function softDeletePlayerAdmin(etudiantId: number) {
  const { data, error } = await supabaseAdmin
    .from("tblEtudiants")
    .update({ IsDeleted: 1 })
    .eq("EtudiantID", etudiantId)
    .select("Email")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  
  // Revert site_messages from "enrolled" to "resolved" (LU)
  if (data?.Email) {
    await supabaseAdmin
      .from("site_messages")
      .update({ status: "resolved" })
      .eq("email", data.Email)
      .eq("status", "enrolled");
  }

  return { success: true, data };
}
