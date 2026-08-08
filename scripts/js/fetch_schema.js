const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://efyjemzzapcrluqydwzj.supabase.co', 'sb_publishable_XpkWIeELVcJ3Ez3nk2PHjQ__cjeOpIZ');

async function search() {
  const tables = ['player_registrations', 'tblInscriptions', 'site_messages', 'tblEmployes', 'tblJoueurs', 'tblParents', 'inscriptions_joueurs'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (!error && data && data.length > 0) {
      console.log(`Table ${table} has ${data.length} records.`);
      // Try to find Alcegaire or Neguerre
      const str = JSON.stringify(data);
      if (str.includes('Alcegaire') || str.includes('Neguerre') || str.includes('Heinz')) {
        console.log(`BINGO! Found real names in table: ${table}`);
      }
    } else if (error) {
      console.log(`Table ${table} Error: ${error.message}`);
    } else {
      console.log(`Table ${table} is empty.`);
    }
  }
}
search();
