const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
if(urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  supabase.from('tblEtudiants').select('Nom, Prenom, Info1').then(({data, error}) => {
    if(error) console.error(error);
    else {
      console.log('Total in DB:', data.length);
      const valid = data.filter(d => {
        const nom = (d.Nom || '').toLowerCase().trim();
        const prenom = (d.Prenom || '').toLowerCase().trim();
        if (!nom) return false;
        if (nom.includes('sponsor')) return false;
        if (/^x+$/i.test(nom)) return false;
        if (nom === 'test') return false;
        if (/^x+$/i.test(prenom)) return false;
        return true;
      });
      console.log('Valid students:', valid.length);
      console.log('Sample valid students:', valid.slice(0, 5).map(v => v.Nom + ' ' + v.Prenom));
    }
  });
}
