import { supabase } from "../supabaseClient";
import { SiteMessage } from "@/types/club";

// Fetch all messages from site_messages
export const fetchSiteMessages = async (): Promise<SiteMessage[]> => {
  const allMessages: SiteMessage[] = [];

  const { data: siteData, error: siteErr } = await supabase
    .from("site_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (!siteErr && siteData) {
    const formattedSite = siteData.map((m: any) => {
      // Map the real DB columns to the UI interface
      const enfantNom = m.payload?.child_first_name 
        ? `${m.payload.child_first_name} ${m.payload.child_last_name || ''}`.trim() 
        : undefined;

      return {
        id: m.id,
        type_message: m.type === 'joueur' ? 'inscription_joueur' : m.type || "contact_general",
        statut: m.status === 'enrolled' ? 'inscrit' : m.status === 'archived' ? 'archive' : m.is_read ? 'lu' : 'nouveau',
        contact_nom: m.name || "",
        contact_email: m.email || "",
        contact_telephone: m.phone || "",
        sujet: m.type === 'joueur' ? `Inscription Joueur - ${enfantNom || 'N/A'}` : "Message",
        contenu: m.message || "",
        reference_id: m.id,
        created_at: m.created_at || new Date().toISOString(),
        metadata: { ...m.payload, enfant_nom: enfantNom, source_table: 'site_messages' },
      } as SiteMessage;
    });
    allMessages.push(...formattedSite);
  }

  // Sort by date descending
  allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allMessages;
};

export const fetchSiteMessageById = async (id: string): Promise<SiteMessage | null> => {
  const { data, error } = await supabase
    .from("site_messages")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const enfantNom = data.payload?.child_first_name 
    ? `${data.payload.child_first_name} ${data.payload.child_last_name || ''}`.trim() 
    : undefined;

  return {
    id: data.id,
    type_message: data.type === 'joueur' ? 'inscription_joueur' : data.type || "contact_general",
    statut: data.status === 'enrolled' ? 'inscrit' : data.status === 'archived' ? 'archive' : data.is_read ? 'lu' : 'nouveau',
    contact_nom: data.name || "",
    contact_email: data.email || "",
    contact_telephone: data.phone || "",
    sujet: data.type === 'joueur' ? `Inscription Joueur - ${enfantNom || 'N/A'}` : "Message",
    contenu: data.message || "",
    reference_id: data.id,
    created_at: data.created_at || new Date().toISOString(),
    metadata: { ...data.payload, enfant_nom: enfantNom, source_table: 'site_messages' },
  } as SiteMessage;
};

// Update message status
export const updateMessageStatus = async (id: string, statut: "nouveau" | "lu" | "archive" | "inscrit", metadata?: any) => {
  const isRead = statut === "lu" || statut === "archive" || statut === "inscrit";
  const statusStr = statut === "nouveau" ? "pending" : statut === "inscrit" ? "enrolled" : statut === "archive" ? "archived" : "resolved";

  const { error } = await supabase
    .from("site_messages")
    .update({ is_read: isRead, status: statusStr })
    .eq("id", id);
    
  if (error) {
    throw error;
  }
};

// Delete message
export const deleteMessage = async (id: string, metadata?: any) => {
  const { error } = await supabase
    .from("site_messages")
    .delete()
    .eq("id", id);
    
  if (error) {
    throw error;
  }
};

export const fetchDocumentsForMessage = async (id: string, email: string) => {
  const { data: msgData } = await supabase.from('site_messages').select('created_at').eq('id', id).single();
  const targetTime = msgData?.created_at ? new Date(msgData.created_at).getTime() : Date.now();

  const { data: allRegs } = await supabase.from('player_registrations').select('id, created_at').eq('guardian_email', email);
  if (!allRegs || allRegs.length === 0) return [];

  let regId = allRegs[0].id;
  let minDiff = Infinity;
  for (const r of allRegs) {
    const diff = Math.abs(new Date(r.created_at).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      regId = r.id;
    }
  }

  const { data: docs } = await supabase.from('player_registration_documents').select('*').eq('registration_id', regId);
  return docs || [];
};

export const fetchFullRegistrationDataForPlayer = async (player: any) => {
  try {
    const emailToSearch = player?.email || player?.parentEmail;
    let reg: any = null;

    if (emailToSearch) {
      const { data: allRegs } = await supabase
        .from('player_registrations')
        .select('*')
        .eq('guardian_email', emailToSearch)
        .order('created_at', { ascending: false })
        .limit(1);

      if (allRegs && allRegs.length > 0) {
        reg = allRegs[0];
      }
    }

    if (!reg && player?.nom && player?.prenom) {
      const { data: nameRegs } = await supabase
        .from('player_registrations')
        .select('*')
        .ilike('child_last_name', `%${player.nom}%`)
        .ilike('child_first_name', `%${player.prenom}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (nameRegs && nameRegs.length > 0) {
        reg = nameRegs[0];
      }
    }

    let docs: any[] = [];
    if (reg?.id) {
      const { data: docRows } = await supabase
        .from('player_registration_documents')
        .select('*')
        .eq('registration_id', reg.id);
      docs = docRows || [];
    }

    return { registration: reg, documents: docs };
  } catch (e) {
    console.warn("Error fetching registration data for player:", e);
    return { registration: null, documents: [] };
  }
};