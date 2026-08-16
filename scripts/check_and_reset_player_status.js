require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndResetPlayerStatus() {
  try {
    console.log('🔍 Vérification des statuts des joueurs...\n');

    // Récupérer tous les joueurs
    const { data: players, error } = await supabase
      .from('tblEtudiants')
      .select('EtudiantID, Nom, Prenom, StatutJoueur')
      .limit(10);

    if (error) {
      console.error('Erreur lors de la récupération des joueurs:', error);
      return;
    }

    console.log(`Nombre de joueurs récupérés: ${players.length}\n`);
    
    // Afficher les 5 premiers joueurs avec leur statut
    console.log('Exemples de joueurs:');
    console.log('-------------------');
    players.slice(0, 5).forEach((player, index) => {
      console.log(`${index + 1}. ${player.Prenom} ${player.Nom}`);
      console.log(`   ID: ${player.EtudiantID}`);
      console.log(`   StatutJoueur: "${player.StatutJoueur}"`);
      console.log('');
    });

    // Vérifier combien de joueurs ont un statutJoueur non vide
    const { data: withStatus, error: countError } = await supabase
      .from('tblEtudiants')
      .select('EtudiantID', { count: 'exact', head: true })
      .not('StatutJoueur', 'is', null)
      .neq('StatutJoueur', '');

    console.log(`\n📊 Statistiques:`);
    console.log(`   Joueurs avec statutJoueur non vide: ${withStatus?.length || 0}`);
    console.log(`\n✅ Vérification terminée`);

  } catch (err) {
    console.error('Erreur:', err);
  }
}

checkAndResetPlayerStatus();