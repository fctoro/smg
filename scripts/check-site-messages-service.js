const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSiteMessages() {
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
  
  console.log("Total site_messages count:", allData.length);
  
  const detectionMessages = allData.filter(m => m.type === "detection");
  console.log("Total detection messages:", detectionMessages.length);
  console.log("New detection messages:", detectionMessages.filter(m => !m.is_read).length);
  
  const inscriptionMessages = allData.filter(m => m.type === "joueur");
  console.log("Total inscription messages:", inscriptionMessages.length);
  console.log("New inscription messages:", inscriptionMessages.filter(m => !m.is_read).length);

  const clito = allData.filter(m => JSON.stringify(m).toLowerCase().includes("clito") || JSON.stringify(m).toLowerCase().includes("cliteau"));
  console.log("Messages containing clito/cliteau:", clito.length);
  if (clito.length > 0) {
    console.log("Type of first clito message:", clito[0].type);
  }
}
checkSiteMessages();
