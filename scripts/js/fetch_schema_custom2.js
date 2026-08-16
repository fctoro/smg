require('dotenv').config({ path: '../../.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
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
