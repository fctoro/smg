const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT encrypted_password FROM auth.users WHERE email = 'footballclubtoro@gmail.com'");
  console.log(res.rows[0]);
  await client.end();
}

run();
