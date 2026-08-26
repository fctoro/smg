"use client";

import Link from "next/link";
import { useMemo, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlayerForm from "@/components/club/forms/PlayerForm";
import { useClubData } from "@/context/ClubDataContext";
import { PlayerFormValues } from "@/types/club";
import { createPlayerFromForm } from "@/lib/club/player-form";
import { DEFAULT_CATEGORIES } from "@/config/dashboard.config";
import { addPlayerToSupabase } from "@/lib/club/supabase-crud";
import { syncPlayerProgrammes } from "@/lib/club/programmes";
import { supabase } from "@/lib/supabaseClient";
import { generatePlayerMatricule, getCurrentSeason } from "@/lib/club/season";
import { updateMessageStatus } from "@/lib/club/supabase-demandes";
import { ToastNotification } from "@/components/ui/toast/ToastNotification";

function translatePaymentMethod(val: any) {
  if (!val) return 'Transfert bancaire';
  const s = String(val).toLowerCase().trim();
  if (s.includes('transfert')) return 'Transfert bancaire';
  if (s.includes('cash') || s.includes('cheque') || s.includes('chèque')) return 'Cash/chèque';
  if (s.includes('carte')) return 'Carte bancaire';
  return 'Transfert bancaire';
}

function normalizePaymentPlan(val: any) {
  if (!val) return 'PLAN #1 (Annuel)';
  const s = String(val).toLowerCase().trim();
  if (s.includes('3') || s.includes('mensuel')) return 'PLAN #3 (Mensuel)';
  if (s.includes('2') || s.includes('semestriel') || s.includes('trimestriel')) return 'PLAN #2 (Semestriel)';
  if (s.includes('1') || s.includes('annuel')) return 'PLAN #1 (Annuel)';
  return 'PLAN #1 (Annuel)';
}

function normalizeUniformSize(val: any) {
  if (!val) return "Choisir";
  const s = String(val).toUpperCase().trim();
  const validSizes = ["YXS", "YS", "YM", "YL", "YXL", "AXL", "AS", "AM", "AL"];
  for (const size of validSizes) {
    if (s === size || s.startsWith(size) || s.includes(`(${size})`)) {
      return size;
    }
  }
  return "Choisir";
}

function NewPlayerFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { players, setPlayers } = useClubData();
  const [initialValues, setInitialValues] = useState<Partial<PlayerFormValues>>({});
  const [loadingDemande, setLoadingDemande] = useState(Boolean(searchParams.get("demandeId")));
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...players.map((player) => player.categorie)])],
    [players],
  );

  useEffect(() => {
    const demandeId = searchParams.get("demandeId");
    if (demandeId) {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(`draft_new_player_v2_${demandeId}`);
          sessionStorage.removeItem(`draft_new_player_${demandeId}`);
          sessionStorage.removeItem(`draft_new_player_manual`);
        } catch (e) {}
      }
      const loadDemande = async () => {
        setLoadingDemande(true);
        try {
          let prefill: Partial<PlayerFormValues> = {};

          if (demandeId.startsWith("det_")) {
            const rawId = demandeId.replace("det_", "");
            const { data: det } = await supabase
              .from("detection_registrations")
              .select("*")
              .eq("id", rawId)
              .single();

            if (det) {
              const parsedPrenom = (det.prenom || "").trim();
              let parsedNom = (det.nom || "").trim();
              if (parsedPrenom && parsedNom.toLowerCase().startsWith(parsedPrenom.toLowerCase())) {
                parsedNom = parsedNom.substring(parsedPrenom.length).trim();
              }

              // Parse pied_dominant which may be a JSON string containing positions
              let piedDominantVal = det.pied_dominant || "";
              let postePrincipalVal = "";
              let posteSecondaireVal = "";
              if (piedDominantVal.startsWith("{")) {
                try {
                  const parsed = JSON.parse(piedDominantVal);
                  piedDominantVal = parsed.pied || "";
                  postePrincipalVal = parsed.poste_principal || "";
                  posteSecondaireVal = parsed.poste_secondaire || "";
                } catch (e) { /* keep raw value */ }
              }

              prefill = {
                nom: parsedNom,
                prenom: parsedPrenom,
                dateNaissance: det.date_naissance || "",
                sexe: det.sexe === "Female" || det.sexe === "Fille" ? "Féminin" : "Masculin",
                telephone: (det.telephone && det.telephone !== 'N/A') ? det.telephone : (det.parent_telephone || ""),
                email: det.email || det.parent_email || "",
                adresse: det.zone_residence || det.adresse || "",
                categorie: "fc toro",
                ecole: det.ecole || det.child_school || det.school || det.etablissement || "",
                experienceSoccer: det.experience || det.experience_competitive || "",
                parentNomPrenom: det.parent_nom || "",
                parentEmail: det.parent_email || "",
                parentTelephone: det.parent_telephone || "",
                parentLien: det.parent_lien || det.parent_relation || det.guardian_relation || det.lien_parente || det.lien || "",
                urgenceNomPrenom: det.urgence_nom || det.emergency_name || "",
                urgenceTelephone: det.urgence_telephone || det.emergency_phone || "",
                urgenceLien: det.urgence_lien || det.emergency_relation || det.parent_lien || "",
                photoIdentiteUrl: det.photo_recente_url || "",
                acteNaissanceUrl: det.acte_naissance_url || "",
                carteIdentiteParentUrl: det.piece_identite_parent_url || "",
                fiche9eUrl: det.fiche_9e_url || "",
                carnetVaccinationUrl: det.carnet_vaccination_url || "",
                piedDominant: piedDominantVal,
                postePrincipal: postePrincipalVal,
                posteSecondaire: posteSecondaireVal,
              };
            }
          } else {
            const { data: msg } = await supabase
              .from("site_messages")
              .select("*")
              .eq("id", demandeId)
              .single();

            if (msg) {
              const p = { ...(msg.metadata || {}), ...(msg.payload || {}) };
              let reg: any = null;

              if (p.id || p.registration_id) {
                const { data: regById } = await supabase
                  .from("player_registrations")
                  .select("*")
                  .eq("id", p.id || p.registration_id)
                  .single();
                if (regById) reg = regById;
              }

              const emailToFind = msg.email || p.guardian_email || p.contact_email;
              if (!reg && emailToFind) {
                const { data: allRegs } = await supabase
                  .from("player_registrations")
                  .select("*")
                  .eq("guardian_email", emailToFind)
                  .order("created_at", { ascending: false });

                if (allRegs && allRegs.length > 0) {
                  if (allRegs.length === 1) {
                    reg = allRegs[0];
                  } else {
                    const targetFirst = (p.enfant_prenom || p.child_first_name || p.prenom || "").trim().toLowerCase();
                    const targetLast = (p.enfant_nom || p.child_last_name || p.nom || "").trim().toLowerCase();
                    const matched = allRegs.find((r: any) => {
                      const cFirst = (r.child_first_name || "").toLowerCase();
                      const cLast = (r.child_last_name || "").toLowerCase();
                      return (targetFirst && (cFirst.includes(targetFirst) || targetFirst.includes(cFirst))) ||
                             (targetLast && (cLast.includes(targetLast) || targetLast.includes(cLast)));
                    });
                    reg = matched || allRegs[0];
                  }
                }
              }

              if (reg) {
                let parsedPrenom = (reg.child_first_name || p.enfant_prenom || p.child_first_name || p.prenom || "").trim();
                let parsedNom = (reg.child_last_name || p.enfant_nom || p.child_last_name || p.nom || "").trim();
                if (parsedPrenom && parsedNom.toLowerCase().startsWith(parsedPrenom.toLowerCase())) {
                  parsedNom = parsedNom.substring(parsedPrenom.length).trim();
                } else if (!parsedPrenom && parsedNom.includes(" ")) {
                  const parts = parsedNom.split(" ");
                  parsedNom = parts.pop() || "";
                  parsedPrenom = parts.join(" ");
                }

                const isTiToroProg = String(reg.program || p.program || "").toLowerCase().includes("ti");
                const rawParentLien = reg.guardian_relation || reg.guardian_link || reg.relationship || reg.parent_lien || reg.lien_parente || reg.lien_parent || reg.lien || reg.relation || p.guardian_relation || p.guardian_link || p.relationship || p.parent_lien || p.lien_parente || p.lien_parent || p.lien || p.relation || p.lien_avec_le_joueur || p.parent_relation || "";
                const rawUrgenceLien = reg.emergency_relation || reg.emergency_link || reg.urgence_lien || reg.lien_urgence || p.emergency_relation || p.emergency_contact_relation || p.emergency_link || p.urgence_lien || p.lien_urgence || p.lien_parente || "";

                prefill = {
                  nom: parsedNom,
                  prenom: parsedPrenom,
                  dateNaissance: reg.child_birth_date || p.child_birth_date || p.child_dob || "",
                  sexe: (reg.child_gender === "Female" || reg.child_gender === "Fille" || p.child_gender === "Female" || p.child_gender === "Fille" || p.sexe === "Fille" || p.sexe === "Female") ? "Féminin" : "Masculin",
                  telephone: reg.guardian_phone || p.guardian_phone || p.contact_telephone || msg.phone || "",
                  email: reg.guardian_email || p.guardian_email || p.contact_email || msg.email || "",
                  adresse: reg.child_address || reg.guardian_address || p.child_address || p.guardian_address || p.adresse || "",
                  categorie: isTiToroProg ? "ti toro" : "fc toro",
                  programme: isTiToroProg ? "Ti Toro" : "FC Toro",
                  ecole: reg.child_school || reg.school || reg.ecole || reg.etablissement || reg.ecole_frequentee || p.child_school || p.school || p.ecole || p.ecole_frequentee || p.etablissement || p.etablissement_scolaire || "",
                  experienceSoccer: reg.experience || reg.experience_soccer || reg.experience_foot || reg.child_soccer_experience || p.experience || p.experience_soccer || p.ancienne_experience || p.experience_foot || "",
                  parentNomPrenom: reg.guardian_name || (reg.guardian_first_name ? `${reg.guardian_first_name} ${reg.guardian_last_name || ""}`.trim() : "") || p.parent_nom || p.guardian_name || msg.name || "",
                  parentEmail: reg.guardian_email || p.parent_email || p.guardian_email || msg.email || "",
                  parentTelephone: reg.guardian_phone || p.parent_telephone || p.guardian_phone || msg.phone || "",
                  parentAdresse: reg.guardian_address || p.parent_adresse || p.guardian_address || "",
                  parentLien: rawParentLien || rawUrgenceLien || "",
                  urgenceNomPrenom: reg.emergency_name || p.emergency_name || p.emergency_contact_name || p.urgence_nom || "",
                  urgenceTelephone: reg.emergency_phone || p.emergency_phone || p.emergency_contact_phone || p.urgence_telephone || "",
                  urgenceLien: rawUrgenceLien || rawParentLien || "",
                  urgenceEmail: reg.emergency_email || p.emergency_email || p.emergency_contact_email || p.urgence_email || "",
                  urgenceAdresse: reg.emergency_address || p.emergency_address || p.emergency_contact_address || p.urgence_adresse || "",
                  tailleHaut: normalizeUniformSize(reg.uniform_top_size || reg.taille_haut || reg.taille_maillot || reg.top_size || reg.size_top || p.uniform_top_size || p.taille_haut || p.taille_maillot || p.tailleMaillot || p.tailleHaut || p.top_size || p.size_top),
                  tailleShort: normalizeUniformSize(reg.uniform_short_size || reg.taille_short || reg.short_size || reg.bottom_size || reg.size_bottom || p.uniform_short_size || p.taille_short || p.tailleShort || p.short_size || p.bottom_size || p.size_bottom),
                  numerosPreferes: reg.preferred_numbers || p.preferred_numbers || p.numeros_preferes || p.numerosPreferes || "",
                  planPaiement: normalizePaymentPlan(reg.payment_plan || p.payment_plan || p.plan_paiement || p.planPaiement || p.plan),
                  modePaiementChoisi: translatePaymentMethod(reg.payment_method || p.payment_method || p.modePaiementChoisi || p.methode_paiement || p.methodePaiement),
                };

                const { data: docs } = await supabase
                  .from("player_registration_documents")
                  .select("*")
                  .eq("registration_id", reg.id);
                
                if (docs && docs.length > 0) {
                  docs.forEach((doc: any) => {
                    if (doc.path) {
                      const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";
                      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uivlcmvofzoyzhtjntlp.supabase.co";
                      const finalUrl = doc.path.startsWith("http") ? doc.path : `${supabaseUrl}/storage/v1/object/public/${bucket}/${doc.path}`;

                      const key = String(doc.doc_key).toLowerCase();
                      if (key.includes("photo")) prefill.photoIdentiteUrl = finalUrl;
                      if (key.includes("naissance") || key.includes("birth_certificate") || key.includes("birth")) prefill.acteNaissanceUrl = finalUrl;
                      if (key.includes("parent") || key.includes("identit") || key.includes("id_card")) prefill.carteIdentiteParentUrl = finalUrl;
                    }
                  });
                }
              } else {
                let parsedPrenom = (p.enfant_prenom || p.child_first_name || p.prenom || msg.contact_prenom || "").toString().trim();
                let parsedNom = (p.enfant_nom || p.child_last_name || p.nom || msg.contact_nom || "").toString().trim();
                if (parsedPrenom && parsedNom.toLowerCase().startsWith(parsedPrenom.toLowerCase())) {
                  parsedNom = parsedNom.substring(parsedPrenom.length).trim();
                } else if (!parsedPrenom && parsedNom.includes(" ")) {
                  const parts = parsedNom.split(" ");
                  parsedNom = parts.pop() || "";
                  parsedPrenom = parts.join(" ");
                }

                const rawParentLien = p.guardian_relation || p.guardian_link || p.relationship || p.parent_lien || p.lien_parente || p.lien_parent || p.lien || p.relation || p.lien_avec_le_joueur || p.parent_relation || "";
                const rawUrgenceLien = p.emergency_relation || p.emergency_contact_relation || p.emergency_link || p.urgence_lien || p.lien_urgence || p.lien_parente || "";

                const isTiToroProg = String(p.program || "").toLowerCase().includes("ti");
                prefill = {
                  nom: parsedNom,
                  prenom: parsedPrenom,
                  dateNaissance: p.child_birth_date || p.child_dob || "",
                  sexe: (p.child_gender === "Female" || p.child_gender === "Fille" || p.sexe === "Fille" || p.sexe === "Female") ? "Féminin" : "Masculin",
                  telephone: p.guardian_phone || p.contact_telephone || msg.phone || "",
                  email: p.guardian_email || p.contact_email || msg.email || "",
                  adresse: p.guardian_address || p.child_address || p.adresse || "",
                  categorie: isTiToroProg ? "ti toro" : "fc toro",
                  programme: isTiToroProg ? "Ti Toro" : "FC Toro",
                  ecole: p.child_school || p.school || p.ecole || p.ecole_frequentee || p.etablissement || p.etablissement_scolaire || "",
                  experienceSoccer: p.experience || p.experience_soccer || p.ancienne_experience || p.experience_foot || "",
                  parentNomPrenom: p.guardian_first_name ? `${p.guardian_first_name} ${p.guardian_last_name || ""}`.trim() : (p.parent_nom || p.guardian_name || msg.name || ""),
                  parentEmail: p.guardian_email || p.parent_email || msg.email || "",
                  parentTelephone: p.guardian_phone || p.parent_telephone || msg.phone || "",
                  parentAdresse: p.guardian_address || p.parent_adresse || "",
                  parentLien: rawParentLien || rawUrgenceLien || "",
                  urgenceNomPrenom: p.emergency_name || p.emergency_contact_name || p.urgence_nom || "",
                  urgenceTelephone: p.emergency_phone || p.emergency_contact_phone || p.urgence_telephone || "",
                  urgenceLien: rawUrgenceLien || rawParentLien || "",
                  urgenceEmail: p.emergency_email || p.emergency_contact_email || p.urgence_email || "",
                  urgenceAdresse: p.emergency_address || p.emergency_contact_address || p.urgence_adresse || "",
                  tailleHaut: normalizeUniformSize(p.uniform_top_size || p.taille_haut || p.taille_maillot || p.tailleMaillot || p.tailleHaut || p.top_size || p.size_top),
                  tailleShort: normalizeUniformSize(p.uniform_short_size || p.taille_short || p.tailleShort || p.short_size || p.bottom_size || p.size_bottom),
                  numerosPreferes: p.preferred_numbers || p.numeros_preferes || p.numerosPreferes || "",
                  postePrincipal: p.poste_principal || "",
                  posteSecondaire: p.poste_secondaire || "",
                  planPaiement: normalizePaymentPlan(p.payment_plan || p.plan_paiement || p.planPaiement || p.plan),
                  modePaiementChoisi: translatePaymentMethod(p.payment_method || p.modePaiementChoisi || p.methode_paiement || p.methodePaiement),
                };
              }
            }
          }

          const statutJoueur = searchParams.get("statutJoueur");
          const sourceDetection = searchParams.get("sourceDetection") === "true";
          const commentIdentifie = searchParams.get("commentIdentifie");
          const piedDominant = searchParams.get("piedDominant");
          const clubActuel = searchParams.get("clubActuel");
          const ecoleParam = searchParams.get("ecole");

          if (statutJoueur) prefill.statutJoueur = statutJoueur;
          if (sourceDetection) prefill.sourceDetection = true;
          if (commentIdentifie) prefill.commentIdentifie = commentIdentifie;
          if (piedDominant) prefill.piedDominant = piedDominant;
          if (clubActuel) prefill.clubActuel = clubActuel;
          if (ecoleParam) prefill.ecole = ecoleParam;

          setInitialValues(prefill);
        } catch (e) {
          console.error("Failed to fetch demande:", e);
        } finally {
          setLoadingDemande(false);
        }
      };
      loadDemande();
    }
  }, [searchParams]);

  const handleSubmit = async (values: PlayerFormValues) => {
    const isDuplicate = players.some(p => 
      p.nom.toLowerCase().trim() === values.nom.toLowerCase().trim() && 
      p.prenom.toLowerCase().trim() === values.prenom.toLowerCase().trim()
    );

    if (isDuplicate) {
      if (!window.confirm(`Un joueur nommé ${values.prenom} ${values.nom} est déjà enregistré.\nVoulez-vous quand même enregistrer ce joueur en tant que doublon ?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);
    const newPlayerLocal = createPlayerFromForm(`temp-${Date.now()}`, values, today);
    
    try {
      const inserted = await addPlayerToSupabase(newPlayerLocal);
      if (inserted && inserted.EtudiantID) {
        const chosenSeasonStr = values.saison || getCurrentSeason();
        const isDetection = values.sourceDetection || false;
        const matriculeCode = generatePlayerMatricule(inserted.EtudiantID, chosenSeasonStr, isDetection);
        
        const newPlayer = { 
          ...newPlayerLocal, 
          id: String(inserted.EtudiantID),
          saison: chosenSeasonStr,
          matricule: matriculeCode,
          sourceDetection: isDetection,
          ...(inserted.photoUrl ? { photoUrl: inserted.photoUrl } : {}),
          ...(inserted.photoIdentiteUrl ? { photoIdentiteUrl: inserted.photoIdentiteUrl } : {}),
          ...(inserted.acteNaissanceUrl ? { acteNaissanceUrl: inserted.acteNaissanceUrl } : {}),
          ...(inserted.carteIdentiteParentUrl ? { carteIdentiteParentUrl: inserted.carteIdentiteParentUrl } : {}),
          ...(inserted.fiche9eUrl ? { fiche9eUrl: inserted.fiche9eUrl } : {}),
          ...(inserted.carnetVaccinationUrl ? { carnetVaccinationUrl: inserted.carnetVaccinationUrl } : {}),
        };
        // Clean any leftover base64 strings from local state
        if (newPlayer.photoIdentiteUrl?.startsWith("data:")) delete (newPlayer as any).photoIdentiteUrl;
        if (newPlayer.acteNaissanceUrl?.startsWith("data:")) delete (newPlayer as any).acteNaissanceUrl;
        if (newPlayer.carteIdentiteParentUrl?.startsWith("data:")) delete (newPlayer as any).carteIdentiteParentUrl;
        if (newPlayer.fiche9eUrl?.startsWith("data:")) delete (newPlayer as any).fiche9eUrl;
        if (newPlayer.carnetVaccinationUrl?.startsWith("data:")) delete (newPlayer as any).carnetVaccinationUrl;

        setPlayers((prevPlayers) => [newPlayer, ...prevPlayers]);
        
        if (values.programmesAssignesIds && values.programmesAssignesIds.length > 0) {
          syncPlayerProgrammes(String(inserted.EtudiantID), values.programmesAssignesIds).catch(console.error);
        }

        // Envoyer l'e-mail automatique de validation d'inscription de manière asynchrone (sans bloquer)
        const targetEmail = values.parentEmail || values.email;
        if (targetEmail) {
          fetch("/api/send-acceptance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: targetEmail,
              parentName: values.parentNomPrenom || "",
              childName: `${values.prenom || ""} ${values.nom || ""}`.trim(),
              matricule: matriculeCode,
              categorie: values.categorie,
              programme: values.programme,
            }),
          }).catch((e) => {
            console.warn("Impossible d'envoyer l'e-mail automatique de validation :", e);
          });
        }

        // Also archive the message if it came from one
        const demandeId = searchParams.get("demandeId");
        const siteMessageId = searchParams.get("siteMessageId");
        
        if (siteMessageId) {
          updateMessageStatus(siteMessageId, "inscrit").catch(console.warn);
        } else if (demandeId) {
          updateMessageStatus(demandeId, "inscrit").catch(console.warn);
        }

        router.push(`/joueurs?registered=true&code=${encodeURIComponent(matriculeCode)}`);
      } else {
        setToast({ message: "Erreur lors de la création. Aucune ID retournée.", type: "error" });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(error);
      setToast({ message: "Erreur lors de la création. Veuillez réessayer.", type: "error" });
      setIsSubmitting(false);
    }
  };

  if (loadingDemande) {
    return <div className="flex justify-center p-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div></div>;
  }

  return (
    <>
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <PlayerForm
          key={searchParams.get("demandeId") || "manual"}
          initialValues={initialValues}
          categories={categories}
          onCancel={() => router.push("/joueurs")}
          onSubmit={handleSubmit}
          submitLabel="Inscrire le joueur"
          draftKey={searchParams.get("demandeId") ? undefined : "new_player_manual"}
          isSubmitting={isSubmitting}
        />
      </div>
      <div className="flex justify-end">
        <Link
          href="/joueurs"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Retour a la liste
        </Link>
      </div>
    </>
  );
}

function NewPlayerPageContent() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Ajouter un joueur" />
      <NewPlayerFormContent />
    </div>
  );
}

export default function NewPlayerPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div></div>}>
      <NewPlayerPageContent />
    </Suspense>
  );
}
