require('dotenv').config({ path: '../../.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'site_messages';
    `);
    console.log('Realtime for site_messages:', res.rows.length > 0 ? 'ENABLED' : 'DISABLED');
    
    if (res.rows.length === 0) {
      console.log('Enabling realtime for site_messages...');
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE site_messages;`);
      console.log('Done.');
    }
  } catch(e) {
    console.log(e.message);
  } finally {
    await client.end();
  }
}
run();
