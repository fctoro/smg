const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: matched, error } = await supabase.from('tblPaiements')
    .select('*')
    .or('MntPayeUS.eq.359,MntPayeUS.eq.456');
    
  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${matched.length} payments to delete.`);
  for (const m of matched) {
    if (m.EtudiantId === 11 || m.EtudiantId === 8) {
      console.log(`Deleting payment ID ${m.Id} with amount ${m.MntPayeUS} for EtudiantId ${m.EtudiantId}`);
      const { error: delErr } = await supabase.from('tblPaiements').delete().eq('Id', m.Id);
      if (delErr) {
         console.error(`Failed to delete ${m.Id}:`, delErr);
      } else {
         console.log(`Successfully deleted ${m.Id}`);
      }
    }
  }
}

run();
