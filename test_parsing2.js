const fs = require('fs');

async function test() {
  const { createClient } = require('@supabase/supabase-js');
  const env = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  if(!urlMatch || !keyMatch) return;
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

  let etudiantsData = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from('tblEtudiants').select('*').range(from, from + step - 1);
    if (error) break;
    if (data && data.length > 0) {
      etudiantsData = etudiantsData.concat(data);
      if (data.length < step) break;
      from += step;
    } else break;
  }

  const validEtudiants = etudiantsData.filter((d) => {
    const nom = (d.Nom || '').toLowerCase().trim();
    if (!nom) return false;
    if (d.IsDeleted === 1 || d.IsDeleted === true || String(d.IsDeleted).toLowerCase() === 'true') return false;
    return true;
  });

  const nameGroups = new Map();
  validEtudiants.forEach(d => {
    const normNom = (d.Nom || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normPrenom = (d.Prenom || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const key = normNom + '_' + normPrenom;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key).push(d);
  });

  const fetchedPlayers = [];
  nameGroups.forEach((group, key) => {
    const primaryRecord = group[0];
    const isAlumni = group.some(g => g.EstAlumni === true || g.EstAlumni === 1 || String(g.EstAlumni).toLowerCase() === 'true' || String(g.StatutJoueur).toLowerCase() === 'alumni');
    const isAbandon = group.some(g => g.Abandon === true || g.Abandon === 1 || String(g.Abandon).toLowerCase() === 'true' || String(g.StatutJoueur).toLowerCase().includes('abandon'));
    const isInactive = group.every(g => g.Actif === false || g.Actif === 0 || String(g.Actif).toLowerCase() === 'false' || String(g.StatutJoueur).toLowerCase().includes('inactif'));
    const isBlesse = group.some(g => String(g.StatutJoueur).toLowerCase().includes('bless'));
    const isSuspendu = group.some(g => String(g.StatutJoueur).toLowerCase().includes('suspend'));

    let playerStatus = 'actif';
    const savedPlayerStatus = String(primaryRecord.StatutJoueur || '').trim().toLowerCase();

    if (isAlumni) { playerStatus = 'alumni'; }
    else if (isAbandon) { playerStatus = 'abandonne'; }
    else if (isInactive) { playerStatus = 'inactif'; }
    else if (isBlesse) { playerStatus = 'blesse'; }
    else if (isSuspendu) { playerStatus = 'suspendu'; }
    else if (savedPlayerStatus && ['actif', 'inactif', 'blesse', 'suspendu', 'abandonne', 'alumni'].includes(savedPlayerStatus)) { playerStatus = savedPlayerStatus; }

    let finalStatutJoueur = savedPlayerStatus || undefined;

    if (finalStatutJoueur && ['actif', 'inactif', 'blesse', 'suspendu', 'abandonne', 'alumni'].includes(finalStatutJoueur.toLowerCase())) {
      playerStatus = finalStatutJoueur.toLowerCase();
      finalStatutJoueur = undefined;
    }

    fetchedPlayers.push({ nom: primaryRecord.Nom, prenom: primaryRecord.Prenom, statut: playerStatus, statutJoueur: finalStatutJoueur });
  });

  console.log('Total:', fetchedPlayers.length);
  console.log('Alumni:', fetchedPlayers.filter(p => p.statut === 'alumni').length);
  console.log('Actif:', fetchedPlayers.filter(p => p.statut === 'actif').length);
  console.log('Inactif:', fetchedPlayers.filter(p => p.statut === 'inactif').length);
}

test();
