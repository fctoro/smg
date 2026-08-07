const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xsfmhqdgqowgfoppohan:Fulmounproduction@2012!@aws-1-us-west-2.pooler.supabase.com:6543/postgres',
});

async function check() {
  try {
    await client.connect();
    let res = await client.query(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables 
      WHERE table_name ILIKE '%etudiant%'
    `);
    console.log('Tables matching %etudiant%:');
    console.log(res.rows);
    
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
