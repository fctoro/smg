const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xsfmhqdgqowgfoppohan:Fulmounproduction@2012!@aws-1-us-west-2.pooler.supabase.com:6543/postgres',
});

async function run() {
  try {
    await client.connect();
    // Enable RLS and create policy for player_registrations
    await client.query(`
      CREATE POLICY "Allow public read player_registrations" 
      ON player_registrations FOR SELECT TO anon USING (true);
    `);
    console.log('Policy added for player_registrations');
  } catch(e) {
    console.log(e.message);
  } finally {
    await client.end();
  }
}
run();
