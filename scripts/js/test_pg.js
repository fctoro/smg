require('dotenv').config({ path: '../../.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM player_registrations');
    console.log('player_registrations direct query:', res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
