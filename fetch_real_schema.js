const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Fulmounproduction%232012,@db.efyjemzzapcrluqydwzj.supabase.co:5432/postgres',
});

async function check() {
  try {
    await client.connect();
    let res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name ILIKE '%etudiants%'
    `);
    console.log('Columns in tblEtudiants (real DB):');
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
