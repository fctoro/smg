const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectTypes() {
  let allData = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from("site_messages").select("*").range(from, from + step - 1);
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

  const counts = {};
  allData.forEach(m => {
    counts[m.type] = (counts[m.type] || 0) + 1;
  });

  console.log("Types breakdown in site_messages:", counts);
  console.log("Total site_messages in DB:", allData.length);
}

inspectTypes();
