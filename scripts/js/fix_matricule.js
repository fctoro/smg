const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/\r/g, '');
  return acc;
}, {});

async function run() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tblEtudiants?matricule=ilike.*XXXX*`;
  const options = {
    method: 'GET',
    headers: {
      'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  const res = await fetch(url, options);
  const data = await res.json();
  
  if (!Array.isArray(data)) {
    console.error(data);
    return;
  }
  
  console.log(`Found ${data.length} players with XXXX in matricule`);
  for (const player of data) {
    const catMatch = player.categorie ? player.categorie.match(/\d+/) : null;
    const catCode = catMatch ? `U${catMatch[0]}` : 'UXX';
    const idStr = String(player.id).padStart(4, '0');
    const newMatricule = `FCT-${catCode}-${idStr}`;
    
    console.log(`Updating ${player.prenom} ${player.nom}: ${player.matricule} -> ${newMatricule}`);
    
    const patchRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tblEtudiants?EtudiantId=eq.${player.EtudiantId}`, {
      method: 'PATCH',
      headers: options.headers,
      body: JSON.stringify({ matricule: newMatricule })
    });
    console.log(`Update status: ${patchRes.status}`);
  }
}
run();
