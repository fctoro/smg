const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xsfmhqdgqowgfoppohan:Fulmounproduction@2012!@aws-1-us-west-2.pooler.supabase.com:6543/postgres',
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
