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
import { supabase } from "@/lib/supabaseClient";

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
          // Fetch site_messages
          const { data: msg } = await supabase
            .from("site_messages")
            .select("*")
            .eq("id", demandeId)
            .single();

          if (msg && msg.payload) {
            const p = msg.payload;
            const prefill: Partial<PlayerFormValues> = {
              nom: p.child_last_name || "",
              prenom: p.child_first_name || "",
              dateNaissance: p.child_birth_date || p.child_dob || "",
              sexe: p.child_gender === "Female" || p.child_gender === "Fille" ? "Féminin" : "Masculin",
              telephone: p.guardian_phone || msg.phone || "",
              email: msg.email || p.guardian_email || "",
              adresse: p.guardian_address || p.child_address || "",
              categorie: p.program === "tiToro" ? "ti toro" : "fc toro",
            };

            // Fetch docs
            const emailToSearch = msg.email || p.guardian_email;
            if (emailToSearch) {
              const { data: allRegs } = await supabase.from('player_registrations').select('id').eq('guardian_email', emailToSearch).order('created_at', { ascending: false }).limit(1);
              if (allRegs && allRegs.length > 0) {
                const { data: docs } = await supabase.from('player_registration_documents').select('*').eq('registration_id', allRegs[0].id);
                if (docs && docs.length > 0) {
                  docs.forEach(doc => {
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
              }
            }
            setInitialValues(prefill);
          }
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
    alert("Action temporairement désactivée pour la création du joueur. Les documents sont bien préservés.");
    return;
    const today = new Date().toISOString().slice(0, 10);
    const newPlayerLocal = createPlayerFromForm(`temp-${Date.now()}`, values, today);
    
    try {
      const inserted = await addPlayerToSupabase(newPlayerLocal);
      if (inserted && inserted.EtudiantID) {
        const newPlayer = { ...newPlayerLocal, id: String(inserted.EtudiantID) };
        setPlayers((prevPlayers) => [newPlayer, ...prevPlayers]);
        // Also archive the message if it came from one
        const demandeId = searchParams.get("demandeId");
        if (demandeId) {
          await supabase.from("site_messages").update({ status: "resolved", is_read: true }).eq("id", demandeId);
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

export default function NewPlayerPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Ajouter un joueur" />
      <Suspense fallback={<div className="flex justify-center p-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div></div>}>
        <NewPlayerFormContent />
      </Suspense>
    </div>
  );
}
