const fs = require('fs');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    const sql = fs.readFileSync('supabase_rbac_migration.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error applying migration:', err.message);
  } finally {
    await client.end();
  }
}

run();
