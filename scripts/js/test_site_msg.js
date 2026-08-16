require('dotenv').config({ path: '../../.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query("SELECT * FROM site_messages");
    console.log('site_messages data:', res.rows);
  } catch(e) {
    console.log(e.message);
  } finally {
    await client.end();
  }
}
run();
