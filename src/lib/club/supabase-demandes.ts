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

// Update message status
export const updateMessageStatus = async (id: string, statut: "nouveau" | "lu" | "archive", metadata?: any) => {
  const isRead = statut === "lu" || statut === "archive";
  const statusStr = statut === "nouveau" ? "pending" : "resolved";

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