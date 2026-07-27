const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();

    const email = 'footballclubtoro@gmail.com';
    const password = 'MachesuyoToro#2026,';

    console.log('Checking if user exists...');
    let res = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    
    let userId;
    if (res.rows.length > 0) {
      userId = res.rows[0].id;
      console.log('User already exists:', userId);
      await client.query(`
        UPDATE auth.users 
        SET encrypted_password = crypt($1, gen_salt('bf'))
        WHERE id = $2
      `, [password, userId]);
      console.log('Password updated.');
    } else {
      console.log('Creating new user...');
      res = await client.query(`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, 
          crypt($2, gen_salt('bf')), now(), 
          '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Temporaire"}', 
          now(), now()
        ) RETURNING id;
      `, [email, password]);
      userId = res.rows[0].id;
      
      const identityId = (await client.query('SELECT gen_random_uuid() as id')).rows[0].id;
      const identityData = { sub: userId, email: email };
      
      await client.query(`
        INSERT INTO auth.identities (
          id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'email', now(), now(), now()
        )
      `, [identityId, userId, email, identityData]);
      
      console.log('User created:', userId);
    }

    console.log('Upserting profile...');
    await client.query(`
      INSERT INTO public.profiles (id, full_name, role, phone)
      VALUES ($1, 'Admin Temporaire', 'Super Admin', '')
      ON CONFLICT (id) DO UPDATE SET role = 'Super Admin';
    `, [userId]);
    
    console.log('Admin user setup complete!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
