require('dotenv').config({ path: '../.env.local' });
const { Client } = require('pg');

// Connexion à la base de données Supabase via variable d'environnement
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function resetJoueurSpecial() {
  try {
    // Connexion à la base de données
    await client.connect();
    console.log('Connexion à la base de données établie...\n');

    // Requête pour remettre à zéro les statuts "Joueur spécial"
    const updateQuery = `
      UPDATE joueurs 
      SET statut_joueur = '' 
      WHERE LOWER(statut_joueur) NOT LIKE '%bourse%' 
        AND LOWER(statut_joueur) NOT LIKE '%demi%'
        AND statut_joueur IS NOT NULL 
        AND statut_joueur != '';
    `;

    const result = await client.query(updateQuery);
    console.log(`✓ ${result.rowCount} joueurs ont été mis à jour\n`);

    // Vérification : Afficher les statistiques actuelles
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN LOWER(statut_joueur) LIKE '%bourse%' AND LOWER(statut_joueur) NOT LIKE '%demi%' THEN 1 END) as bourse_100,
        COUNT(CASE WHEN LOWER(statut_joueur) LIKE '%demi%' THEN 1 END) as demi_bourse_50,
        COUNT(CASE WHEN LOWER(statut_joueur) NOT LIKE '%bourse%' AND LOWER(statut_joueur) NOT LIKE '%demi%' AND statut_joueur != '' THEN 1 END) as joueurs_speciaux,
        COUNT(CASE WHEN statut_joueur = '' OR statut_joueur IS NULL THEN 1 END) as sans_statut
      FROM joueurs 
      WHERE statut != 'alumni';
    `;

    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log('Statistiques actuelles :');
    console.log('------------------------');
    console.log(`Bourse (100%): ${stats.bourse_100} joueurs`);
    console.log(`Demi-bourse (50%): ${stats.demi_bourse_50} joueurs`);
    console.log(`Joueurs spéciaux: ${stats.joueurs_speciaux} joueurs`);
    console.log(`Sans statut: ${stats.sans_statut} joueurs`);
    console.log('\n✓ Opération terminée avec succès !');

  } catch (err) {
    console.error('Erreur lors de l\'exécution du script:', err);
  } finally {
    // Fermer la connexion
    await client.end();
  }
}

// Exécuter la fonction
resetJoueurSpecial();