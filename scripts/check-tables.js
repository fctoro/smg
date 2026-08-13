const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // try querying pg_catalog or information_schema directly via REST if possible, but PostgREST doesn't expose it directly unless configured.
    console.log("Cannot list tables directly without a function. Trying a known table trick...");
  } else {
    console.log("Tables:", data);
  }
}
checkTables();
