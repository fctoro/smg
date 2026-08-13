const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testDeduplication() {
  const fetchAll = async (table) => {
    let allData = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from(table).select("*").range(from, from + step - 1);
      if (error) break;
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
      } else {
        break;
      }
    }
    return allData;
  };

  const [siteData, detectionData] = await Promise.all([
    fetchAll("site_messages"),
    fetchAll("detection_registrations")
  ]);

  console.log("Raw site_messages detection count:", siteData.filter(m => m.type === "detection").length);
  console.log("Raw detection_registrations count:", detectionData.length);

  // We only use detection_registrations for detections, plus any site_messages detection that isn't in detection_registrations
  const detectionMap = new Map();

  // First add detection_registrations
  detectionData.forEach(d => {
    const childFullName = `${d.prenom || ''} ${d.nom || ''}`.trim().toLowerCase();
    const dob = d.date_naissance || "";
    const email = (d.email || d.parent_email || "").toLowerCase().trim();
    const num = d.numero_detection || "";

    // Key for deduplication
    const key = num ? `num_${num}` : `${childFullName}_${dob}_${email}`;

    if (!detectionMap.has(key)) {
      detectionMap.set(key, d);
    }
  });

  console.log("Deduplicated detection count:", detectionMap.size);
}

testDeduplication();
