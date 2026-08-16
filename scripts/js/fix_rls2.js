require('dotenv').config({ path: '../../.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    
    // Add policies for other tables if they exist
    const tables = ['fan_registrations', 'stage_applications', 'site_messages'];
    for (const table of tables) {
      try {
        await client.query(`
          CREATE POLICY "Allow public read ${table}" 
          ON ${table} FOR SELECT TO anon USING (true);
        `);
        console.log('Policy added for', table);
      } catch (e) {
        console.log('Skipping', table, '-', e.message);
      }
    }
  } catch(e) {
    console.log(e.message);
  } finally {
    await client.end();
  }
}
run();
