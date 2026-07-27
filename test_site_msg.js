const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xsfmhqdgqowgfoppohan:Fulmounproduction@2012!@aws-1-us-west-2.pooler.supabase.com:6543/postgres',
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
