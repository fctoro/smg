import { supabase } from "../supabaseClient";
import { ProgrammeMatch } from "@/types/club";

export async function fetchProgrammes(): Promise<ProgrammeMatch[]> {
  try {
    const { fetchProgrammesAdmin } = await import("@/app/actions/club");
    const adminRes = await fetchProgrammesAdmin();
    if (adminRes.success && adminRes.data) {
      return adminRes.data as ProgrammeMatch[];
    }
  } catch (err) {
    // fallback to client-side supabase client
  }

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("programmes_match")
    .select("*")
    .order("date_programme", { ascending: false });

  if (error) {
    console.error("Error fetching programmes:", error?.message || error?.details || JSON.stringify(error));
    return [];
  }

  return (data || []) as ProgrammeMatch[];
}

export async function createProgramme(programme: Omit<ProgrammeMatch, "id" | "created_at">): Promise<ProgrammeMatch | null> {
  const { createProgrammeAdmin } = await import("@/app/actions/club");
  const adminRes = await createProgrammeAdmin(programme);
  if (adminRes.success && adminRes.data) {
    return adminRes.data as ProgrammeMatch;
  }

  if (!supabase) return null;

  const { data, error } = await supabase
    .from("programmes_match")
    .insert([programme])
    .select()
    .single();

  if (error) {
    console.error("Error creating programme:", error?.message || error?.details || JSON.stringify(error));
    return null;
  }

  return data as ProgrammeMatch;
}

export async function updateProgramme(id: string, updates: Partial<ProgrammeMatch>): Promise<ProgrammeMatch | null> {
  const { updateProgrammeAdmin } = await import("@/app/actions/club");
  const adminRes = await updateProgrammeAdmin(id, updates);
  if (adminRes.success && adminRes.data) {
    return adminRes.data as ProgrammeMatch;
  }

  if (!supabase) return null;

  const { data, error } = await supabase
    .from("programmes_match")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating programme:", error?.message || error?.details || JSON.stringify(error));
    return null;
  }

  return data as ProgrammeMatch;
}

export async function deleteProgramme(id: string): Promise<boolean> {
  const { deleteProgrammeAdmin } = await import("@/app/actions/club");
  const adminRes = await deleteProgrammeAdmin(id);
  if (adminRes.success) {
    return true;
  }

  if (!supabase) return false;

  const { error } = await supabase
    .from("programmes_match")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting programme:", error?.message || error?.details || JSON.stringify(error));
    return false;
  }

  return true;
}

export async function syncPlayerProgrammes(playerId: string, newProgrammeIds: string[]): Promise<void> {
  const allProgrammes = await fetchProgrammes();
  
  const currentProgrammeIds = allProgrammes
    .filter(p => p.joueurs?.includes(playerId))
    .map(p => p.id);

  const toAdd = newProgrammeIds.filter(id => !currentProgrammeIds.includes(id));
  const toRemove = currentProgrammeIds.filter(id => !newProgrammeIds.includes(id));

  for (const id of toAdd) {
    const prog = allProgrammes.find(p => p.id === id);
    if (prog) {
      const joueurs = prog.joueurs || [];
      if (!joueurs.includes(playerId)) {
        await updateProgramme(id, { joueurs: [...joueurs, playerId] });
      }
    }
  }

  for (const id of toRemove) {
    const prog = allProgrammes.find(p => p.id === id);
    if (prog) {
      const joueurs = prog.joueurs || [];
      if (joueurs.includes(playerId)) {
        await updateProgramme(id, { joueurs: joueurs.filter(jId => jId !== playerId) });
      }
    }
  }
}
