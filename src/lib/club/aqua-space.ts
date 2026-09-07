import { supabase } from "@/lib/supabaseClient";
import { AquaSpaceMember, AquaSpacePayment } from "@/types/club";

const STORAGE_KEY_MEMBERS = "fctoro_aqua_space_members";
const STORAGE_KEY_PAYMENTS = "fctoro_aqua_space_payments";

function getLocalMembers(): AquaSpaceMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMembers(members: AquaSpaceMember[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
  } catch {}
}

function getLocalPayments(): AquaSpacePayment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPayments(payments: AquaSpacePayment[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
  } catch {}
}

export function generateNextAquaMatricule(existingMembers: AquaSpaceMember[]): string {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix = `${currentYear}-AQ`;
  
  let maxNum = 0;
  for (const m of existingMembers) {
    if (m.matricule && m.matricule.startsWith(prefix)) {
      const numPart = parseInt(m.matricule.replace(prefix, ""), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  const nextNum = (maxNum + 1).toString().padStart(3, "0");
  return `${prefix}${nextNum}`;
}

export async function fetchAquaSpaceMembers(): Promise<AquaSpaceMember[]> {
  try {
    const { fetchAquaSpaceMembersAdmin } = await import("@/app/actions/club");
    const adminRes = await fetchAquaSpaceMembersAdmin();
    if (adminRes.success && adminRes.data) {
      const mapped: AquaSpaceMember[] = adminRes.data.map((row: any) => ({
        id: String(row.id),
        matricule: row.matricule,
        etudiantId: row.etudiant_id,
        nom: row.nom,
        prenom: row.prenom,
        dateNaissance: row.date_naissance || "",
        sexe: row.sexe || "Masculin",
        adresse: row.adresse || "",
        photoUrl: row.photo_url || "/images/user/silhouette.svg",
        niveau: row.niveau || "Apprentissage",
        statut: row.statut || "actif",
        dateInscription: row.date_inscription || (row.created_at ? row.created_at.split("T")[0] : ""),
        parentNom: row.parent_nom || "",
        parentPrenom: row.parent_prenom || "",
        parentEmail: row.parent_email || "",
        parentTelephone: row.parent_telephone || "",
        parentAdresse: row.parent_adresse || "",
        urgenceLien: row.urgence_lien || "",
        urgenceNom: row.urgence_nom || "",
        urgencePrenom: row.urgence_prenom || "",
        urgenceTelephone: row.urgence_telephone || "",
        urgenceEmail: row.urgence_email || "",
        maladies: Array.isArray(row.maladies) ? row.maladies : [],
        autreMaladie: row.autre_maladie || "",
        allergies: row.allergies || "",
        priseMedicaments: Boolean(row.prise_medicaments),
        medicamentsDetails: row.medicaments_details || "",
        autoAdministrationMedicaments: Boolean(row.auto_administration_medicaments),
        blessuresAnterieures: row.blessures_anterieures || "",
        modePaiementSouhaite: row.mode_paiement_souhaite || "Cash/chèque",
        autorisationPhotos: Boolean(row.autorisation_photos),
        absenceContreIndication: Boolean(row.absence_contre_indication),
        autorisationUrgence: Boolean(row.autorisation_urgence),
        notes: row.notes || "",
      }));
      saveLocalMembers(mapped);
      return mapped;
    }
  } catch (e) {
    console.warn("fetchAquaSpaceMembersAdmin fallback to client/local:", e);
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("aqua_space_members")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped: AquaSpaceMember[] = data.map((row: any) => ({
        id: String(row.id),
        matricule: row.matricule,
        etudiantId: row.etudiant_id,
        nom: row.nom,
        prenom: row.prenom,
        dateNaissance: row.date_naissance || "",
        sexe: row.sexe || "Masculin",
        adresse: row.adresse || "",
        photoUrl: row.photo_url || "/images/user/silhouette.svg",
        niveau: row.niveau || "Apprentissage",
        statut: row.statut || "actif",
        dateInscription: row.date_inscription || (row.created_at ? row.created_at.split("T")[0] : ""),
        parentNom: row.parent_nom || "",
        parentPrenom: row.parent_prenom || "",
        parentEmail: row.parent_email || "",
        parentTelephone: row.parent_telephone || "",
        parentAdresse: row.parent_adresse || "",
        urgenceLien: row.urgence_lien || "",
        urgenceNom: row.urgence_nom || "",
        urgencePrenom: row.urgence_prenom || "",
        urgenceTelephone: row.urgence_telephone || "",
        urgenceEmail: row.urgence_email || "",
        maladies: Array.isArray(row.maladies) ? row.maladies : [],
        autreMaladie: row.autre_maladie || "",
        allergies: row.allergies || "",
        priseMedicaments: Boolean(row.prise_medicaments),
        medicamentsDetails: row.medicaments_details || "",
        autoAdministrationMedicaments: Boolean(row.auto_administration_medicaments),
        blessuresAnterieures: row.blessures_anterieures || "",
        modePaiementSouhaite: row.mode_paiement_souhaite || "Cash/chèque",
        autorisationPhotos: Boolean(row.autorisation_photos),
        absenceContreIndication: Boolean(row.absence_contre_indication),
        autorisationUrgence: Boolean(row.autorisation_urgence),
        notes: row.notes || "",
      }));
      saveLocalMembers(mapped);
      return mapped;
    }
  }

  return getLocalMembers();
}

export async function createAquaSpaceMember(
  memberData: Omit<AquaSpaceMember, "id">
): Promise<{ success: boolean; data?: AquaSpaceMember; error?: string }> {
  const payload = {
    matricule: memberData.matricule,
    etudiant_id: memberData.etudiantId ? Number(memberData.etudiantId) : null,
    nom: memberData.nom,
    prenom: memberData.prenom,
    date_naissance: memberData.dateNaissance || null,
    sexe: memberData.sexe,
    adresse: memberData.adresse,
    photo_url: memberData.photoUrl,
    niveau: memberData.niveau,
    statut: memberData.statut || "actif",
    date_inscription: memberData.dateInscription || new Date().toISOString().split("T")[0],
    parent_nom: memberData.parentNom,
    parent_prenom: memberData.parentPrenom,
    parent_email: memberData.parentEmail,
    parent_telephone: memberData.parentTelephone,
    parent_adresse: memberData.parentAdresse,
    urgence_lien: memberData.urgenceLien,
    urgence_nom: memberData.urgenceNom,
    urgence_prenom: memberData.urgencePrenom,
    urgence_telephone: memberData.urgenceTelephone,
    urgence_email: memberData.urgenceEmail,
    maladies: memberData.maladies || [],
    autre_maladie: memberData.autreMaladie || null,
    allergies: memberData.allergies || null,
    prise_medicaments: memberData.priseMedicaments,
    medicaments_details: memberData.medicamentsDetails || null,
    auto_administration_medicaments: memberData.autoAdministrationMedicaments,
    blessures_anterieures: memberData.blessuresAnterieures || null,
    mode_paiement_souhaite: memberData.modePaiementSouhaite || "Cash/chèque",
    autorisation_photos: memberData.autorisationPhotos,
    absence_contre_indication: memberData.absenceContreIndication,
    autorisation_urgence: memberData.autorisationUrgence,
    notes: memberData.notes || null,
  };

  try {
    const { createAquaSpaceMemberAdmin } = await import("@/app/actions/club");
    const adminRes = await createAquaSpaceMemberAdmin(payload);
    if (adminRes.success && adminRes.data) {
      const created: AquaSpaceMember = {
        ...memberData,
        id: String(adminRes.data.id),
      };
      const locals = getLocalMembers();
      saveLocalMembers([created, ...locals]);
      return { success: true, data: created };
    }
  } catch (e) {
    console.warn("createAquaSpaceMemberAdmin fallback:", e);
  }

  // Fallback client/local
  const newId = Date.now().toString();
  const created: AquaSpaceMember = {
    ...memberData,
    id: newId,
  };
  const locals = getLocalMembers();
  saveLocalMembers([created, ...locals]);
  return { success: true, data: created };
}

export async function updateAquaSpaceMember(
  id: string,
  updates: Partial<AquaSpaceMember>
): Promise<{ success: boolean; data?: AquaSpaceMember; error?: string }> {
  const payload: any = {};
  if (updates.matricule !== undefined) payload.matricule = updates.matricule;
  if (updates.etudiantId !== undefined) payload.etudiant_id = updates.etudiantId ? Number(updates.etudiantId) : null;
  if (updates.nom !== undefined) payload.nom = updates.nom;
  if (updates.prenom !== undefined) payload.prenom = updates.prenom;
  if (updates.dateNaissance !== undefined) payload.date_naissance = updates.dateNaissance || null;
  if (updates.sexe !== undefined) payload.sexe = updates.sexe;
  if (updates.adresse !== undefined) payload.adresse = updates.adresse;
  if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
  if (updates.niveau !== undefined) payload.niveau = updates.niveau;
  if (updates.statut !== undefined) payload.statut = updates.statut;
  if (updates.parentNom !== undefined) payload.parent_nom = updates.parentNom;
  if (updates.parentPrenom !== undefined) payload.parent_prenom = updates.parentPrenom;
  if (updates.parentEmail !== undefined) payload.parent_email = updates.parentEmail;
  if (updates.parentTelephone !== undefined) payload.parent_telephone = updates.parentTelephone;
  if (updates.parentAdresse !== undefined) payload.parent_adresse = updates.parentAdresse;
  if (updates.urgenceLien !== undefined) payload.urgence_lien = updates.urgenceLien;
  if (updates.urgenceNom !== undefined) payload.urgence_nom = updates.urgenceNom;
  if (updates.urgencePrenom !== undefined) payload.urgence_prenom = updates.urgencePrenom;
  if (updates.urgenceTelephone !== undefined) payload.urgence_telephone = updates.urgenceTelephone;
  if (updates.urgenceEmail !== undefined) payload.urgence_email = updates.urgenceEmail;
  if (updates.maladies !== undefined) payload.maladies = updates.maladies;
  if (updates.autreMaladie !== undefined) payload.autre_maladie = updates.autreMaladie;
  if (updates.allergies !== undefined) payload.allergies = updates.allergies;
  if (updates.priseMedicaments !== undefined) payload.prise_medicaments = updates.priseMedicaments;
  if (updates.medicamentsDetails !== undefined) payload.medicaments_details = updates.medicamentsDetails;
  if (updates.autoAdministrationMedicaments !== undefined) payload.auto_administration_medicaments = updates.autoAdministrationMedicaments;
  if (updates.blessuresAnterieures !== undefined) payload.blessures_anterieures = updates.blessuresAnterieures;
  if (updates.modePaiementSouhaite !== undefined) payload.mode_paiement_souhaite = updates.modePaiementSouhaite;
  if (updates.autorisationPhotos !== undefined) payload.autorisation_photos = updates.autorisationPhotos;
  if (updates.absenceContreIndication !== undefined) payload.absence_contre_indication = updates.absenceContreIndication;
  if (updates.autorisationUrgence !== undefined) payload.autorisation_urgence = updates.autorisationUrgence;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  try {
    const { updateAquaSpaceMemberAdmin } = await import("@/app/actions/club");
    const adminRes = await updateAquaSpaceMemberAdmin(id, payload);
    if (adminRes.success && adminRes.data) {
      const locals = getLocalMembers();
      const updatedList = locals.map(m => m.id === id ? { ...m, ...updates } : m);
      saveLocalMembers(updatedList);
      return { success: true, data: { ...updates, id } as AquaSpaceMember };
    }
  } catch (e) {
    console.warn("updateAquaSpaceMemberAdmin fallback:", e);
  }

  // Local fallback
  const locals = getLocalMembers();
  const updatedList = locals.map(m => m.id === id ? { ...m, ...updates } : m);
  saveLocalMembers(updatedList);
  return { success: true, data: { ...updates, id } as AquaSpaceMember };
}

export async function deleteAquaSpaceMember(id: string): Promise<boolean> {
  try {
    const { deleteAquaSpaceMemberAdmin } = await import("@/app/actions/club");
    const adminRes = await deleteAquaSpaceMemberAdmin(id);
    if (adminRes.success) {
      const locals = getLocalMembers();
      saveLocalMembers(locals.filter(m => m.id !== id));
      return true;
    }
  } catch (e) {
    console.warn("deleteAquaSpaceMemberAdmin fallback:", e);
  }

  const locals = getLocalMembers();
  saveLocalMembers(locals.filter(m => m.id !== id));
  return true;
}

// --- PAYMENTS ---

export async function fetchAquaSpacePayments(): Promise<AquaSpacePayment[]> {
  try {
    const { fetchAquaSpacePaymentsAdmin } = await import("@/app/actions/club");
    const adminRes = await fetchAquaSpacePaymentsAdmin();
    if (adminRes.success && adminRes.data) {
      const mapped: AquaSpacePayment[] = adminRes.data.map((row: any) => ({
        id: String(row.id),
        memberId: String(row.member_id),
        etudiantId: row.etudiant_id,
        nomMembre: row.nom_membre,
        matricule: row.matricule,
        montant: Number(row.montant || 0),
        devise: row.devise || "HTG",
        periode: row.periode,
        typePaiement: row.type_paiement || "Cotisation",
        methode: row.methode || "especes",
        statut: row.statut || "paid",
        datePaiement: row.date_paiement || (row.created_at ? row.created_at.split("T")[0] : ""),
        remarque: row.remarque || "",
        recuNumero: row.recu_numero || "",
      }));
      saveLocalPayments(mapped);
      return mapped;
    }
  } catch (e) {
    console.warn("fetchAquaSpacePayments fallback:", e);
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("aqua_space_payments")
      .select("*")
      .order("date_paiement", { ascending: false });

    if (!error && data) {
      const mapped: AquaSpacePayment[] = data.map((row: any) => ({
        id: String(row.id),
        memberId: String(row.member_id),
        etudiantId: row.etudiant_id,
        nomMembre: row.nom_membre,
        matricule: row.matricule,
        montant: Number(row.montant || 0),
        devise: row.devise || "HTG",
        periode: row.periode,
        typePaiement: row.type_paiement || "Cotisation",
        methode: row.methode || "especes",
        statut: row.statut || "paid",
        datePaiement: row.date_paiement || (row.created_at ? row.created_at.split("T")[0] : ""),
        remarque: row.remarque || "",
        recuNumero: row.recu_numero || "",
      }));
      saveLocalPayments(mapped);
      return mapped;
    }
  }

  return getLocalPayments();
}

export async function createAquaSpacePayment(
  paymentData: Omit<AquaSpacePayment, "id">
): Promise<{ success: boolean; data?: AquaSpacePayment; error?: string }> {
  const payload = {
    member_id: parseInt(paymentData.memberId, 10) || 0,
    etudiant_id: paymentData.etudiantId ? Number(paymentData.etudiantId) : null,
    nom_membre: paymentData.nomMembre,
    matricule: paymentData.matricule,
    montant: paymentData.montant,
    devise: paymentData.devise,
    periode: paymentData.periode,
    type_paiement: paymentData.typePaiement,
    methode: paymentData.methode,
    statut: paymentData.statut,
    date_paiement: paymentData.datePaiement || new Date().toISOString().split("T")[0],
    remarque: paymentData.remarque,
    recu_numero: paymentData.recuNumero || `REC-AQ-${Date.now()}`,
  };

  try {
    const { createAquaSpacePaymentAdmin } = await import("@/app/actions/club");
    const adminRes = await createAquaSpacePaymentAdmin(payload);
    if (adminRes.success && adminRes.data) {
      const created: AquaSpacePayment = {
        ...paymentData,
        id: String(adminRes.data.id),
        recuNumero: adminRes.data.recu_numero,
      };
      const locals = getLocalPayments();
      saveLocalPayments([created, ...locals]);
      return { success: true, data: created };
    }
  } catch (e) {
    console.warn("createAquaSpacePaymentAdmin fallback:", e);
  }

  const newId = Date.now().toString();
  const created: AquaSpacePayment = {
    ...paymentData,
    id: newId,
    recuNumero: payload.recu_numero,
  };
  const locals = getLocalPayments();
  saveLocalPayments([created, ...locals]);
  return { success: true, data: created };
}

export async function deleteAquaSpacePayment(id: string): Promise<boolean> {
  try {
    const { deleteAquaSpacePaymentAdmin } = await import("@/app/actions/club");
    const adminRes = await deleteAquaSpacePaymentAdmin(id);
    if (adminRes.success) {
      const locals = getLocalPayments();
      saveLocalPayments(locals.filter(p => p.id !== id));
      return true;
    }
  } catch (e) {
    console.warn("deleteAquaSpacePaymentAdmin fallback:", e);
  }

  const locals = getLocalPayments();
  saveLocalPayments(locals.filter(p => p.id !== id));
  return true;
}
