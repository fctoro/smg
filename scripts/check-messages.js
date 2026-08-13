const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkMessages() {
  const { data, error } = await supabase.from("site_messages").select("id");
  console.log("Total site_messages count:", data ? data.length : "error", error);
}
checkMessages();
