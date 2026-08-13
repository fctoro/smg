const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDuplicates() {
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

  const siteDetections = siteData.filter(m => m.type === "detection");
  console.log("Site messages detections count:", siteDetections.length);
  console.log("Detection registrations count:", detectionData.length);

  // Check overlap by email or name
  let overlapCount = 0;
  const siteEmails = new Set(siteDetections.map(m => (m.email || "").toLowerCase().trim()).filter(Boolean));
  const siteNames = new Set(siteDetections.map(m => (m.name || "").toLowerCase().trim()).filter(Boolean));

  detectionData.forEach(d => {
    const email = (d.email || d.parent_email || "").toLowerCase().trim();
    const name = `${d.prenom || ''} ${d.nom || ''}`.toLowerCase().trim();
    const parentName = (d.parent_nom || "").toLowerCase().trim();

    if ((email && siteEmails.has(email)) || (name && siteNames.has(name)) || (parentName && siteNames.has(parentName))) {
      overlapCount++;
    }
  });

  console.log("Overlap count between site_messages and detection_registrations:", overlapCount);
}

checkDuplicates();
