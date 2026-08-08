const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM auth.users WHERE email = 'footballclubtoro@gmail.com'");
  console.log(res.rows[0]);
  
  const idRes = await client.query("SELECT * FROM auth.identities WHERE user_id = $1", [res.rows[0].id]);
  console.log('identities:', idRes.rows.length);
  
  await client.end();
}
run();
