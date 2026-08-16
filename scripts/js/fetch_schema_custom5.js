require('dotenv').config({ path: '../../.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    await client.connect();
    let res = await client.query(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables 
      WHERE table_name ILIKE '%etudiant%'
    `);
    console.log('Tables matching %etudiant%:');
    console.log(res.rows);
    
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
