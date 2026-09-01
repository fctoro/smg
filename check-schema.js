const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getCols(table) {
  const { data, error } = await supabase.rpc('get_columns_for_table', { p_table_name: table })
  // if no rpc, we just select 1 row
  const { data: d2, error: e2 } = await supabase.from(table).select('*').limit(1)
  console.log('Columns for', table, ':', Object.keys(d2[0] || {}))
}

getCols('detection_registrations').then(() => getCols('player_registrations')).catch(console.error)
