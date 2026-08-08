const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xsfmhqdgqowgfoppohan:Fulmounproduction@2012!@aws-1-us-west-2.pooler.supabase.com:6543/postgres',
});

async function check() {
  try {
    await client.connect();
    let res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name ILIKE '%etudiants%'
    `);
    console.log('Columns in tables matching %etudiants%:');
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

    res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name ILIKE '%player_registration_documents%'
    `);
    console.log('\nColumns in tables matching %player_registration_documents%:');
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
