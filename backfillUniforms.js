require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function normalize(str) {
  return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function run() {
  const { data: students } = await supabase.from('tblEtudiants').select('EtudiantID, Nom, Prenom, TailleHaut, TailleShort');
  const { data: regs } = await supabase.from('player_registrations').select('*');
  
  let updatedCount = 0;
  
  for (const student of students) {
    if (!student.TailleHaut || !student.TailleShort) {
      
      const sPrenom = normalize(student.Prenom);
      const sNom = normalize(student.Nom);
      
      // Special override for Tristen Momplaisir
      let match;
      if (student.EtudiantID === 2644) {
          match = regs.find(r => r.child_last_name === 'Momplaisir' && r.child_first_name === 'Triste');
      } else {
          match = regs.find(r => 
            normalize(r.child_first_name) === sPrenom && normalize(r.child_last_name) === sNom
          );
      }
      
      if (match) {
        const updatePayload = {};
        if (!student.TailleHaut && match.uniform_top_size) updatePayload.TailleHaut = match.uniform_top_size;
        if (!student.TailleShort && match.uniform_short_size) updatePayload.TailleShort = match.uniform_short_size;
        
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('tblEtudiants').update(updatePayload).eq('EtudiantID', student.EtudiantID);
          updatedCount++;
          console.log("Fixed uniforms for " + student.Prenom + " " + student.Nom);
        }
      }
    }
  }
  
  console.log("Successfully ran robust uniform backfill on " + updatedCount + " players.");
}

run();
