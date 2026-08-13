import { supabase } from "../supabaseClient";
import { SiteMessage } from "@/types/club";

// Fetch all messages from site_messages AND detection_registrations
export const fetchSiteMessages = async (): Promise<SiteMessage[]> => {
  const allMessages: SiteMessage[] = [];

  const fetchAllSiteMessages = async () => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("site_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + step - 1);
      
      if (error) break;
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
      } else {
        break;
      }
    }
    return allData;
  };

  const fetchAllDetectionRegistrations = async () => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("detection_registrations")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + step - 1);
      
      if (error) break;
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
      } else {
        break;
      }
    }
    return allData;
  };

  const [siteData, detectionData] = await Promise.all([
    fetchAllSiteMessages(),
    fetchAllDetectionRegistrations().catch(() => [])
  ]);

  if (siteData && siteData.length > 0) {
    const formattedSite = siteData.map((m: any) => {
      const enfantNom = m.payload?.child_first_name 
        ? `${m.payload.child_first_name} ${m.payload.child_last_name || ''}`.trim() 
        : undefined;

      return {
        id: String(m.id),
        type_message: m.type === 'joueur' ? 'inscription_joueur' : m.type || "contact_general",
        statut: m.status === 'enrolled' ? 'inscrit' : m.status === 'archived' ? 'archive' : m.is_read ? 'lu' : 'nouveau',
        contact_nom: m.name || "",
        contact_email: m.email || "",
        contact_telephone: m.phone || "",
        sujet: m.type === 'joueur' ? `Inscription Joueur - ${enfantNom || 'N/A'}` : "Message",
        contenu: m.message || "",
        reference_id: String(m.id),
        created_at: m.created_at || new Date().toISOString(),
        metadata: { ...m.payload, enfant_nom: enfantNom, source_table: 'site_messages' },
      } as SiteMessage;
    });
    allMessages.push(...formattedSite);
  }

  if (detectionData && detectionData.length > 0) {
    const formattedDetections = detectionData.map((d: any) => {
      const childFullName = `${d.prenom || ''} ${d.nom || ''}`.trim();
      return {
        id: `det_${d.id}`,
        type_message: 'detection',
        statut: d.status === 'enrolled' ? 'inscrit' : d.status === 'archived' ? 'archive' : d.is_read ? 'lu' : 'nouveau',
        contact_nom: d.parent_nom || childFullName || d.nom || "",
        contact_email: d.parent_email || d.email || "",
        contact_telephone: d.parent_telephone || d.telephone || "",
        sujet: `Détection Joueur - ${childFullName}`,
        contenu: `Candidature Détection #${d.numero_detection || d.id} (${d.zone_residence || 'N/A'})`,
        reference_id: String(d.id),
        created_at: d.created_at || new Date().toISOString(),
        metadata: {
          nom: d.nom,
          prenom: d.prenom,
          enfant_nom: childFullName,
          sexe: d.sexe,
          date_naissance: d.date_naissance,
          lieu_naissance: d.lieu_naissance,
          telephone: d.telephone,
          email: d.email,
          zone_residence: d.zone_residence,
          pied_dominant: d.pied_dominant,
          club_actuel: d.club_actuel,
          niveau_actuel: d.niveau_actuel,
          experience_competitive: d.experience_competitive,
          comment_identifie: d.comment_identifie,
          parent_nom: d.parent_nom,
          parent_lien: d.parent_lien,
          parent_telephone: d.parent_telephone,
          parent_email: d.parent_email,
          urgence_nom: d.urgence_nom,
          urgence_telephone: d.urgence_telephone,
          photo_recente_url: d.photo_recente_url,
          numero_detection: d.numero_detection,
          source_table: 'detection_registrations',
          raw_db_id: d.id,
        },
      } as SiteMessage;
    });
    allMessages.push(...formattedDetections);
  }

  // Sort by date descending
  allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allMessages;
};

export const fetchSiteMessageById = async (id: string): Promise<SiteMessage | null> => {
  if (id.startsWith("det_")) {
    const rawId = id.replace("det_", "");
    const { data, error } = await supabase
      .from("detection_registrations")
      .select("*")
      .eq("id", rawId)
      .single();

    if (error || !data) return null;

    const childFullName = `${data.prenom || ''} ${data.nom || ''}`.trim();
    return {
      id: `det_${data.id}`,
      type_message: 'detection',
      statut: data.status === 'enrolled' ? 'inscrit' : data.status === 'archived' ? 'archive' : data.is_read ? 'lu' : 'nouveau',
      contact_nom: data.parent_nom || childFullName || data.nom || "",
      contact_email: data.parent_email || data.email || "",
      contact_telephone: data.parent_telephone || data.telephone || "",
      sujet: `Détection Joueur - ${childFullName}`,
      contenu: `Candidature Détection #${data.numero_detection || data.id}`,
      reference_id: String(data.id),
      created_at: data.created_at || new Date().toISOString(),
      metadata: {
        nom: data.nom,
        prenom: data.prenom,
        enfant_nom: childFullName,
        sexe: data.sexe,
        date_naissance: data.date_naissance,
        lieu_naissance: data.lieu_naissance,
        telephone: data.telephone,
        email: data.email,
        zone_residence: data.zone_residence,
        pied_dominant: data.pied_dominant,
        club_actuel: data.club_actuel,
        niveau_actuel: data.niveau_actuel,
        experience_competitive: data.experience_competitive,
        comment_identifie: data.comment_identifie,
        parent_nom: data.parent_nom,
        parent_lien: data.parent_lien,
        parent_telephone: data.parent_telephone,
        parent_email: data.parent_email,
        urgence_nom: data.urgence_nom,
        urgence_telephone: data.urgence_telephone,
        photo_recente_url: data.photo_recente_url,
        numero_detection: data.numero_detection,
        source_table: 'detection_registrations',
        raw_db_id: data.id,
      },
    } as SiteMessage;
  }

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
    id: String(data.id),
    type_message: data.type === 'joueur' ? 'inscription_joueur' : data.type || "contact_general",
    statut: data.status === 'enrolled' ? 'inscrit' : data.status === 'archived' ? 'archive' : data.is_read ? 'lu' : 'nouveau',
    contact_nom: data.name || "",
    contact_email: data.email || "",
    contact_telephone: data.phone || "",
    sujet: data.type === 'joueur' ? `Inscription Joueur - ${enfantNom || 'N/A'}` : "Message",
    contenu: data.message || "",
    reference_id: String(data.id),
    created_at: data.created_at || new Date().toISOString(),
    metadata: { ...data.payload, enfant_nom: enfantNom, source_table: 'site_messages' },
  } as SiteMessage;
};

// Update message status
export const updateMessageStatus = async (id: string, statut: "nouveau" | "lu" | "archive" | "inscrit", metadata?: any) => {
  const isRead = statut === "lu" || statut === "archive" || statut === "inscrit";
  const statusStr = statut === "nouveau" ? "pending" : statut === "inscrit" ? "enrolled" : statut === "archive" ? "archived" : "resolved";

  if (id.startsWith("det_") || metadata?.source_table === 'detection_registrations') {
    const rawId = metadata?.raw_db_id || id.replace("det_", "");
    const { error } = await supabase
      .from("detection_registrations")
      .update({ is_read: isRead, status: statusStr })
      .eq("id", rawId);

    if (error) {
      // Try updating without status column if it doesn't exist
      await supabase
        .from("detection_registrations")
        .update({ is_read: isRead })
        .eq("id", rawId);
    }
    return;
  }

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
  if (id.startsWith("det_") || metadata?.source_table === 'detection_registrations') {
    const rawId = metadata?.raw_db_id || id.replace("det_", "");
    const { error } = await supabase
      .from("detection_registrations")
      .delete()
      .eq("id", rawId);
      
    if (error) {
      throw error;
    }
    return;
  }

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