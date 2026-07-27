const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const userId = '8c2acb98-06fd-42f1-a8a5-4856b0fd663a';
  const email = 'footballclubtoro@gmail.com';
  
  const idRes = await client.query("SELECT * FROM auth.identities WHERE user_id = $1", [userId]);
  if (idRes.rows.length === 0) {
      console.log('Inserting identity...');
      const identityId = (await client.query('SELECT gen_random_uuid() as id')).rows[0].id;
      const identityData = { sub: userId, email: email };
      
      await client.query(`
        INSERT INTO auth.identities (
          id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'email', now(), now(), now()
        )
      `, [identityId, userId, email, identityData]);
      console.log('Identity inserted!');
  } else {
      console.log('Identity already exists!');
  }
  
  await client.end();
}
run();
