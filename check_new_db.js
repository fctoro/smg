const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('site_messages').select('*').limit(1);
  if (error) {
    console.error('Error fetching site_messages:', error.message);
  } else {
    console.log('site_messages exists. Data length:', data.length);
  }
}
run();
