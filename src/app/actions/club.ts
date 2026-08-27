"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

export async function insertPlayerAdmin(insertPayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };

  const calculateMaxId = async (): Promise<number> => {
    let maxId = 0;
    let from = 0;
    const step = 1000;
    while (true) {
      const { data: rows, error } = await supabaseAdmin
        .from("tblEtudiants")
        .select("EtudiantID")
        .range(from, from + step - 1);

      if (error || !rows || rows.length === 0) break;

      for (const r of rows) {
        const num = Number(r.EtudiantID);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }

      if (rows.length < step) break;
      from += step;
    }
    return maxId;
  };

  if (!insertPayload.EtudiantID) {
    const currentMax = await calculateMaxId();
    insertPayload.EtudiantID = currentMax > 0 ? currentMax + 1 : 1;
  }

  let attempts = 0;
  let lastError: any = null;

  while (attempts < 10) {
    attempts++;
    const { data, error } = await supabaseAdmin
      .from("tblEtudiants")
      .insert(insertPayload)
      .select("EtudiantID")
      .single();

    if (!error && data) {
      return { success: true, data };
    }

    lastError = error;

    // Duplicate key error handler (code 23505 or PK_tblEtudiant)
    if (error && (error.code === "23505" || error.message?.includes("PK_tblEtudiant") || error.message?.includes("duplicate key"))) {
      const freshMax = await calculateMaxId();
      insertPayload.EtudiantID = Math.max(Number(insertPayload.EtudiantID) + 1, freshMax + 1);
    } else {
      // Non-duplicate error, break immediately
      break;
    }
  }

  return { success: false, error: lastError?.message || "Erreur lors de l'insertion." };
}

export async function updatePlayerAdmin(etudiantId: number | string, updatePayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };

  let payload = { ...updatePayload };

  const strId = String(etudiantId).trim();
  const numId = Number(strId.replace(/\D/g, ""));
  const targetId = !isNaN(numId) && numId > 0 ? numId : strId;

  // Attempt 1: Full payload
  let { data, error } = await supabaseAdmin
    .from("tblEtudiants")
    .update(payload)
    .or(`EtudiantID.eq.${targetId},EtudiantID.eq.${strId}`);

  if (!error) return { success: true, data };

  // Attempt 2: Toggle EstAlumni boolean/number representation
  if ("EstAlumni" in payload) {
    payload.EstAlumni = typeof payload.EstAlumni === "boolean" 
      ? (payload.EstAlumni ? 1 : 0) 
      : (payload.EstAlumni === 1);
  }

  let res2 = await supabaseAdmin
    .from("tblEtudiants")
    .update(payload)
    .or(`EtudiantID.eq.${targetId},EtudiantID.eq.${strId}`);

  if (!res2.error) return { success: true, data: res2.data };

  // Attempt 3: Strip non-standard columns (StatutJoueur, photoUrl, photoIdentiteUrl)
  delete payload.StatutJoueur;
  delete payload.photoUrl;

  let res3 = await supabaseAdmin
    .from("tblEtudiants")
    .update(payload)
    .or(`EtudiantID.eq.${targetId},EtudiantID.eq.${strId}`);

  if (!res3.error) return { success: true, data: res3.data };

  // Attempt 4: Strip EstAlumni if causing column error
  delete payload.EstAlumni;

  let res4 = await supabaseAdmin
    .from("tblEtudiants")
    .update(payload)
    .or(`EtudiantID.eq.${targetId},EtudiantID.eq.${strId}`);

  if (!res4.error) return { success: true, data: res4.data };

  return { success: false, error: res4.error?.message || "Erreur de mise à jour" };
}

export async function upsertPlayerStatusAdmin(etudiantId: number, status: string) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { error } = await supabaseAdmin
    .from('player_status')
    .upsert({ 
      player_id: etudiantId, 
      status: status,
      updated_at: new Date().toISOString()
    }, { onConflict: 'player_id' });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function softDeletePlayerAdmin(etudiantId: number) {
  if (!supabaseAdmin) {
    return { success: false, error: "Service role Supabase indisponible." };
  }

  // First, fetch the email before deleting to revert site_messages
  const { data: playerInfo } = await supabaseAdmin
    .from("tblEtudiants")
    .select("Email")
    .eq("EtudiantID", etudiantId)
    .single();

  const { error } = await supabaseAdmin
    .from("tblEtudiants")
    .delete()
    .eq("EtudiantID", etudiantId);

  if (error) {
    return { success: false, error: error.message };
  }
  
  // Revert site_messages from "enrolled" to "resolved" (LU)
  if (playerInfo?.Email) {
    await supabaseAdmin
      .from("site_messages")
      .update({ status: "resolved" })
      .eq("email", playerInfo.Email)
      .eq("status", "enrolled");
  }

  return { success: true };
}
export async function getEmployeesAdmin() {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("tblEmployes")
    .select("*")
    .order("EmployeId", { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function insertEmployeeAdmin(insertPayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("tblEmployes")
    .insert(insertPayload)
    .select("EmployeId")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function updateEmployeeAdmin(employeeId: number | string, updatePayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const numericId = typeof employeeId === "number" ? employeeId : parseInt(String(employeeId).replace(/\D/g, ""), 10);
  const targetId = isNaN(numericId) ? employeeId : numericId;

  const { data, error } = await supabaseAdmin
    .from("tblEmployes")
    .update(updatePayload)
    .eq("EmployeId", targetId)
    .select("EmployeId")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function softDeleteEmployeeAdmin(employeeId: number | string) {
  if (!supabaseAdmin) {
    return { success: false, error: "Service role Supabase indisponible." };
  }

  const strId = String(employeeId).trim();
  const numId = Number(strId.replace(/\D/g, ""));
  const targetId = !isNaN(numId) && numId > 0 ? numId : strId;

  let res = await supabaseAdmin
    .from("tblEmployes")
    .update({ Desactive: 1 })
    .or(`EmployeId.eq.${targetId},EmployeId.eq.${strId}`);

  if (res.error) {
    res = await supabaseAdmin
      .from("tblEmployes")
      .update({ Desactive: true })
      .or(`EmployeId.eq.${targetId},EmployeId.eq.${strId}`);
  }

  if (res.error) {
    return { success: false, error: res.error.message };
  }
  return { success: true };
}

export async function updateParentAdmin(playerIds: (number | string)[], updatePayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const numericIds = playerIds.map(id => typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, ""), 10)).filter(id => !isNaN(id));

  const { error } = await supabaseAdmin
    .from("tblEtudiants")
    .update(updatePayload)
    .in("EtudiantID", numericIds);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteParentAdmin(playerIds: (number | string)[]) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const numericIds = playerIds.map(id => typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, ""), 10)).filter(id => !isNaN(id));

  const { error } = await supabaseAdmin
    .from("tblEtudiants")
    .update({
      NomParent: null,
      PrenomParent: null,
      TelephoneParent: null,
      EmailParent: null,
      LienParente: null,
    })
    .in("EtudiantID", numericIds);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function fetchProgrammesAdmin() {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("programmes_match")
    .select("*")
    .order("date_programme", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createProgrammeAdmin(payload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin.from("programmes_match").insert([payload]).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateProgrammeAdmin(id: string, updates: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin.from("programmes_match").update(updates).eq("id", id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteProgrammeAdmin(id: string) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { error } = await supabaseAdmin.from("programmes_match").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function insertPaymentAdmin(paymentPayload: Record<string, any>) {
  if (!supabaseAdmin) {
    return { success: false, error: "Service role Supabase indisponible." };
  }

  const payload = {
    FactureId: 0,
    Annule: 0,
    ...paymentPayload,
  };

  try {
    const { data, error } = await supabaseAdmin
      .from("tblPaiements")
      .insert(payload)
      .select("Id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Impossible d’enregistrer le paiement." };
  }
}

export async function insertInvoiceAdmin(invoicePayload: Record<string, any>) {
  if (!supabaseAdmin) {
    return { success: false, error: "Service role Supabase indisponible." };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("tblFacture")
      .insert(invoicePayload)
      .select("Id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Impossible d’enregistrer la facture." };
  }
}

export async function getSiteStatus() {
  if (!supabaseAdmin) {
    return { success: false, error: "Service role Supabase indisponible." };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("site_status")
      .select("inscriptions_ouvertes, detections_ouvertes")
      .eq("id", 1)
      .single();

    if (error) throw error;
    return { success: true, status: data };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message, 
      status: { inscriptions_ouvertes: true, detections_ouvertes: true } 
    };
  }
}

export async function updateSiteStatus(field: "inscriptions_ouvertes" | "detections_ouvertes", isOpen: boolean) {
  if (!supabaseAdmin) {
    return { success: false, error: "Service role Supabase indisponible." };
  }

  try {
    const { error } = await supabaseAdmin
      .from("site_status")
      .update({ 
        [field]: isOpen,
        updated_at: new Date().toISOString()
      })
      .eq("id", 1);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRubriquesAdmin() {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("tblRubriques")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function insertRubriqueAdmin(payload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("tblRubriques")
    .insert([payload])
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateRubriqueAdmin(id: string, payload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("tblRubriques")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteRubriqueAdmin(id: string) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { error } = await supabaseAdmin
    .from("tblRubriques")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchCoachesAdmin() {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("tblCoachs")
    .select("*")
    .order("nom", { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createCoachAdmin(payload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("tblCoachs")
    .insert([payload])
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateCoachAdmin(id: string, payload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { data, error } = await supabaseAdmin
    .from("tblCoachs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteCoachAdmin(id: string) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  const { error } = await supabaseAdmin
    .from("tblCoachs")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSiteMessagesAdmin() {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
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
  return { success: true, data: allData };
}

export async function getDetectionRegistrationsAdmin() {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
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
  return { success: true, data: allData };
}
