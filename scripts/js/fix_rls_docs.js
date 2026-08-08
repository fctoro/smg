const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xsfmhqdgqowgfoppohan:Fulmounproduction@2012!@aws-1-us-west-2.pooler.supabase.com:6543/postgres',
});

async function run() {
  try {
    await client.connect();
    await client.query(`
      CREATE POLICY "Allow public read player_registration_documents" 
      ON player_registration_documents FOR SELECT TO anon USING (true);
    `);
    console.log('Policy added for player_registration_documents');
  } catch(e) {
    console.log(e.message);
  } finally {
    await client.end();
  }
}
run();
