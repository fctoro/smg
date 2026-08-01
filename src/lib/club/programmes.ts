import { supabase } from "../supabaseClient";
import { ProgrammeMatch } from "@/types/club";

export async function fetchProgrammes(): Promise<ProgrammeMatch[]> {
  const { data, error } = await supabase
    .from("programmes_match")
    .select("*")
    .order("date_programme", { ascending: false });

  if (error) {
    console.error("Error fetching programmes:", error);
    return [];
  }

  return data as ProgrammeMatch[];
}

export async function createProgramme(programme: Omit<ProgrammeMatch, "id" | "created_at">): Promise<ProgrammeMatch | null> {
  const { data, error } = await supabase
    .from("programmes_match")
    .insert([programme])
    .select()
    .single();

  if (error) {
    console.error("Error creating programme:", error);
    return null;
  }

  return data as ProgrammeMatch;
}

export async function updateProgramme(id: string, updates: Partial<ProgrammeMatch>): Promise<ProgrammeMatch | null> {
  const { data, error } = await supabase
    .from("programmes_match")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating programme:", error);
    return null;
  }

  return data as ProgrammeMatch;
}

export async function deleteProgramme(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("programmes_match")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting programme:", error);
    return false;
  }

  return true;
}
