require('dotenv').config({ path: '../../.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log('Tables in new DB:');
    res.rows.forEach(r => console.log('-', r.table_name));
    
    // Check if site_messages has data
    if (res.rows.find(r => r.table_name === 'site_messages')) {
        const countRes = await client.query('SELECT COUNT(*) FROM site_messages');
        console.log('site_messages count:', countRes.rows[0].count);
    } else {
        console.log('site_messages table NOT FOUND in this DB!');
    }
  } catch(e) {
    console.log('Error:', e.message);
  } finally {
    await client.end();
  }
}
run();
