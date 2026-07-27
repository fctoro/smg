const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xsfmhqdgqowgfoppohan:Fulmounproduction@2012!@aws-1-us-west-2.pooler.supabase.com:6543/postgres',
});

async function check() {
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM player_registrations');
    console.log('player_registrations direct query:', res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
