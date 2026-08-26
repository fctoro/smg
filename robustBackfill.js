require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function normalize(str) {
  return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function run() {
  const { data: students } = await supabase.from('tblEtudiants').select('EtudiantID, Nom, Prenom, PlanPaiement, MethodePaiement, NumerosPreferes, Ecole');
  const { data: regs } = await supabase.from('player_registrations').select('*');
  
  let updatedCount = 0;
  
  for (const student of students) {
    if (!student.PlanPaiement || !student.Ecole || !student.NumerosPreferes || student.MethodePaiement === 'cash_cheque' || student.MethodePaiement === 'transfert' || student.MethodePaiement === 'carte') {
      
      const sPrenom = normalize(student.Prenom);
      const sNom = normalize(student.Nom);
      
      const match = regs.find(r => 
        normalize(r.child_first_name) === sPrenom && normalize(r.child_last_name) === sNom
      );
      
      if (match) {
        const updatePayload = {};
        if (!student.PlanPaiement && match.payment_plan) updatePayload.PlanPaiement = match.payment_plan;
        if (!student.NumerosPreferes && match.preferred_numbers) updatePayload.NumerosPreferes = match.preferred_numbers;
        if (!student.Ecole && match.child_school) updatePayload.Ecole = match.child_school;
        
        // Always fix payment method if we have a match, just to be sure it's translated
        if (match.payment_method) {
            updatePayload.MethodePaiement = match.payment_method === 'cash_cheque' ? 'Cash/chèque' : match.payment_method === 'transfert' ? 'Transfert bancaire' : 'Carte bancaire';
        }
        
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('tblEtudiants').update(updatePayload).eq('EtudiantID', student.EtudiantID);
          updatedCount++;
          console.log("Fixed " + student.Prenom + " " + student.Nom);
        }
      }
    }
  }
  
  console.log("Successfully ran robust backfill on " + updatedCount + " players.");
}

run();
