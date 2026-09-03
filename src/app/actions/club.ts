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

export async function updatePlayerAdmin(etudiantId: number | string | (number | string)[], updatePayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };

  let payload = { ...updatePayload };
  const idList = Array.isArray(etudiantId) ? etudiantId : [etudiantId];
  const targetIds: number[] = [];
  const strIds: string[] = [];

  for (const rawId of idList) {
    const sId = String(rawId).trim();
    const nId = Number(sId.replace(/\D/g, ""));
    if (!isNaN(nId) && nId > 0) targetIds.push(nId);
    if (sId) strIds.push(sId);
  }

  if (targetIds.length === 0 && strIds.length === 0) {
    return { success: false, error: "Identifiant étudiant invalide" };
  }

  // Attempt 1: Full payload
  let query = supabaseAdmin.from("tblEtudiants").update(payload);
  if (targetIds.length > 0) {
    query = query.in("EtudiantID", targetIds);
  } else {
    query = query.in("EtudiantID", strIds);
  }
  let { data, error } = await query;
  if (!error) return { success: true, data };

  // Attempt 2: Toggle EstAlumni boolean/number representation
  if ("EstAlumni" in payload) {
    payload.EstAlumni = typeof payload.EstAlumni === "boolean" 
      ? (payload.EstAlumni ? 1 : 0) 
      : (payload.EstAlumni === 1);
  }

  let query2 = supabaseAdmin.from("tblEtudiants").update(payload);
  if (targetIds.length > 0) query2 = query2.in("EtudiantID", targetIds);
  else query2 = query2.in("EtudiantID", strIds);
  let res2 = await query2;
  if (!res2.error) return { success: true, data: res2.data };

  // Attempt 3: Strip non-standard columns
  const optionalCols = [
    "StatutJoueur", "photoUrl", "photoIdentiteUrl", "carteIdentiteParentUrl",
    "acteNaissanceUrl", "fiche9eUrl", "carnetVaccinationUrl", "UrgenceNomPrenom",
    "UrgenceLien", "UrgenceTelephone", "UrgenceEmail", "UrgenceAdresse",
    "TailleHaut", "TailleShort", "Poste", "Experience", "PlanPaiement",
    "MethodePaiement", "NumerosPreferes", "Ecole", "Programme", "Info1", "Info2", "Info3"
  ];
  for (const col of optionalCols) {
    delete payload[col];
  }

  let query3 = supabaseAdmin.from("tblEtudiants").update(payload);
  if (targetIds.length > 0) query3 = query3.in("EtudiantID", targetIds);
  else query3 = query3.in("EtudiantID", strIds);
  let res3 = await query3;
  if (!res3.error) return { success: true, data: res3.data };

  // Attempt 4: Strip EstAlumni if causing column error
  delete payload.EstAlumni;

  let query4 = supabaseAdmin.from("tblEtudiants").update(payload);
  if (targetIds.length > 0) query4 = query4.in("EtudiantID", targetIds);
  else query4 = query4.in("EtudiantID", strIds);
  let res4 = await query4;
  if (!res4.error) return { success: true, data: res4.data };

  return { success: false, error: res4.error?.message || "Erreur de mise à jour" };
}

export async function upsertPlayerStatusAdmin(etudiantId: number | string | (number | string)[], status: string) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  
  const idList = Array.isArray(etudiantId) ? etudiantId : [etudiantId];
  const normalizedStatus = (status || "").trim();

  for (const rawId of idList) {
    const numId = Number(String(rawId).replace(/\D/g, ""));
    if (isNaN(numId) || numId <= 0) continue;

    const finalSt = (!normalizedStatus || normalizedStatus.toLowerCase() === "normal" || normalizedStatus.toLowerCase() === "aucun" || normalizedStatus.toLowerCase() === "standard")
      ? "Normal"
      : normalizedStatus;

    const { error } = await supabaseAdmin
      .from('player_status')
      .upsert({ 
        player_id: numId, 
        status: finalSt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'player_id' });

    if (error) {
      console.warn(`Erreur upsert player_status pour ${numId}:`, error);
    }
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

  // Synchroniser automatiquement le nom, prénom et la fonction dans tblPayroll
  if (updatePayload.Nom !== undefined || updatePayload.Prenom !== undefined || updatePayload.Fonction !== undefined) {
    const payrollUpdates: any = {};
    if (updatePayload.Nom !== undefined) payrollUpdates.EmployeNom = updatePayload.Nom;
    if (updatePayload.Prenom !== undefined) payrollUpdates.EmployePrenom = updatePayload.Prenom;
    if (updatePayload.Fonction !== undefined) payrollUpdates.Fonction = updatePayload.Fonction;

    const strTargetId = String(targetId);
    const numTargetId = typeof targetId === "number" ? targetId : parseInt(strTargetId, 10);

    await supabaseAdmin
      .from("tblPayroll")
      .update(payrollUpdates)
      .or(`EmployeId.eq.${numTargetId},EmployeId.eq.${strTargetId}`);
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

export async function getPaiementsAdmin() {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("tblPaiements")
      .select("*")
      .order("Id", { ascending: false })
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

export async function insertPayrollAdmin(insertPayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  try {
    const calculateMaxId = async (): Promise<number> => {
      const { data, error } = await supabaseAdmin
        .from("tblPayroll")
        .select("Id")
        .order("Id", { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        const num = Number(data[0].Id);
        return !isNaN(num) ? num : 0;
      }
      return 0;
    };

    if (!insertPayload.Id) {
      const maxId = await calculateMaxId();
      if (maxId > 0) {
        insertPayload.Id = maxId + 1;
      }
    }

    let { data, error } = await supabaseAdmin
      .from("tblPayroll")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      const payloadCopy = { ...insertPayload };
      const optionalCols = [
        "PrelevementSnowizz", "Ajustement", "TaxeIRI", "TaxeCFGDCT",
        "TaxeCAS", "TaxeFDU", "TaxeONA", "VacancesPayees", "CongeSansSolde",
        "CumulPaiements", "PrelevementPourcentage", "PrelevementMontant",
        "PrelevementAvance", "PrelevementType", "TypeSalaire", "NombreSeances",
        "TauxParSeance", "Devise", "PieceJointe"
      ];
      for (const col of optionalCols) {
        delete payloadCopy[col];
      }
      const retry = await supabaseAdmin
        .from("tblPayroll")
        .insert(payloadCopy)
        .select("*")
        .single();
      if (!retry.error) {
        return { success: true, data: retry.data || { Id: insertPayload.Id } };
      }
      return { success: false, error: error.message || String(error) };
    }
    return { success: true, data: data || { Id: insertPayload.Id } };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function updatePayrollAdmin(id: string, updatePayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  try {
    let { data, error } = await supabaseAdmin
      .from("tblPayroll")
      .update(updatePayload)
      .eq("Id", parseInt(id, 10))
      .select("*");

    if (error) {
      const payloadCopy = { ...updatePayload };
      const optionalCols = [
        "PrelevementSnowizz", "Ajustement", "TaxeIRI", "TaxeCFGDCT",
        "TaxeCAS", "TaxeFDU", "TaxeONA", "VacancesPayees", "CongeSansSolde",
        "CumulPaiements", "PrelevementPourcentage", "PrelevementMontant",
        "PrelevementAvance", "PrelevementType", "TypeSalaire", "NombreSeances",
        "TauxParSeance", "Devise", "PieceJointe"
      ];
      for (const col of optionalCols) {
        delete payloadCopy[col];
      }
      const retry = await supabaseAdmin
        .from("tblPayroll")
        .update(payloadCopy)
        .eq("Id", parseInt(id, 10))
        .select("*");
      if (!retry.error) {
        return { success: true, data: retry.data };
      }
      return { success: false, error: error.message || String(error) };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function deletePayrollAdmin(id: string) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };
  try {
    const { error } = await supabaseAdmin
      .from("tblPayroll")
      .delete()
      .eq("Id", parseInt(id, 10));
    if (error) return { success: false, error: error.message || String(error) };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function getSystemStatsAction() {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };

  const tables = [
    { key: "joueurs", table: "tblEtudiants", label: "Joueurs" },
    { key: "statuts_speciaux", table: "player_status", label: "Statuts Spéciaux" },
    { key: "paiements", table: "tblPaiements", label: "Paiements" },
    { key: "factures", table: "tblFacture", label: "Factures" },
    { key: "inscriptions", table: "tblInscriptions", label: "Inscriptions" },
    { key: "sessions", table: "tblSessions", label: "Sessions / Saisons" },
    { key: "employes", table: "tblEmployes", label: "Employés" },
    { key: "payroll", table: "tblPayroll", label: "Fiches de paie" },
    { key: "rubriques", table: "tblRubriques", label: "Rubriques tarifaires" },
    { key: "effectifs", table: "tblEffectifs", label: "Effectifs / Matchs" },
    { key: "evenements", table: "tblEvenements", label: "Événements" },
    { key: "demandes", table: "player_registrations", label: "Demandes d'inscription" },
    { key: "detections", table: "detection_registrations", label: "Demandes de détection" },
    { key: "profils", table: "profiles", label: "Comptes d'accès" },
    { key: "alumni", table: "tblAlumni", label: "Alumni" },
    { key: "parents", table: "tblParents", label: "Parents" },
    { key: "staff", table: "tblStaff", label: "Staff" },
    { key: "coachs", table: "tblCoaches", label: "Coachs" },
    { key: "programmes", table: "tblProgrammes", label: "Programmes" },
    { key: "presences", table: "tblPresences", label: "Présences" },
  ];

  const counts: Record<string, { label: string; count: number; table: string }> = {};
  let total = 0;

  await Promise.all(
    tables.map(async (t) => {
      try {
        let { count, error } = await supabaseAdmin
          .from(t.table)
          .select("*", { count: "exact", head: true });
        
        // Fallback for tables with singular/plural variants
        if ((error || count === null) && t.table === "tblPaiements") {
          const fallback = await supabaseAdmin.from("tblPaiement").select("*", { count: "exact", head: true });
          if (!fallback.error && fallback.count !== null) {
            count = fallback.count;
            error = null;
          }
        }

        const countVal = (!error && count !== null) ? count : 0;
        counts[t.key] = { label: t.label, count: countVal, table: t.table };
        total += countVal;
      } catch {
        counts[t.key] = { label: t.label, count: 0, table: t.table };
      }
    })
  );

  return { success: true, counts, total };
}

export async function exportFullSystemBackupAction(userEmail?: string) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };

  const tableList = [
    "tblEtudiants",
    "player_status",
    "tblPaiements",
    "tblFacture",
    "tblInscriptions",
    "tblSessions",
    "tblEmployes",
    "tblPayroll",
    "tblRubriques",
    "tblEffectifs",
    "tblEvenements",
    "player_registrations",
    "detection_registrations",
    "profiles",
    "tblAlumni",
    "tblParents",
    "tblStaff",
    "tblCoaches",
    "tblProgrammes",
    "tblPresences"
  ];

  const fetchTableData = async (tableName: string) => {
    const pageSize = 1000;
    let from = 0;
    const allRows: any[] = [];
    while (true) {
      try {
        let { data, error } = await supabaseAdmin
          .from(tableName)
          .select("*")
          .range(from, from + pageSize - 1);

        // Fallback if table name is tblPaiement without s
        if (error && tableName === "tblPaiements") {
          const fallback = await supabaseAdmin.from("tblPaiement").select("*").range(from, from + pageSize - 1);
          if (!fallback.error) {
            data = fallback.data;
            error = null;
          }
        }

        if (error) {
          console.warn(`[Backup] Note sur la table ${tableName}:`, error.message);
          break;
        }
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      } catch (err: any) {
        console.warn(`[Backup] Erreur lors de l'extraction de ${tableName}:`, err?.message);
        break;
      }
    }
    return allRows;
  };

  try {
    const backupData: Record<string, any[]> = {};
    const summary: Record<string, number> = {};
    let totalRecords = 0;

    for (const table of tableList) {
      const rows = await fetchTableData(table);
      backupData[table] = rows;
      summary[table] = rows.length;
      totalRecords += rows.length;
    }

    const payload = {
      metadata: {
        appName: "FC TORO Management System",
        version: "2.0",
        timestamp: new Date().toISOString(),
        exportedBy: userEmail || "Superadmin",
        totalRecords,
        tablesCount: tableList.length,
        summary,
      },
      data: backupData,
    };

    return { success: true, payload };
  } catch (error: any) {
    console.error("[Backup] Erreur globale export:", error);
    return { success: false, error: error?.message || "Erreur lors de l'exportation du backup." };
  }
}

export async function restoreFullSystemBackupAction(backupPayload: any) {
  if (!supabaseAdmin) return { success: false, error: "Service role Supabase indisponible." };

  if (!backupPayload || !backupPayload.data || typeof backupPayload.data !== "object") {
    return { success: false, error: "Fichier de sauvegarde invalide ou corrompu." };
  }

  const { data: tablesData } = backupPayload;
  const restorationReport: Record<string, { total: number; restored: number; error?: string }> = {};

  // Table order for foreign keys safety
  const orderedTables = [
    "profiles",
    "tblRubriques",
    "tblSessions",
    "tblParents",
    "tblStaff",
    "tblEmployes",
    "tblCoaches",
    "tblEtudiants",
    "player_status",
    "tblInscriptions",
    "tblPaiements",
    "tblPaiement",
    "tblFacture",
    "tblPayroll",
    "tblAlumni",
    "tblEvenements",
    "tblEffectifs",
    "tblProgrammes",
    "player_registrations",
    "detection_registrations",
    "tblPresences"
  ];

  for (const tableName of orderedTables) {
    const rows = tablesData[tableName];
    if (!Array.isArray(rows) || rows.length === 0) {
      restorationReport[tableName] = { total: 0, restored: 0 };
      continue;
    }

    const batchSize = 100;
    let restoredCount = 0;
    let tableError: string | undefined;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .upsert(batch, { ignoreDuplicates: false });

        if (error) {
          // If upsert fails, attempt sequential insert ignoring errors
          tableError = error.message;
          for (const item of batch) {
            try {
              const { error: singleErr } = await supabaseAdmin
                .from(tableName)
                .upsert(item);
              if (!singleErr) restoredCount++;
            } catch {}
          }
        } else {
          restoredCount += batch.length;
        }
      } catch (batchErr: any) {
        tableError = batchErr?.message;
      }
    }

    restorationReport[tableName] = {
      total: rows.length,
      restored: restoredCount,
      error: tableError,
    };
  }

  return {
    success: true,
    report: restorationReport,
    timestamp: new Date().toISOString(),
  };
}


