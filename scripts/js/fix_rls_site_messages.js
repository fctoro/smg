require('dotenv').config({ path: '../../.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    await client.query(`
      CREATE POLICY "Allow public update site_messages" 
      ON site_messages FOR UPDATE TO anon USING (true);
    `);
    console.log('UPDATE policy added for site_messages');
    
    await client.query(`
      CREATE POLICY "Allow public delete site_messages" 
      ON site_messages FOR DELETE TO anon USING (true);
    `);
    console.log('DELETE policy added for site_messages');
  } catch(e) {
    console.log(e.message);
  } finally {
    await client.end();
  }
}
run();
