import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCreate() {
  console.log("Starting user creation at", new Date().toISOString());
  const start = Date.now();
  
  const email = \	est_coach_\@fctoro.club\;
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { full_name: 'Test Coach', role: 'Coach' }
  });
  
  console.log("Finished at", new Date().toISOString());
  console.log(\Took \ ms\);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! User ID:", data?.user?.id);
    await supabase.auth.admin.deleteUser(data.user.id);
  }
}
testCreate();
