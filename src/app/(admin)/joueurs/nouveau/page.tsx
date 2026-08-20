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

function NewPlayerFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { players, setPlayers } = useClubData();
  const [initialValues, setInitialValues] = useState<Partial<PlayerFormValues>>({});
  const [loadingDemande, setLoadingDemande] = useState(false);

  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...players.map((player) => player.categorie)])],
    [players],
  );

  useEffect(() => {
    const demandeId = searchParams.get("demandeId");
    if (demandeId) {
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
                adresse: det.zone_residence || "",
                categorie: "fc toro",
                experienceSoccer: det.experience || "",
                parentNomPrenom: det.parent_nom || "",
                parentEmail: det.parent_email || "",
                parentTelephone: det.parent_telephone || "",
                parentLien: det.parent_lien || "",
                urgenceNomPrenom: "",
                urgenceTelephone: "",
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
              const p = msg.payload || {};
              let reg: any = null;

              if (p.id) {
                const { data: regById } = await supabase
                  .from("player_registrations")
                  .select("*")
                  .eq("id", p.id)
                  .single();
                if (regById) reg = regById;
              }

              if (!reg && (msg.email || p.guardian_email)) {
                const { data: allRegs } = await supabase
                  .from("player_registrations")
                  .select("*")
                  .eq("guardian_email", msg.email || p.guardian_email)
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
                let parsedPrenom = (reg.child_first_name || "").trim();
                let parsedNom = (reg.child_last_name || "").trim();
                if (parsedPrenom && parsedNom.toLowerCase().startsWith(parsedPrenom.toLowerCase())) {
                  parsedNom = parsedNom.substring(parsedPrenom.length).trim();
                } else if (!parsedPrenom && parsedNom.includes(" ")) {
                  const parts = parsedNom.split(" ");
                  parsedNom = parts.pop() || "";
                  parsedPrenom = parts.join(" ");
                }

                const isTiToroProg = String(reg.program || "").toLowerCase().includes("ti");
                prefill = {
                  nom: parsedNom,
                  prenom: parsedPrenom,
                  dateNaissance: reg.child_birth_date || "",
                  sexe: reg.child_gender === "Female" || reg.child_gender === "Fille" ? "Féminin" : "Masculin",
                  telephone: reg.guardian_phone || msg.phone || "",
                  email: reg.guardian_email || msg.email || "",
                  adresse: reg.child_address || reg.guardian_address || "",
                  categorie: isTiToroProg ? "ti toro" : "fc toro",
                  programme: isTiToroProg ? "Ti Toro (2 à 5 ans)" : "FC Toro (6 ans et plus)",
                  experienceSoccer: reg.experience || reg.experience_soccer || reg.experience_foot || "",
                  parentNomPrenom: reg.guardian_name || (reg.guardian_first_name ? `${reg.guardian_first_name} ${reg.guardian_last_name || ""}`.trim() : ""),
                  parentEmail: reg.guardian_email || "",
                  parentTelephone: reg.guardian_phone || "",
                  parentAdresse: reg.guardian_address || "",
                  urgenceNomPrenom: reg.emergency_name || p.emergency_contact_name || "",
                  urgenceTelephone: reg.emergency_phone || p.emergency_contact_phone || "",
                  urgenceLien: reg.emergency_relation || p.emergency_contact_relation || "",
                  urgenceEmail: reg.emergency_email || p.emergency_contact_email || "",
                  urgenceAdresse: reg.emergency_address || p.emergency_contact_address || "",
                  tailleHaut: reg.uniform_top_size || "",
                  tailleShort: reg.uniform_short_size || "",
                  numerosPreferes: reg.preferred_numbers || "",
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

                const isTiToroProg = String(p.program || "").toLowerCase().includes("ti");
                prefill = {
                  nom: parsedNom,
                  prenom: parsedPrenom,
                  dateNaissance: p.child_birth_date || p.child_dob || "",
                  sexe: p.child_gender === "Female" || p.child_gender === "Fille" ? "Féminin" : "Masculin",
                  telephone: p.guardian_phone || msg.phone || "",
                  email: msg.email || p.guardian_email || "",
                  adresse: p.guardian_address || p.child_address || "",
                  categorie: isTiToroProg ? "ti toro" : "fc toro",
                  programme: isTiToroProg ? "Ti Toro (2 à 5 ans)" : "FC Toro (6 ans et plus)",
                  experienceSoccer: p.experience || p.experience_soccer || p.ancienne_experience || p.experience_foot || "",
                  parentNomPrenom: p.guardian_first_name ? `${p.guardian_first_name} ${p.guardian_last_name || ""}`.trim() : (msg.name || ""),
                  parentEmail: p.guardian_email || msg.email || "",
                  parentTelephone: p.guardian_phone || msg.phone || "",
                  parentAdresse: p.guardian_address || "",
                  urgenceNomPrenom: p.emergency_contact_name || "",
                  urgenceTelephone: p.emergency_contact_phone || "",
                  urgenceLien: p.emergency_contact_relation || "",
                  urgenceEmail: p.emergency_contact_email || "",
                  urgenceAdresse: p.emergency_contact_address || "",
                  postePrincipal: p.poste_principal || "",
                  posteSecondaire: p.poste_secondaire || "",
                };
              }
            }
          }

          const statutJoueur = searchParams.get("statutJoueur");
          const sourceDetection = searchParams.get("sourceDetection") === "true";
          const commentIdentifie = searchParams.get("commentIdentifie");
          const piedDominant = searchParams.get("piedDominant");
          const clubActuel = searchParams.get("clubActuel");

          if (statutJoueur) prefill.statutJoueur = statutJoueur;
          if (sourceDetection) prefill.sourceDetection = true;
          if (commentIdentifie) prefill.commentIdentifie = commentIdentifie;
          if (piedDominant) prefill.piedDominant = piedDominant;
          if (clubActuel) prefill.clubActuel = clubActuel;

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
        };
        setPlayers((prevPlayers) => [newPlayer, ...prevPlayers]);
        
        if (values.programmesAssignesIds && values.programmesAssignesIds.length > 0) {
          await syncPlayerProgrammes(String(inserted.EtudiantID), values.programmesAssignesIds);
        }

        // Also archive the message if it came from one
        const demandeId = searchParams.get("demandeId");
        const siteMessageId = searchParams.get("siteMessageId");
        
        if (demandeId && demandeId.startsWith("det_")) {
          const detId = demandeId.replace("det_", "");
          await supabase.from("detection_registrations").update({ status: "enrolled", is_read: true }).eq("id", detId);
        }

        if (siteMessageId) {
          // It's a detection that has a linked site_messages entry
          await supabase.from("site_messages").update({ status: "enrolled", is_read: true }).eq("id", siteMessageId);
        } else if (demandeId && !demandeId.startsWith("det_")) {
          // Regular site_messages entry
          await supabase.from("site_messages").update({ status: "enrolled", is_read: true }).eq("id", demandeId);
        }
        router.push("/joueurs");
      }
    } catch (error) {
      alert("Erreur lors de la création. Veuillez réessayer.");
    }
  };

  if (loadingDemande) {
    return <div className="flex justify-center p-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div></div>;
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <PlayerForm
          initialValues={initialValues}
          categories={categories}
          onCancel={() => router.push("/joueurs")}
          onSubmit={handleSubmit}
          submitLabel="Enregistrer"
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
