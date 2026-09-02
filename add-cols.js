const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
