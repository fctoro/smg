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
      WHERE table_name = 'tblEtudiants' OR table_name = 'tbletudiants' OR table_name = '"tblEtudiants"'
    `);
    console.log('Columns in tblEtudiants:');
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
