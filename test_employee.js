require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const insertPayload = {
    Nom: 'Test',
    Prenom: 'Test',
    Sexe: 'M',
    Telephone: '12345678',
    Email: 'test@example.com',
    Adresse: 'Test',
    Fonction: 'Test',
    Salaire: 100,
    DateEmbauche: null,
    NiveauEtude: 'Test',
    Profession: 'Test',
    Desactive: false,
  };

  const { data, error } = await supabase
    .from("tblEmployes")
    .insert(insertPayload)
    .select("EmployeId")
    .single();

  console.log("Error:", error);
  console.log("Data:", data);
}

run();
