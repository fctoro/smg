import { supabase } from "@/lib/supabaseClient";
import { Player, Employee } from "@/types/club";
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

const resolveEtudiantId = (playerId: string) => {
  const trimmed = String(playerId).trim();
  const numericPart = trimmed.match(/\d+/)?.[0];
  return numericPart ? Number(numericPart) : trimmed;
};

const isMissingTauxColumnError = (error: any) =>
  error?.code === "PGRST204" ||
  String(error?.message || "").toLowerCase().includes("taux");

const isMissingPrelevementColumnError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "PGRST204" || message.includes("prelevement");
};

// --- PLAYERS (tblEtudiants) ---

export const updatePlayerInSupabase = async (playerId: string, data: Partial<Player & { photoIdentiteUrl?: string; acteNaissanceUrl?: string; carteIdentiteParentUrl?: string }>) => {
  const updatePayload: any = {};
  
  if (data.nom !== undefined) updatePayload.Nom = data.nom;
  if (data.prenom !== undefined) updatePayload.Prenom = data.prenom;
  if (data.sexe !== undefined) updatePayload.Sexe = data.sexe === "Féminin" ? "F" : "M";
  if (data.categorie !== undefined) updatePayload.Categorie = data.categorie;
  // Sauvegarder le statut dans la table séparée player_status
  const statusToUpdate = data.statutJoueur || data.statut;
  if (statusToUpdate !== undefined) {
    try {
      const { upsertPlayerStatusAdmin } = await import("@/app/actions/club");
      await upsertPlayerStatusAdmin(Number(resolveEtudiantId(playerId)), statusToUpdate);
    } catch (e) {
      await supabase
        .from('player_status')
        .upsert({ 
          player_id: resolveEtudiantId(playerId), 
          status: statusToUpdate,
          updated_at: new Date().toISOString()
        }, { onConflict: 'player_id' });
    }
  }

  if (data.cotisationDevise !== undefined) updatePayload.CotisationDevise = data.cotisationDevise;
  if (data.telephone !== undefined) updatePayload.Telephone = data.telephone;
  if (data.email !== undefined) updatePayload.Email = data.email;
  if (data.dateNaissance !== undefined) updatePayload.DateNaissance = data.dateNaissance;
  if (data.photoUrl !== undefined && data.photoUrl !== "/images/user/silhouette.svg") updatePayload.PhotoIdentiteUrl = data.photoUrl;
  if (data.saison !== undefined) updatePayload.Saison = data.saison;
  if (data.statutJoueur !== undefined) updatePayload.StatutJoueur = data.statutJoueur;

  if (data.urgenceNomPrenom !== undefined) updatePayload.UrgenceNomPrenom = data.urgenceNomPrenom;
  if (data.urgenceLien !== undefined) updatePayload.UrgenceLien = data.urgenceLien;
  if (data.urgenceTelephone !== undefined) updatePayload.UrgenceTelephone = data.urgenceTelephone;
  if (data.urgenceEmail !== undefined) updatePayload.UrgenceEmail = data.urgenceEmail;
  if (data.urgenceAdresse !== undefined) updatePayload.UrgenceAdresse = data.urgenceAdresse;
  if (data.tailleHaut !== undefined) updatePayload.TailleHaut = data.tailleHaut;
  if (data.tailleShort !== undefined) updatePayload.TailleShort = data.tailleShort;
  if (data.poste !== undefined) updatePayload.Poste = data.poste;
  if ((data as any).experienceSoccer !== undefined) updatePayload.Experience = (data as any).experienceSoccer;

  if ((data as any).commentIdentifie !== undefined || (data as any).piedDominant !== undefined || (data as any).clubActuel !== undefined) {
    const existingInfo1 = (data as any).sourceDetection ? "SOURCE:DETECTION" : "";
    updatePayload.Info1 = existingInfo1 + 
      ((data as any).commentIdentifie ? `|IDENTIFIE:${(data as any).commentIdentifie}` : "") +
      ((data as any).piedDominant ? `|PIED:${(data as any).piedDominant}` : "") +
      ((data as any).clubActuel ? `|CLUB:${(data as any).clubActuel}` : "");
  }

  if (data.parentNomPrenom !== undefined) {
    const parentParts = (data.parentNomPrenom || "").trim().split(" ");
    updatePayload.NomParent = parentParts[0] || "";
    updatePayload.PrenomParent = parentParts.slice(1).join(" ") || "";
  }
  if (data.parentEmail !== undefined) updatePayload.EmailParent = data.parentEmail;
  if (data.parentTelephone !== undefined) updatePayload.TelephoneParent = data.parentTelephone;
  if (data.parentAdresse !== undefined) updatePayload.AdresseParent = data.parentAdresse;

  if (data.statut !== undefined) {
    updatePayload.EstAlumni = data.statut === "alumni" ? 1 : 0;
    if (data.statut === "abandonne") {
      updatePayload.IsDeleted = 1;
    } else {
      updatePayload.IsDeleted = 0;
    }
  }

  // Handle new document uploads
  const handleDocUpload = async (base64Str: string, docType: string) => {
    if (!base64Str.startsWith("data:")) return base64Str; // Already a URL
    try {
      const isPdf = base64Str.startsWith("data:application/pdf");
      const ext = isPdf ? "pdf" : "jpg";
      const base64Data = base64Str.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const fileBlob = new Blob([byteArray], { type: isPdf ? "application/pdf" : "image/jpeg" });
      
      const fileName = `${docType}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, fileBlob);
      
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.error(`Error uploading ${docType}:`, e);
    }
    return null;
  };

  if (data.photoUrl && data.photoUrl.startsWith("data:")) {
    const url = await handleDocUpload(data.photoUrl, "photo_joueur");
    if (url) {
      updatePayload.PhotoIdentiteUrl = url;
      updatePayload.PhotoUrl = url;
    }
  }

  if (data.photoIdentiteUrl) {
    const url = await handleDocUpload(data.photoIdentiteUrl, "photo_identite");
    if (url) {
      updatePayload.PhotoIdentiteUrl = url;
      updatePayload.PhotoUrl = url;
    }
  }
  if (data.acteNaissanceUrl) {
    const url = data.acteNaissanceUrl.startsWith("data:") ? await handleDocUpload(data.acteNaissanceUrl, "acte_naissance") : data.acteNaissanceUrl;
    if (url) updatePayload.ActeNaissanceUrl = url;
  }
  if (data.carteIdentiteParentUrl) {
    const url = data.carteIdentiteParentUrl.startsWith("data:") ? await handleDocUpload(data.carteIdentiteParentUrl, "carte_identite_parent") : data.carteIdentiteParentUrl;
    if (url) updatePayload.CarteIdentiteParentUrl = url;
  }
  if ((data as any).fiche9eUrl) {
    const url = (data as any).fiche9eUrl.startsWith("data:") ? await handleDocUpload((data as any).fiche9eUrl, "fiche9e") : (data as any).fiche9eUrl;
    if (url) updatePayload.Info2 = url;
  }
  if ((data as any).carnetVaccinationUrl) {
    const url = (data as any).carnetVaccinationUrl.startsWith("data:") ? await handleDocUpload((data as any).carnetVaccinationUrl, "vaccination") : (data as any).carnetVaccinationUrl;
    if (url) updatePayload.Info3 = url;
  }

  const { updatePlayerAdmin } = await import("@/app/actions/club");
  let result = await updatePlayerAdmin(resolveEtudiantId(playerId), updatePayload);

  if (!result.success && (result.error?.includes("PGRST204") || result.error?.toLowerCase().includes("column"))) {
    delete updatePayload.UrgenceNomPrenom;
    delete updatePayload.UrgenceLien;
    delete updatePayload.UrgenceTelephone;
    delete updatePayload.UrgenceEmail;
    delete updatePayload.UrgenceAdresse;
    delete updatePayload.TailleHaut;
    delete updatePayload.TailleShort;
    delete updatePayload.Saison;
    result = await updatePlayerAdmin(resolveEtudiantId(playerId), updatePayload);
  }

  if (!result.success) {
    console.warn("Mise à jour directe Supabase ignorée (état local mis à jour) :", result.error);
  }
};

export const softDeletePlayerInSupabase = async (playerId: string) => {
  const etudiantId = resolveEtudiantId(playerId);
  
  const { softDeletePlayerAdmin } = await import("@/app/actions/club");
  const result = await softDeletePlayerAdmin(Number(etudiantId));
  
  if (!result.success) {
    console.error("Erreur lors de la suppression du joueur :", result.error);
    throw new Error(result.error);
  }
};

export const addPlayerToSupabase = async (data: Omit<Player & { photoIdentiteUrl?: string; acteNaissanceUrl?: string; carteIdentiteParentUrl?: string }, "id" | "matricule">) => {
  const parentParts = (data.parentNomPrenom || "").trim().split(" ");
  const nomParent = parentParts[0] || null;
  const prenomParent = parentParts.slice(1).join(" ") || null;

  const insertPayload: any = {
    Nom: data.nom,
    Prenom: data.prenom,
    Sexe: data.sexe === "Féminin" ? "F" : "M",
    Categorie: data.categorie,
    Telephone: data.telephone,
    Email: data.email,
    Adresse: data.adresse || null,
    DateNaissance: data.dateNaissance || null,
    DtCreation: new Date().toISOString(),
    IsDeleted: data.statut === "abandonne" ? 1 : 0,
    EstAlumni: data.statut === "alumni",
    Saison: data.saison || null,
    NomParent: nomParent,
    PrenomParent: prenomParent,
    TelephoneParent: data.parentTelephone || data.telephone || null,
    EmailParent: data.parentEmail || data.email || null,
    AdresseParent: data.parentAdresse || data.adresse || null,
    LienParente: data.parentLien || null,
    UrgenceNomPrenom: data.urgenceNomPrenom || null,
    UrgenceLien: data.urgenceLien || null,
    UrgenceTelephone: data.urgenceTelephone || null,
    UrgenceEmail: data.urgenceEmail || null,
    UrgenceAdresse: data.urgenceAdresse || null,
    TailleHaut: data.tailleHaut || null,
    TailleShort: data.tailleShort || null,
    StatutJoueur: data.statutJoueur || null,
    Poste: data.poste || null,
    Experience: (data as any).experienceSoccer || null,
    Info1: ((data as any).sourceDetection ? "SOURCE:DETECTION" : "") + 
           ((data as any).commentIdentifie ? `|IDENTIFIE:${(data as any).commentIdentifie}` : "") +
           ((data as any).piedDominant ? `|PIED:${(data as any).piedDominant}` : "") +
           ((data as any).clubActuel ? `|CLUB:${(data as any).clubActuel}` : ""),
  };

  const handleDocUpload = async (base64Str: string, docType: string) => {
    if (!base64Str || !base64Str.startsWith("data:")) return null;
    try {
      const isPdf = base64Str.startsWith("data:application/pdf");
      const ext = isPdf ? "pdf" : "jpg";
      const base64Data = base64Str.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const fileBlob = new Blob([byteArray], { type: isPdf ? "application/pdf" : "image/jpeg" });
      
      const fileName = `${docType}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBlob, { contentType: isPdf ? "application/pdf" : "image/jpeg" });
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.error(`Error uploading ${docType}:`, e);
    }
    return null;
  };

  if (data.photoIdentiteUrl) {
    insertPayload.PhotoIdentiteUrl = data.photoIdentiteUrl.startsWith("data:") ? await handleDocUpload(data.photoIdentiteUrl, "photo") : data.photoIdentiteUrl;
  }
  if (data.acteNaissanceUrl) {
    insertPayload.ActeNaissanceUrl = data.acteNaissanceUrl.startsWith("data:") ? await handleDocUpload(data.acteNaissanceUrl, "acte") : data.acteNaissanceUrl;
  }
  if (data.carteIdentiteParentUrl) {
    insertPayload.CarteIdentiteParentUrl = data.carteIdentiteParentUrl.startsWith("data:") ? await handleDocUpload(data.carteIdentiteParentUrl, "carte") : data.carteIdentiteParentUrl;
  }
  if ((data as any).fiche9eUrl) {
    insertPayload.Info2 = (data as any).fiche9eUrl.startsWith("data:") ? await handleDocUpload((data as any).fiche9eUrl, "fiche9e") : (data as any).fiche9eUrl;
  }
  if ((data as any).carnetVaccinationUrl) {
    insertPayload.Info3 = (data as any).carnetVaccinationUrl.startsWith("data:") ? await handleDocUpload((data as any).carnetVaccinationUrl, "vaccination") : (data as any).carnetVaccinationUrl;
  }

  const { insertPlayerAdmin } = await import("@/app/actions/club");
  let result = await insertPlayerAdmin(insertPayload);
  
  if (!result.success && (result.error?.includes("PGRST204") || result.error?.toLowerCase().includes("column"))) {
    delete insertPayload.UrgenceNomPrenom;
    delete insertPayload.UrgenceLien;
    delete insertPayload.UrgenceTelephone;
    delete insertPayload.UrgenceEmail;
    delete insertPayload.UrgenceAdresse;
    delete insertPayload.TailleHaut;
    delete insertPayload.TailleShort;
    delete insertPayload.Saison;
    result = await insertPlayerAdmin(insertPayload);
  }

  if (!result.success) {
    console.error("Erreur lors de l'ajout du joueur :", result.error);
    throw new Error(result.error);
  }

  const newEtudiantId = result.data?.EtudiantID;
  if (newEtudiantId && data.statut) {
    try {
      const { upsertPlayerStatusAdmin } = await import("@/app/actions/club");
      await upsertPlayerStatusAdmin(Number(newEtudiantId), data.statut);
    } catch (e) {
      await supabase
        .from('player_status')
        .upsert({ 
          player_id: Number(newEtudiantId), 
          status: data.statut,
          updated_at: new Date().toISOString()
        }, { onConflict: 'player_id' });
    }
  }

  return { EtudiantID: newEtudiantId };
};

// --- EMPLOYEES (tblEmployes) ---

const isMissingEmployeeColumnError = (error: any) => {
  const message = String(error?.message || error || "").toLowerCase();
  return error?.code === "PGRST204" || message.includes("tauxparseance") || message.includes("typesalaire") || message.includes("devise");
};

export const updateEmployeeInSupabase = async (employeeId: string, data: Partial<Employee>) => {
  const updatePayload: any = {};
  
  if (data.nom !== undefined) updatePayload.Nom = data.nom;
  if (data.prenom !== undefined) updatePayload.Prenom = data.prenom;
  if (data.sexe !== undefined) updatePayload.Sexe = data.sexe === "Féminin" ? "F" : "M";
  if (data.telephone !== undefined) updatePayload.Telephone = data.telephone;
  if (data.email !== undefined) updatePayload.Email = data.email;
  if (data.adresse !== undefined) updatePayload.Adresse = data.adresse;
  if (data.fonction !== undefined) updatePayload.Fonction = data.fonction;
  if (data.typeSalaire !== undefined) updatePayload.TypeSalaire = data.typeSalaire;
  if (data.tauxParSeance !== undefined) updatePayload.TauxParSeance = data.tauxParSeance;
  if (data.salaire !== undefined) updatePayload.Salaire = data.salaire;
  if (data.devise !== undefined) updatePayload.Devise = data.devise;
  if (data.dateEmbauche !== undefined) updatePayload.DateEmbauche = data.dateEmbauche;
  if (data.niveauEtude !== undefined) updatePayload.NiveauEtude = data.niveauEtude;
  if (data.profession !== undefined) updatePayload.Profession = data.profession;

  const { updateEmployeeAdmin } = await import("@/app/actions/club");
  let result = await updateEmployeeAdmin(employeeId, updatePayload);

  if (!result.success && isMissingEmployeeColumnError(result.error)) {
    delete updatePayload.TypeSalaire;
    delete updatePayload.TauxParSeance;
    delete updatePayload.Devise;
    result = await updateEmployeeAdmin(employeeId, updatePayload);
  }

  if (!result.success) {
    let { error } = await supabase
      .from("tblEmployes")
      .update(updatePayload)
      .eq("EmployeId", parseInt(employeeId, 10));

    if (error && isMissingEmployeeColumnError(error)) {
      delete updatePayload.TypeSalaire;
      delete updatePayload.TauxParSeance;
      delete updatePayload.Devise;
      ({ error } = await supabase
        .from("tblEmployes")
        .update(updatePayload)
        .eq("EmployeId", parseInt(employeeId, 10)));
    }

    if (error) {
      console.error("Erreur lors de la mise à jour de l'employé :", error);
      throw error;
    }
  }
};

export const softDeleteEmployeeInSupabase = async (employeeId: string) => {
  try {
    const { softDeleteEmployeeAdmin } = await import("@/app/actions/club");
    const result = await softDeleteEmployeeAdmin(employeeId);
    if (!result.success) {
      console.warn("Server action delete warning, falling back to client query:", result.error);
      const numericId = parseInt(String(employeeId).replace(/\D/g, ""), 10);
      const { error } = await supabase
        .from("tblEmployes")
        .update({ Desactive: 1 })
        .eq("EmployeId", isNaN(numericId) ? employeeId : numericId);
      if (error) {
        console.error("Erreur lors de la suppression de l'employé :", error);
      }
    }
  } catch (error) {
    console.error("Erreur softDeleteEmployeeInSupabase :", error);
  }
};

export const addEmployeeToSupabase = async (data: Omit<Employee, "id" | "employeId">) => {
  const insertPayload: any = {
    Nom: data.nom,
    Prenom: data.prenom,
    Sexe: data.sexe === "Féminin" ? "F" : "M",
    Telephone: data.telephone,
    Email: data.email,
    Adresse: data.adresse,
    Fonction: data.fonction,
    TypeSalaire: data.typeSalaire || "fixe",
    TauxParSeance: data.tauxParSeance || null,
    Salaire: data.salaire,
    Devise: data.devise || "HTG",
    DateEmbauche: data.dateEmbauche || null,
    NiveauEtude: data.niveauEtude,
    Profession: data.profession,
    Desactive: 0,
  };

  const { insertEmployeeAdmin } = await import("@/app/actions/club");
  let result = await insertEmployeeAdmin(insertPayload);

  if (!result.success && isMissingEmployeeColumnError(result.error)) {
    delete insertPayload.TypeSalaire;
    delete insertPayload.TauxParSeance;
    delete insertPayload.Devise;
    result = await insertEmployeeAdmin(insertPayload);
  }

  if (!result.success && String(result.error).includes("22P02")) {
    insertPayload.Desactive = false;
    result = await insertEmployeeAdmin(insertPayload);
  }

  if (result.success && result.data) {
    return result.data;
  }

  let { data: insertedData, error } = await supabase
    .from("tblEmployes")
    .insert(insertPayload)
    .select("EmployeId")
    .single();

  if (error && (error.code === "22P02" || String(error.message).includes("22P02"))) {
    insertPayload.Desactive = false;
    ({ data: insertedData, error } = await supabase
      .from("tblEmployes")
      .insert(insertPayload)
      .select("EmployeId")
      .single());
  }

  if (error && isMissingEmployeeColumnError(error)) {
    delete insertPayload.TypeSalaire;
    delete insertPayload.TauxParSeance;
    delete insertPayload.Devise;
    ({ data: insertedData, error } = await supabase
      .from("tblEmployes")
      .insert(insertPayload)
      .select("EmployeId")
      .single());
  }

  if (error) {
    console.error("Erreur lors de l'ajout de l'employé :", error);
    throw error;
  }

  return insertedData;
};

// --- PARENTS (tblEtudiants - champs parents) ---

export const updateParentInSupabase = async (
  playerId: string | string[],
  data: Partial<import("@/types/club").Parent>,
) => {
  const updatePayload: any = {};
  if (data.nom !== undefined) updatePayload.NomParent = data.nom;
  if (data.prenom !== undefined) updatePayload.PrenomParent = data.prenom;
  if (data.telephone !== undefined) updatePayload.TelephoneParent = data.telephone;
  if (data.email !== undefined) updatePayload.EmailParent = data.email;
  if (data.lien !== undefined) updatePayload.LienParente = data.lien;

  const playerIds = Array.isArray(playerId) ? playerId : [playerId];

  const { updateParentAdmin } = await import("@/app/actions/club");
  const result = await updateParentAdmin(playerIds, updatePayload);

  if (!result.success) {
    for (const id of playerIds) {
      const { error } = await supabase
        .from("tblEtudiants")
        .update(updatePayload)
        .eq("EtudiantID", resolveEtudiantId(id));

      if (error) {
        console.error("Erreur lors de la mise à jour du parent :", error);
        throw error;
      }
    }
  }
};

export const deleteParentInSupabase = async (playerId: string | string[]) => {
  const playerIds = Array.isArray(playerId) ? playerId : [playerId];

  const { deleteParentAdmin } = await import("@/app/actions/club");
  const result = await deleteParentAdmin(playerIds);

  if (!result.success) {
    const updatePayload = {
      NomParent: null,
      PrenomParent: null,
      TelephoneParent: null,
      EmailParent: null,
      LienParente: null,
    };

    for (const id of playerIds) {
      const { error } = await supabase
        .from("tblEtudiants")
        .update(updatePayload)
        .eq("EtudiantID", resolveEtudiantId(id));

      if (error) {
        console.error("Erreur lors de la suppression du parent :", error);
        throw error;
      }
    }
  }
};

// --- PAIEMENTS (tblPaiements) ---

export const updatePaymentInSupabase = async (paymentId: string, data: Partial<import("@/types/club").Payment>) => {
  const updatePayload: any = {};
  if (data.playerId !== undefined) updatePayload.EtudiantId = parseInt(data.playerId, 10);
  if (data.montant !== undefined) {
    if (data.devise === "HTG") {
      updatePayload.MntPayeGd = data.montant;
      updatePayload.MntPayeUS = null;
    } else {
      updatePayload.MntPayeUS = data.montant;
      updatePayload.MntPayeGd = null;
    }
  }
  if (data.datePaiement !== undefined) updatePayload.DateTransact = data.datePaiement;
  if (data.methode !== undefined) {
    const modePaiementMap: Record<string, number> = {
      'especes': 1,
      'carte': 2,
      'virement': 3,
      'mobile': 4,
      'cheque': 1
    };
    updatePayload.ModePaiement = modePaiementMap[data.methode] || 1;
  }
  if (data.remarque !== undefined) updatePayload.Remarque = data.remarque;
  if (data.statut !== undefined) updatePayload.Statut = data.statut;
  if (data.periode !== undefined) updatePayload.Periode = data.periode;
  if (data.taux !== undefined) updatePayload.TauxChange = data.taux;

  let { error } = await supabase
    .from("tblPaiements")
    .update(updatePayload)
    .eq("Id", resolveEtudiantId(paymentId));

  if (error && updatePayload.TauxChange !== undefined && isMissingTauxColumnError(error)) {
    delete updatePayload.TauxChange;
    ({ error } = await supabase
      .from("tblPaiements")
      .update(updatePayload)
      .eq("Id", resolveEtudiantId(paymentId)));
  }

  if (error) throw error;

  // If payment was updated, check if the related invoice should be marked as paid
  if (!error && data.playerId && data.montant !== undefined) {
    try {
      // Find the invoice for this player
      const { data: invoices, error: invoiceQueryError } = await supabase
        .from("tblFacture")
        .select("*")
        .eq("EtudiantId", parseInt(data.playerId, 10))
        .order("DateFacture", { ascending: false })
        .limit(1);

      if (!invoiceQueryError && invoices && invoices.length > 0) {
        const invoice = invoices[0];
        const montantAPayer = parseFloat(invoice.MntAPayer) || 0;
        const montantPayeGd = parseFloat(invoice.MntPayeGd) || 0;
        const montantPayeUS = parseFloat(invoice.MntPayeUS) || 0;
        const totalPaye = montantPayeGd + montantPayeUS;

        // If invoice is fully paid and not already marked as paid, update it
        if (totalPaye >= montantAPayer && montantAPayer > 0 && invoice.Statut !== "paid") {
          await supabase
            .from("tblFacture")
            .update({
              Statut: "paid",
              DatePaiement: new Date().toISOString()
            })
            .eq("Id", invoice.Id);
        }
      }
    } catch (invoiceError) {
      console.error("Error updating invoice status:", invoiceError);
      // Don't throw - payment was successful, invoice update is secondary
    }
  }
};

export const deletePaymentInSupabase = async (paymentId: string) => {
  const { error } = await supabase
    .from("tblPaiements")
    .delete()
    .eq("Id", resolveEtudiantId(paymentId));
  if (error) throw error;
};

export const addPaymentToSupabase = async (data: Omit<import("@/types/club").Payment, "id">) => {
  const modePaiementMap: Record<string, number> = {
    'especes': 1,
    'carte': 2,
    'virement': 3,
    'mobile': 4,
    'cheque': 1
  };

  const insertPayload: any = {
    EtudiantId: parseInt(data.playerId, 10),
    FactureId: 0,
    DateTransact: data.datePaiement || new Date().toISOString(),
    ModePaiement: modePaiementMap[data.methode] || 1,
    Remarque: data.remarque || "",
    Description: data.remarque || "",
    Statut: data.statut,
    Periode: data.periode,
    TauxChange: data.taux,
  };

  if (data.devise === "HTG") {
    insertPayload.MntPayeGd = data.montant;
    insertPayload.MntPayeUS = 0;
  } else {
    insertPayload.MntPayeUS = data.montant;
    insertPayload.MntPayeGd = 0;
  }

  const { insertPaymentAdmin } = await import("@/app/actions/club");
  const result = await insertPaymentAdmin(insertPayload);

  if (!result.success) {
    throw new Error(result.error || "Impossible d’enregistrer le paiement.");
  }

  // After payment is added, update the invoice with the new total in the background
  if (result.success && data.playerId) {
    (async () => {
      try {
        // Get all payments for this player to calculate total
        const { data: allPayments, error: paymentsError } = await supabase
          .from("tblPaiements")
          .select("MntPayeUS, MntPayeGd")
          .eq("EtudiantId", parseInt(data.playerId, 10));

        if (!paymentsError && allPayments) {
          // Calculate total paid across all payments
          const totalPayeUS = allPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.MntPayeUS) || 0), 0);
          const totalPayeGd = allPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.MntPayeGd) || 0), 0);

          // Find the most recent invoice for this player
          const { data: invoices, error: invoiceQueryError } = await supabase
            .from("tblFacture")
            .select("*")
            .eq("EtudiantId", parseInt(data.playerId, 10))
            .order("DateFacture", { ascending: false })
            .limit(1);

          if (!invoiceQueryError && invoices && invoices.length > 0) {
            const invoice = invoices[0];
            const montantAPayer = parseFloat(invoice.MntAPayer) || 0;
            
            // Determine if invoice is fully paid
            const isFullyPaid = totalPayeUS + totalPayeGd >= montantAPayer && montantAPayer > 0;
            
            // Update the invoice
            await supabase
              .from("tblFacture")
              .update({
                MntPayeUS: totalPayeUS,
                MntPayeGd: totalPayeGd,
                Statut: isFullyPaid ? "paid" : invoice.Statut,
                DatePaiement: isFullyPaid ? new Date().toISOString() : invoice.DatePaiement
              })
              .eq("Id", invoice.Id);
          }
        }
      } catch (invoiceError) {
        console.error("Error updating invoice after payment:", invoiceError);
        // Don't throw - payment was successful, invoice update is secondary
      }
    })();
  }

  return result.data;
};

// --- FACTURES (tblFacture) ---

export const updateInvoiceInSupabase = async (invoiceId: string, data: Partial<import("@/types/club").Invoice>) => {
  const updatePayload: any = {};
  if (data.noFacture !== undefined) updatePayload.NoFacture = data.noFacture;
  if (data.playerId !== undefined) updatePayload.EtudiantId = parseInt(data.playerId, 10);
  if (data.sessionId !== undefined) updatePayload.SessionId = parseInt(data.sessionId, 10);
  if (data.remarque !== undefined) updatePayload.Remarque = data.remarque;
  if (data.montantAPayer !== undefined) updatePayload.MntAPayer = data.montantAPayer;
  if (data.montantPaye !== undefined) {
    if (data.devise === "HTG") {
      updatePayload.MntPayeGd = data.montantPaye;
      updatePayload.MntPayeUS = 0;
    } else {
      updatePayload.MntPayeUS = data.montantPaye;
      updatePayload.MntPayeGd = 0;
    }
  }
  if (data.dateFacture !== undefined) updatePayload.DateFacture = data.dateFacture;
  if (data.datePaiement !== undefined) updatePayload.DatePaiement = data.datePaiement;

  const { error } = await supabase
    .from("tblFacture")
    .update(updatePayload)
    .eq("Id", parseInt(invoiceId, 10));

  if (error) throw error;
};

export const deleteInvoiceInSupabase = async (invoiceId: string) => {
  const { error } = await supabase
    .from("tblFacture")
    .delete()
    .eq("Id", parseInt(invoiceId, 10));
  if (error) throw error;
};

export const addInvoiceToSupabase = async (data: Omit<import("@/types/club").Invoice, "id">) => {
  const insertPayload: any = {
    NoFacture: data.noFacture,
    EtudiantId: parseInt(data.playerId, 10),
    SessionId: parseInt(data.sessionId, 10),
    Remarque: data.remarque || "",
    MntAPayer: data.montantAPayer,
    DateFacture: data.dateFacture || new Date().toISOString(),
    DatePaiement: data.datePaiement || null,
  };

  if (data.devise === "HTG") {
    insertPayload.MntPayeGd = data.montantPaye || 0;
    insertPayload.MntPayeUS = 0;
  } else {
    insertPayload.MntPayeUS = data.montantPaye || 0;
    insertPayload.MntPayeGd = 0;
  }

  const { insertInvoiceAdmin } = await import("@/app/actions/club");
  const result = await insertInvoiceAdmin(insertPayload);

  if (!result.success) {
    throw new Error(result.error || "Impossible d’enregistrer la facture.");
  }

  return result.data;
};

// --- ALUMNI (tblAlumni) ---

export const updateAlumniInSupabase = async (alumniId: string, data: Partial<import("@/types/club").Alumni>) => {
  const { error } = await supabase.from("tblAlumni").update(data).eq("id", alumniId);
  if (error) throw error;
};

export const deleteAlumniInSupabase = async (alumniId: string) => {
  const { error } = await supabase.from("tblAlumni").delete().eq("id", alumniId);
  if (error) throw error;
};

export const addAlumniToSupabase = async (data: Omit<import("@/types/club").Alumni, "id">) => {
  const { data: insertedData, error } = await supabase.from("tblAlumni").insert(data).select("id").single();
  if (error) throw error;
  return insertedData;
};

// --- EVENEMENTS (tblEvenements) ---

export const updateEventInSupabase = async (eventId: string, data: Partial<import("@/types/club").ClubEvent>) => {
  const { error } = await supabase.from("tblEvenements").update(data).eq("id", eventId);
  if (error) throw error;
};

export const deleteEventInSupabase = async (eventId: string) => {
  const { error } = await supabase.from("tblEvenements").delete().eq("id", eventId);
  if (error) throw error;
};

export const addEventToSupabase = async (data: Omit<import("@/types/club").ClubEvent, "id">) => {
  const { data: insertedData, error } = await supabase.from("tblEvenements").insert(data).select("id").single();
  if (error) throw error;
  return insertedData;
};

// --- PAYROLL (tblPayroll) ---

export const addPayrollToSupabase = async (data: Omit<import("@/types/club").PayrollRecord, "id">, file?: File) => {
  let pieceJointeUrl = data.pieceJointe || null;

  // 1. Upload file to Supabase Storage if a file is provided
  if (file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("payroll-attachments")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw new Error("Erreur lors du téléversement du fichier.");
    }

    const { data: publicUrlData } = supabase.storage
      .from("payroll-attachments")
      .getPublicUrl(filePath);

    pieceJointeUrl = publicUrlData.publicUrl;
  }

  // 2. Insert into tblPayroll
  const insertPayload: any = {
    EmployeId: parseInt(data.employeId, 10),
    EmployeNom: data.employeNom,
    EmployePrenom: data.employePrenom,
    Fonction: data.fonction,
    Mois: data.mois,
    SalaireBase: data.salaireBase,
    TypeSalaire: data.typeSalaire || "fixe",
    NombreSeances: data.nombreSeances || 0,
    TauxParSeance: data.tauxParSeance || 0,
    Bonus: data.bonus,
    Deductions: data.deductions,
    PrelevementPourcentage: data.prelevementPourcentage,
    PrelevementMontant: data.prelevementMontant,
    PrelevementAvance: data.prelevementAvance || 0,
    PrelevementType: data.prelevementType || "taxe",
    VacancesPayees: data.vacancesPayees || 0,
    CongeSansSolde: data.congeSansSolde || 0,
    CumulPaiements: data.cumulPaiements || 0,
    NetAPayer: data.netAPayer,
    Devise: data.devise || "HTG",
    Statut: data.statut,
    DatePaiement: data.datePaiement || new Date().toISOString(),
    ModePaiement: data.modePaiement,
    Notes: data.notes || "",
    PieceJointe: pieceJointeUrl,
  };

  let { data: insertedData, error } = await supabase
    .from("tblPayroll")
    .insert(insertPayload)
    .select("Id")
    .single();

  if (error && isMissingPrelevementColumnError(error)) {
    delete insertPayload.PrelevementPourcentage;
    delete insertPayload.PrelevementMontant;
    delete insertPayload.PrelevementAvance;
    delete insertPayload.PrelevementType;
    delete insertPayload.TypeSalaire;
    delete insertPayload.NombreSeances;
    delete insertPayload.TauxParSeance;
    delete insertPayload.VacancesPayees;
    delete insertPayload.CongeSansSolde;
    delete insertPayload.CumulPaiements;
    ({ data: insertedData, error } = await supabase
      .from("tblPayroll")
      .insert(insertPayload)
      .select("Id")
      .single());
  }

  if (error) throw error;
  return { ...insertedData, PieceJointe: pieceJointeUrl };
};

export const updatePayrollInSupabase = async (id: string, data: Partial<import("@/types/club").PayrollRecord>, file?: File) => {
  let pieceJointeUrl = data.pieceJointe;

  if (file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("payroll-attachments")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw new Error("Erreur lors du téléversement du fichier.");
    }

    const { data: publicUrlData } = supabase.storage
      .from("payroll-attachments")
      .getPublicUrl(filePath);

    pieceJointeUrl = publicUrlData.publicUrl;
  }

  const updatePayload: any = {};
  if (data.statut !== undefined) updatePayload.Statut = data.statut;
  if (data.datePaiement !== undefined) updatePayload.DatePaiement = data.datePaiement;
  if (data.modePaiement !== undefined) updatePayload.ModePaiement = data.modePaiement;
  if (data.salaireBase !== undefined) updatePayload.SalaireBase = data.salaireBase;
  if (data.typeSalaire !== undefined) updatePayload.TypeSalaire = data.typeSalaire;
  if (data.nombreSeances !== undefined) updatePayload.NombreSeances = data.nombreSeances;
  if (data.tauxParSeance !== undefined) updatePayload.TauxParSeance = data.tauxParSeance;
  if (data.bonus !== undefined) updatePayload.Bonus = data.bonus;
  if (data.deductions !== undefined) updatePayload.Deductions = data.deductions;
  if (data.prelevementPourcentage !== undefined) updatePayload.PrelevementPourcentage = data.prelevementPourcentage;
  if (data.prelevementMontant !== undefined) updatePayload.PrelevementMontant = data.prelevementMontant;
  if (data.prelevementAvance !== undefined) updatePayload.PrelevementAvance = data.prelevementAvance;
  if (data.prelevementType !== undefined) updatePayload.PrelevementType = data.prelevementType;
  if (data.vacancesPayees !== undefined) updatePayload.VacancesPayees = data.vacancesPayees;
  if (data.congeSansSolde !== undefined) updatePayload.CongeSansSolde = data.congeSansSolde;
  if (data.cumulPaiements !== undefined) updatePayload.CumulPaiements = data.cumulPaiements;
  if (data.netAPayer !== undefined) updatePayload.NetAPayer = data.netAPayer;
  if (data.notes !== undefined) updatePayload.Notes = data.notes;
  if (pieceJointeUrl !== undefined) updatePayload.PieceJointe = pieceJointeUrl;

  let { error } = await supabase
    .from("tblPayroll")
    .update(updatePayload)
    .eq("Id", parseInt(id, 10));

  if (error && isMissingPrelevementColumnError(error)) {
    delete updatePayload.PrelevementPourcentage;
    delete updatePayload.PrelevementMontant;
    delete updatePayload.PrelevementAvance;
    delete updatePayload.PrelevementType;
    delete updatePayload.TypeSalaire;
    delete updatePayload.NombreSeances;
    delete updatePayload.TauxParSeance;
    delete updatePayload.VacancesPayees;
    delete updatePayload.CongeSansSolde;
    delete updatePayload.CumulPaiements;
    ({ error } = await supabase
      .from("tblPayroll")
      .update(updatePayload)
      .eq("Id", parseInt(id, 10)));
  }

  if (error) {
    console.error("Erreur mise à jour paie :", error);
    throw error;
  }
  
  return { PieceJointe: pieceJointeUrl };
};

export const deletePayrollInSupabase = async (id: string) => {
  const { error } = await supabase
    .from("tblPayroll")
    .delete()
    .eq("Id", parseInt(id, 10));

  if (error) {
    console.error("Erreur suppression paie :", error);
    throw error;
  }
};

// --- RUBRIQUES (tblRubriques) ---

export const DEFAULT_PRICING_ITEMS: import("@/types/club").PricingItem[] = [
  {
    id: "inscription",
    rubrique: "Frais d'inscription / réinscription",
    montant: 75,
    devise: "US",
    precision: "Applicables à tous les joueurs, nouveaux et anciens",
    estAdhesion: false,
    actif: true,
  },
  {
    id: "adhesion-fc",
    rubrique: "Adhésion annuelle - FC TORO",
    montant: 1350,
    devise: "US",
    precision: "Catégories École de Football / Académie / Élite, hors uniformes",
    categorie: "FC TORO",
    estAdhesion: true,
    actif: true,
  },
  {
    id: "adhesion-ti",
    rubrique: "Adhésion annuelle - TI TORO",
    montant: 1000,
    devise: "US",
    precision: "Catégorie Ti Toro / U6-U8, hors uniformes",
    categorie: "TI TORO",
    estAdhesion: true,
    actif: true,
  },
  {
    id: "uniforme-jeux1",
    rubrique: "Uniforme – Jeux 1",
    montant: 80,
    devise: "US",
    precision: "Jeux Entrainement - Obligatoire",
    estAdhesion: false,
    actif: true,
  },
  {
    id: "uniforme-jeux2",
    rubrique: "Uniforme – Jeux 2",
    montant: 100,
    devise: "US",
    precision: "Jeux Match 1 - Obligatoire",
    estAdhesion: false,
    actif: true,
  },
  {
    id: "uniforme-jeux3",
    rubrique: "Uniforme – Jeux 3",
    montant: 100,
    devise: "US",
    precision: "Jeux Match 2 - Obligatoire",
    estAdhesion: false,
    actif: true,
  },
  {
    id: "tracksuit",
    rubrique: "Tracksuit",
    montant: 150,
    devise: "US",
    precision: "Jacket & Jogger – Facultatif",
    estAdhesion: false,
    actif: true,
  },
  {
    id: "backpack",
    rubrique: "Backpack",
    montant: 90,
    devise: "US",
    precision: "Sac à dos – Facultatif",
    estAdhesion: false,
    actif: true,
  },
];

export const fetchRubriquesFromSupabase = async (): Promise<import("@/types/club").PricingItem[]> => {
  try {
    const { data, error } = await supabase
      .from("tblRubriques")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Table tblRubriques introuvable ou erreur Supabase, utilisation des rubriques par défaut:", error.message);
      return DEFAULT_PRICING_ITEMS;
    }

    if (!data || data.length === 0) {
      return DEFAULT_PRICING_ITEMS;
    }

    return data.map((item: any) => ({
      id: String(item.id),
      rubrique: String(item.rubrique || ""),
      montant: Number(item.montant || 0),
      devise: (item.devise === "HTG" ? "HTG" : "US") as "US" | "HTG",
      precision: String(item.precision || ""),
      categorie: item.categorie ? String(item.categorie) : undefined,
      estAdhesion: Boolean(item.est_adhesion),
      actif: item.actif !== undefined ? Boolean(item.actif) : true,
    }));
  } catch (err) {
    console.warn("Exception lors du chargement de tblRubriques, utilisation des valeurs par défaut:", err);
    return DEFAULT_PRICING_ITEMS;
  }
};

export const addRubriqueToSupabase = async (data: Omit<import("@/types/club").PricingItem, "id"> & { id?: string }) => {
  const rubriqueId = data.id || `rubrique-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const payload = {
    id: rubriqueId,
    rubrique: data.rubrique,
    montant: data.montant,
    devise: data.devise,
    precision: data.precision || "",
    categorie: data.categorie || "",
    est_adhesion: Boolean(data.estAdhesion),
    actif: data.actif !== undefined ? Boolean(data.actif) : true,
  };

  const { error } = await supabase.from("tblRubriques").insert(payload);
  if (error) {
    console.warn("Erreur Supabase lors de l'ajout de rubrique :", error.message);
  }

  return {
    id: rubriqueId,
    ...data,
    precision: data.precision || "",
    actif: data.actif !== undefined ? data.actif : true,
  };
};

export const updateRubriqueInSupabase = async (id: string, data: Partial<import("@/types/club").PricingItem>) => {
  const payload: any = {};
  if (data.rubrique !== undefined) payload.rubrique = data.rubrique;
  if (data.montant !== undefined) payload.montant = data.montant;
  if (data.devise !== undefined) payload.devise = data.devise;
  if (data.precision !== undefined) payload.precision = data.precision;
  if (data.categorie !== undefined) payload.categorie = data.categorie;
  if (data.estAdhesion !== undefined) payload.est_adhesion = data.estAdhesion;
  if (data.actif !== undefined) payload.actif = data.actif;

  const { error } = await supabase.from("tblRubriques").update(payload).eq("id", id);
  if (error) {
    console.warn("Erreur Supabase lors de la modification de rubrique :", error.message);
  }
};

export const deleteRubriqueInSupabase = async (id: string) => {
  const { error } = await supabase.from("tblRubriques").delete().eq("id", id);
  if (error) {
    console.warn("Erreur Supabase lors de la suppression de rubrique :", error.message);
  }
};

