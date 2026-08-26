require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: students } = await supabase.from('tblEtudiants').select('EtudiantID, Nom, Prenom, PlanPaiement, MethodePaiement, NumerosPreferes, Ecole');
  const { data: regs } = await supabase.from('player_registrations').select('*');
  
  let updatedCount = 0;
  
  for (const student of students) {
    if (!student.PlanPaiement || !student.Ecole || !student.NumerosPreferes) {
      // Find matching registration
      const match = regs.find(r => 
        (r.child_first_name && r.child_first_name.toLowerCase().includes((student.Prenom || '').toLowerCase())) &&
        (r.child_last_name && r.child_last_name.toLowerCase().includes((student.Nom || '').toLowerCase()))
      );
      
      if (match) {
        const updatePayload = {};
        if (!student.PlanPaiement && match.payment_plan) updatePayload.PlanPaiement = match.payment_plan;
        if (!student.MethodePaiement && match.payment_method) updatePayload.MethodePaiement = match.payment_method;
        if (!student.NumerosPreferes && match.preferred_numbers) updatePayload.NumerosPreferes = match.preferred_numbers;
        if (!student.Ecole && match.child_school) updatePayload.Ecole = match.child_school;
        
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('tblEtudiants').update(updatePayload).eq('EtudiantID', student.EtudiantID);
          updatedCount++;
          console.log("Updated " + student.Prenom + " " + student.Nom);
        }
      }
    }
  }
  
  console.log("Successfully updated " + updatedCount + " players.");
}

run();
