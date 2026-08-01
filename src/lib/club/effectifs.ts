import { supabase } from "@/lib/supabaseClient";
import { Effectif } from "@/types/club";

export async function fetchEffectifsByCoach(coachEmail: string): Promise<Effectif[]> {
  const { data, error } = await supabase
    .from("tblEffectifs")
    .select("*")
    .eq("coach_email", coachEmail)
    .order("date_match", { ascending: false });

  if (error) {
    // Silently return empty array if table doesn't exist yet (or other errors)
    return [];
  }
  return data as Effectif[];
}

export async function fetchEffectifById(id: string): Promise<Effectif | null> {
  const { data, error } = await supabase
    .from("tblEffectifs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }
  return data as Effectif;
}

export async function createEffectif(effectif: Omit<Effectif, "id" | "created_at">): Promise<{ error?: string; data?: Effectif }> {
  const { data, error } = await supabase.from("tblEffectifs").insert([effectif]).select().single();
  if (error) {
    return { error: error.message };
  }
  return { data: data as Effectif };
}

export async function updateEffectif(id: string, updates: Partial<Effectif>): Promise<{ error?: string; data?: Effectif }> {
  const { data, error } = await supabase.from("tblEffectifs").update(updates).eq("id", id).select().single();
  if (error) {
    return { error: error.message };
  }
  return { data: data as Effectif };
}

export async function deleteEffectif(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("tblEffectifs").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }
  return {};
}
