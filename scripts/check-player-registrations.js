const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPlayerRegistrations() {
  let allData = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from("player_registrations").select("*").range(from, from + step - 1);
    if (error) {
      console.error("Error:", error);
      break;
    }
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < step) break;
      from += step;
    } else {
      break;
    }
  }
  
  console.log("Total player_registrations count:", allData.length);
  
  const clito = allData.filter(m => JSON.stringify(m).toLowerCase().includes("clito") || JSON.stringify(m).toLowerCase().includes("cliteau"));
  console.log("Registrations containing clito/cliteau:", clito.length);
  if (clito.length > 0) {
    console.log("First clito record:", JSON.stringify(clito[0]).substring(0, 200));
  }
}
checkPlayerRegistrations();
