const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://efyjemzzapcrluqydwzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWplbXp6YXBjcmx1cXlkd3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NzkzNCwiZXhwIjoyMTAwMTUzOTM0fQ.L6XyU7__o4qwEkfd2rTXiwAzwgYxm5jhAyMf4lY-W00'
);

async function createTable() {
  try {
    console.log('🔧 Création de la table player_status...\n');

    // Lire le fichier SQL
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'create_player_status_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Exécuter le SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Erreur lors de la création de la table:', error);
      console.log('\nTentative de création manuelle...');
      
      // Essayer de créer la table directement
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.player_status (
          id SERIAL PRIMARY KEY,
          player_id INTEGER NOT NULL REFERENCES public.tblEtudiants(EtudiantID) ON DELETE CASCADE,
          status TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          UNIQUE(player_id)
        );
      `;

      const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createTableQuery });
      
      if (createError) {
        console.error('Impossible de créer la table automatiquement.');
        console.log('Veuillez exécuter le script SQL manuellement dans Supabase SQL Editor.');
        console.log('Fichier: FCToro/scripts/create_player_status_table.sql');
        return;
      }
    }

    console.log('✅ Table player_status créée avec succès!');
    
    // Vérifier que la table existe
    const { data: tables, error: checkError } = await supabase
      .from('player_status')
      .select('count')
      .limit(1);

    if (!checkError) {
      console.log('✅ Vérification: la table est accessible.');
    }

  } catch (err) {
    console.error('Erreur:', err);
    console.log('\nVeuillez exécuter le script SQL manuellement dans Supabase SQL Editor:');
    console.log('Fichier: FCToro/scripts/create_player_status_table.sql');
  }
}

createTable();