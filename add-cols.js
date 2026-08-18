const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://efyjemzzapcrluqydwzj.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWplbXp6YXBjcmx1cXlkd3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NzkzNCwiZXhwIjoyMTAwMTUzOTM0fQ.L6XyU7__o4qwEkfd2rTXiwAzwgYxm5jhAyMf4lY-W00'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function addCols() {
  const query = `
    ALTER TABLE detection_registrations 
    ADD COLUMN IF NOT EXISTS ecole TEXT,
    ADD COLUMN IF NOT EXISTS poste_principal TEXT,
    ADD COLUMN IF NOT EXISTS poste_secondaire TEXT,
    ADD COLUMN IF NOT EXISTS club_precedent TEXT,
    ADD COLUMN IF NOT EXISTS annees_pratique TEXT;
  `
  // We can't use query directly with JS client, we must use RPC or query the postgres directly
  // Wait, I can use the same approach as `pool.query` from sitefctoro since it has pg client.
}
addCols()
