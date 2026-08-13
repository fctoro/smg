const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listDetections() {
  let allData = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from("site_messages").select("*").range(from, from + step - 1);
    if (error) break;
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < step) break;
      from += step;
    } else {
      break;
    }
  }

  const detections = allData.filter(m => m.type === "detection");
  console.log("Total detections:", detections.length);
  detections.forEach((d, i) => {
    const p = d.payload || {};
    const name = `${p.prenom || p.child_first_name || ''} ${p.nom || p.child_last_name || ''}`.trim() || d.name;
    console.log(`${i+1}. ID: ${d.id} | Name: ${name} | Email: ${d.email} | Status: ${d.status} | IsRead: ${d.is_read}`);
  });
}

listDetections();
