import { supabase } from "@/lib/supabaseClient";
import { Player, Employee } from "@/types/club";

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
  if (data.cotisationDevise !== undefined) updatePayload.CotisationDevise = data.cotisationDevise;
  if (data.telephone !== undefined) updatePayload.Telephone = data.telephone;
  if (data.email !== undefined) updatePayload.Email = data.email;
  if (data.dateNaissance !== undefined) updatePayload.DateNaissance = data.dateNaissance;
  if (data.photoUrl !== undefined && data.photoUrl !== "/images/user/silhouette.svg") updatePayload.PhotoIdentiteUrl = data.photoUrl;

  if (data.statut !== undefined) {
    updatePayload.EstAlumni = data.statut === "alumni";
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

  if (data.photoIdentiteUrl) {
    const url = await handleDocUpload(data.photoIdentiteUrl, "photo_identite");
    if (url) updatePayload.PhotoIdentiteUrl = url;
  }
  if (data.acteNaissanceUrl) {
    const url = await handleDocUpload(data.acteNaissanceUrl, "acte_naissance");
    if (url) updatePayload.ActeNaissanceUrl = url;
  }
  if (data.carteIdentiteParentUrl) {
    const url = await handleDocUpload(data.carteIdentiteParentUrl, "carte_identite_parent");
    if (url) updatePayload.CarteIdentiteParentUrl = url;
  }

  const { error } = await supabase
    .from("tblEtudiants")
    .update(updatePayload)
    .eq("EtudiantID", resolveEtudiantId(playerId));

  if (error) {
    console.error("Erreur lors de la mise à jour du joueur :", error);
    throw error;
  }
};

export const softDeletePlayerInSupabase = async (playerId: string) => {
  const etudiantId = resolveEtudiantId(playerId);
  
  // Fetch email to revert site_messages status if needed
  const { data: player } = await supabase
    .from("tblEtudiants")
    .select("Email")
    .eq("EtudiantID", etudiantId)
    .single();

  // Soft delete: set IsDeleted = 1
  const { error } = await supabase
    .from("tblEtudiants")
    .update({ IsDeleted: 1 })
    .eq("EtudiantID", etudiantId);

  if (error) {
    console.error("Erreur lors de la suppression du joueur :", error);
    throw error;
  }
  
  // Revert site_messages from "enrolled" to "resolved" (LU)
  if (player?.Email) {
    await supabase
      .from("site_messages")
      .update({ status: "resolved" })
      .eq("email", player.Email)
      .eq("status", "enrolled");
  }
};

export const addPlayerToSupabase = async (data: Omit<Player & { photoIdentiteUrl?: string; acteNaissanceUrl?: string; carteIdentiteParentUrl?: string }, "id" | "matricule">) => {
  const insertPayload: any = {
    Nom: data.nom,
    Prenom: data.prenom,
    Sexe: data.sexe === "Féminin" ? "F" : "M",
    Categorie: data.categorie,
    Telephone: data.telephone,
    Email: data.email,
    DateNaissance: data.dateNaissance || null,
    DtCreation: new Date().toISOString(),
    IsDeleted: data.statut === "abandonne" ? 1 : 0,
    EstAlumni: data.statut === "alumni",
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

  if (data.photoIdentiteUrl) insertPayload.PhotoIdentiteUrl = await handleDocUpload(data.photoIdentiteUrl, "photo");
  if (data.acteNaissanceUrl) insertPayload.ActeNaissanceUrl = await handleDocUpload(data.acteNaissanceUrl, "acte");
  if (data.carteIdentiteParentUrl) insertPayload.CarteIdentiteParentUrl = await handleDocUpload(data.carteIdentiteParentUrl, "carte");

  const { insertPlayerAdmin } = await import("@/app/actions/club");
  const result = await insertPlayerAdmin(insertPayload);
  
  if (!result.success) {
    console.error("Erreur lors de l'ajout du joueur :", result.error);
    throw new Error(result.error);
  }

  return { EtudiantID: result.data.EtudiantID };
};

// --- EMPLOYEES (tblEmployes) ---

export const updateEmployeeInSupabase = async (employeeId: string, data: Partial<Employee>) => {
  const updatePayload: any = {};
  
  if (data.nom !== undefined) updatePayload.Nom = data.nom;
  if (data.prenom !== undefined) updatePayload.Prenom = data.prenom;
  if (data.sexe !== undefined) updatePayload.Sexe = data.sexe === "Féminin" ? "F" : "M";
  if (data.telephone !== undefined) updatePayload.Telephone = data.telephone;
  if (data.email !== undefined) updatePayload.Email = data.email;
  if (data.adresse !== undefined) updatePayload.Adresse = data.adresse;
  if (data.fonction !== undefined) updatePayload.Fonction = data.fonction;
  if (data.salaire !== undefined) updatePayload.Salaire = data.salaire;
  if (data.dateEmbauche !== undefined) updatePayload.DateEmbauche = data.dateEmbauche;
  if (data.niveauEtude !== undefined) updatePayload.NiveauEtude = data.niveauEtude;
  if (data.profession !== undefined) updatePayload.Profession = data.profession;

  const { error } = await supabase
    .from("tblEmployes")
    .update(updatePayload)
    .eq("EmployeId", parseInt(employeeId, 10));

  if (error) {
    console.error("Erreur lors de la mise à jour de l'employé :", error);
    throw error;
  }
};

export const softDeleteEmployeeInSupabase = async (employeeId: string) => {
  // Soft delete: set Desactive = true
  const { error } = await supabase
    .from("tblEmployes")
    .update({ Desactive: true })
    .eq("EmployeId", parseInt(employeeId, 10));

  if (error) {
    console.error("Erreur lors de la suppression de l'employé :", error);
    throw error;
  }
};

export const addEmployeeToSupabase = async (data: Omit<Employee, "id" | "employeId">) => {
  const insertPayload = {
    Nom: data.nom,
    Prenom: data.prenom,
    Sexe: data.sexe === "Féminin" ? "F" : "M",
    Telephone: data.telephone,
    Email: data.email,
    Adresse: data.adresse,
    Fonction: data.fonction,
    Salaire: data.salaire,
    DateEmbauche: data.dateEmbauche || null,
    NiveauEtude: data.niveauEtude,
    Profession: data.profession,
    Desactive: false,
  };

  const { data: insertedData, error } = await supabase
    .from("tblEmployes")
    .insert(insertPayload)
    .select("EmployeId")
    .single();

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
};

export const deleteParentInSupabase = async (playerId: string | string[]) => {
  const updatePayload = {
    NomParent: null,
    PrenomParent: null,
    TelephoneParent: null,
    EmailParent: null,
    LienParente: null,
  };

  const playerIds = Array.isArray(playerId) ? playerId : [playerId];

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
  if (data.methode !== undefined) updatePayload.ModePaiement = data.methode;
  if (data.remarque !== undefined) updatePayload.Remarque = data.remarque;
  if (data.taux !== undefined) updatePayload.Taux = data.taux;

  let { error } = await supabase
    .from("tblPaiements")
    .update(updatePayload)
    .eq("Id", resolveEtudiantId(paymentId));

  if (error && updatePayload.Taux !== undefined && isMissingTauxColumnError(error)) {
    delete updatePayload.Taux;
    ({ error } = await supabase
      .from("tblPaiements")
      .update(updatePayload)
      .eq("Id", resolveEtudiantId(paymentId)));
  }

  if (error) throw error;
};

export const deletePaymentInSupabase = async (paymentId: string) => {
  const { error } = await supabase
    .from("tblPaiements")
    .delete()
    .eq("Id", resolveEtudiantId(paymentId));
  if (error) throw error;
};

export const addPaymentToSupabase = async (data: Omit<import("@/types/club").Payment, "id">) => {
  const insertPayload: any = {
    EtudiantId: parseInt(data.playerId, 10),
    DateTransact: data.datePaiement || new Date().toISOString(),
    ModePaiement: data.methode,
    Remarque: data.remarque || "",
  };
  if (data.taux !== undefined) insertPayload.Taux = data.taux;
  
  if (data.devise === "HTG") {
    insertPayload.MntPayeGd = data.montant;
    insertPayload.MntPayeUS = 0;
  } else {
    insertPayload.MntPayeUS = data.montant;
    insertPayload.MntPayeGd = 0;
  }

  let { data: insertedData, error } = await supabase
    .from("tblPaiements")
    .insert(insertPayload)
    .select("Id")
    .single();

  if (error && insertPayload.Taux !== undefined && isMissingTauxColumnError(error)) {
    delete insertPayload.Taux;
    ({ data: insertedData, error } = await supabase
      .from("tblPaiements")
      .insert(insertPayload)
      .select("Id")
      .single());
  }

  if (error) throw error;
  return insertedData;
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

  const { data: insertedData, error } = await supabase
    .from("tblFacture")
    .insert(insertPayload)
    .select("Id")
    .single();

  if (error) throw error;
  return insertedData;
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
    Bonus: data.bonus,
    Deductions: data.deductions,
    PrelevementPourcentage: data.prelevementPourcentage,
    PrelevementMontant: data.prelevementMontant,
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
  if (data.bonus !== undefined) updatePayload.Bonus = data.bonus;
  if (data.deductions !== undefined) updatePayload.Deductions = data.deductions;
  if (data.prelevementPourcentage !== undefined) updatePayload.PrelevementPourcentage = data.prelevementPourcentage;
  if (data.prelevementMontant !== undefined) updatePayload.PrelevementMontant = data.prelevementMontant;
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
