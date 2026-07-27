const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://efyjemzzapcrluqydwzj.supabase.co', 'sb_publishable_XpkWIeELVcJ3Ez3nk2PHjQ__cjeOpIZ');

async function test() {
  const { data: mData, error: mErr } = await supabase.from('site_messages').select('*').limit(1);
  console.log('site_messages:', mErr || mData);

  const { data: pData, error: pErr } = await supabase.from('player_registrations').select('*').limit(1);
  console.log('player_registrations:', pErr || pData);
}

test();
