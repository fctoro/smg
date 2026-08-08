const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://efyjemzzapcrluqydwzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWplbXp6YXBjcmx1cXlkd3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NzkzNCwiZXhwIjoyMTAwMTUzOTM0fQ.L6XyU7__o4qwEkfd2rTXiwAzwgYxm5jhAyMf4lY-W00'
);

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