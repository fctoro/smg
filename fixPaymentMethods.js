require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: students } = await supabase.from('tblEtudiants').select('EtudiantID, MethodePaiement').not('MethodePaiement', 'is', null);
  
  let updatedCount = 0;
  
  for (const student of students) {
    let newValue = null;
    if (student.MethodePaiement === 'transfert') newValue = 'Transfert bancaire';
    else if (student.MethodePaiement === 'cash_cheque') newValue = 'Cash/chèque';
    else if (student.MethodePaiement === 'carte') newValue = 'Carte bancaire';
    
    if (newValue) {
      await supabase.from('tblEtudiants').update({ MethodePaiement: newValue }).eq('EtudiantID', student.EtudiantID);
      updatedCount++;
    }
  }
  
  console.log("Successfully translated " + updatedCount + " payment methods.");
}

run();
