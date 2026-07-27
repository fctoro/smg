const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'footballclubtoro@gmail.com',
    password: 'MachesuyoToro#2026,'
  });

  if (error) {
    console.error('Login failed:', error);
  } else {
    console.log('Login success:', data.user.id);
  }
}
testLogin();
