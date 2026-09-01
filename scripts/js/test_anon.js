const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('player_registrations').select('*');
  console.log('player_registrations anon fetch:', data);
  if (error) console.log('error:', error);
}

check();
