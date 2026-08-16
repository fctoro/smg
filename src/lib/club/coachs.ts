import { supabase } from "@/lib/supabaseClient";
import { Coach } from "@/types/club";
import { syncCoachAuthMetadata } from "@/app/actions/user";

export async function fetchCoaches(): Promise<Coach[]> {
  const { data, error } = await supabase.from("tblCoachs").select("*").order("nom", { ascending: true });
  if (error) {
    console.error("Error fetching coaches:", error);
    return [];
  }
  return data as Coach[];
}

export async function createCoach(coach: Omit<Coach, "id" | "created_at">): Promise<{ error?: string; data?: Coach }> {
  const { data, error } = await supabase.from("tblCoachs").insert([coach]).select().single();
  if (error) {
    return { error: error.message };
  }
  
  try {
    await syncCoachAuthMetadata(coach.email, coach.categories);
  } catch (e) {
    console.error("Error syncing auth metadata in createCoach:", e);
  }

  return { data: data as Coach };
}

export async function updateCoach(id: string, updates: Partial<Coach>): Promise<{ error?: string; data?: Coach }> {
  const { data, error } = await supabase.from("tblCoachs").update(updates).eq("id", id).select().single();
  if (error) {
    return { error: error.message };
  }

  const updatedCoach = data as Coach;
  if (updatedCoach && updatedCoach.email && updatedCoach.categories) {
    try {
      await syncCoachAuthMetadata(updatedCoach.email, updatedCoach.categories);
    } catch (e) {
      console.error("Error syncing auth metadata in updateCoach:", e);
    }
  }

  return { data: updatedCoach };
}

export async function deleteCoach(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("tblCoachs").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function fetchCoachById(id: string): Promise<Coach | null> {
  const { data, error } = await supabase.from("tblCoachs").select("*").eq("id", id).single();
  if (error) {
    console.error("Error fetching coach:", error);
    return null;
  }
  return data as Coach;
}
