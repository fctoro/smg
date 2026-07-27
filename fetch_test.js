const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://efyjemzzapcrluqydwzj.supabase.co', 'sb_publishable_XpkWIeELVcJ3Ez3nk2PHjQ__cjeOpIZ');

async function test() {
  const allMessages = [];

  const { data: prData, error: prErr } = await supabase
    .from("player_registrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (!prErr && prData) {
    const formattedPr = prData.map((pr) => {
      const status = (pr.statut === 'en_attente' || pr.statut === 'nouveau' || !pr.statut) ? 'nouveau' : 'lu';
      const enfantNomComplet = `${pr.enfant_prenom || ''} ${pr.enfant_nom || ''}`.trim();
      const parentNomComplet = `${pr.parent_prenom || ''} ${pr.parent_nom || ''}`.trim();
      
      return {
        id: pr.id,
        type_message: "inscription_joueur",
        statut: status,
        contact_nom: parentNomComplet || "Parent",
        contact_email: pr.email || "",
        contact_telephone: pr.telephone || "",
        sujet: `Inscription Joueur - ${enfantNomComplet}`,
        contenu: `Catégorie: ${pr.categorie || 'N/A'} | Naissance: ${pr.date_naissance || 'N/A'} | Sexe: ${pr.sexe || 'N/A'}`,
        reference_id: pr.id,
        created_at: pr.created_at || new Date().toISOString(),
        metadata: { enfant_nom: enfantNomComplet, source_table: 'player_registrations' },
      };
    });
    allMessages.push(...formattedPr);
  }
  
  console.log(allMessages);
}

test();
