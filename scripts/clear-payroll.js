const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

// Fix for Node < 22 not having global WebSocket
global.WebSocket = require("ws");

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearPayroll() {
  console.log("Deleting all records from tblPayroll...");
  const { data, error } = await supabase.from("tblPayroll").delete().neq('Id', 0);
  if (error) {
    console.error("Error deleting payrolls:", error.message);
  } else {
    console.log("Done deleting payrolls.");
  }
}

clearPayroll();
