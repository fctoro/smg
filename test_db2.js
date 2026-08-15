const fs = require('fs');

async function test() {
  const { createClient } = require('@supabase/supabase-js');
  const env = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  if(!urlMatch || !keyMatch) return;
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

  const { data, error } = await supabase.from('tblEtudiants').select('Nom, Prenom, Actif, StatutJoueur').limit(10);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
