const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://efyjemzzapcrluqydwzj.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWplbXp6YXBjcmx1cXlkd3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NzkzNCwiZXhwIjoyMTAwMTUzOTM0fQ.L6XyU7__o4qwEkfd2rTXiwAzwgYxm5jhAyMf4lY-W00'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getCols(table) {
  const { data, error } = await supabase.rpc('get_columns_for_table', { p_table_name: table })
  // if no rpc, we just select 1 row
  const { data: d2, error: e2 } = await supabase.from(table).select('*').limit(1)
  console.log('Columns for', table, ':', Object.keys(d2[0] || {}))
}

getCols('detection_registrations').then(() => getCols('player_registrations')).catch(console.error)
