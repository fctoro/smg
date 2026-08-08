const { createClient } = require('@supabase/supabase-js');

// Initialiser le client Supabase avec la clé de service
const supabase = createClient(
  'https://efyjemzzapcrluqydwzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWplbXp6YXBjcmx1cXlkd3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NzkzNCwiZXhwIjoyMTAwMTUzOTM0fQ.L6XyU7__o4qwEkfd2rTXiwAzwgYxm5jhAyMf4lY-W00'
);

async function resetJoueurSpecial() {
  try {
    console.log('Connexion à Supabase établie...\n');

    // Récupérer tous les joueurs actifs (non alumni)
    const { data: players, error: fetchError } = await supabase
      .from('joueurs')
      .select('id, statut_joueur, statut')
      .neq('statut', 'alumni');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Nombre total de joueurs actifs: ${players.length}\n`);

    // Filtrer les joueurs qui ont un statut "Joueur spécial" (ni bourse, ni demi-bourse)
    const joueursSpeciaux = players.filter(player => {
      const statut = (player.statut_joueur || '').toLowerCase();
      return statut !== '' &&
        !statut.includes('bourse') &&
        !statut.includes('demi') &&
        statut !== 'inactif' &&
        statut !== 'normal' &&
        statut !== 'aucun';
    });

    console.log(`Nombre de joueurs avec statut "Joueur spécial": ${joueursSpeciaux.length}`);

    if (joueursSpeciaux.length === 0) {
      console.log('\nAucun joueur à mettre à jour.');
      return;
    }

    // Mettre à jour chaque joueur
    let updatedCount = 0;
    for (const player of joueursSpeciaux) {
      const { error: updateError } = await supabase
        .from('joueurs')
        .update({ statut_joueur: '' })
        .eq('id', player.id);

      if (updateError) {
        console.error(`Erreur pour le joueur ${player.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`\n✓ ${updatedCount} joueurs ont été mis à jour\n`);

    // Afficher les statistiques
    const bourseCount = players.filter(p => {
      const st = (p.statut_joueur || '').toLowerCase();
      return st.includes('bourse') && !st.includes('demi');
    }).length;

    const demiBourseCount = players.filter(p => {
      const st = (p.statut_joueur || '').toLowerCase();
      return st.includes('demi');
    }).length;

    const joueurSpecialCount = players.filter(p => {
      const st = (p.statut_joueur || '').toLowerCase();
      return st !== '' && !st.includes('bourse') && !st.includes('demi');
    }).length;

    const sansStatutCount = players.filter(p => {
      return !p.statut_joueur || p.statut_joueur === '';
    }).length;

    console.log('Statistiques actuelles :');
    console.log('------------------------');
    console.log(`Bourse (100%): ${bourseCount} joueurs`);
    console.log(`Demi-bourse (50%): ${demiBourseCount} joueurs`);
    console.log(`Joueurs spéciaux: ${joueurSpecialCount} joueurs`);
    console.log(`Sans statut: ${sansStatutCount} joueurs`);
    console.log('\n✓ Opération terminée avec succès !');

  } catch (err) {
    console.error('Erreur lors de l\'exécution du script:', err);
  }
}

// Exécuter la fonction
resetJoueurSpecial();