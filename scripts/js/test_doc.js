const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('player_registration_documents').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Doc data type:', typeof data[0].data);
    if (typeof data[0].data === 'string') {
      console.log('Doc data starts with:', data[0].data.substring(0, 20));
    }
    console.log('Doc path:', data[0].path);
  } else {
    console.log('No documents found or error', error);
  }
}
check();
