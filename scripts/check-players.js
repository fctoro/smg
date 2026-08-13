const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkPlayers() {
  let { data, error } = await supabase.from("tblEtudiants").select("*");
  console.log("Total records:", data.length);
  
  let valid = data.filter(d => {
    const nom = (d.Nom || "").toLowerCase().trim();
    const prenom = (d.Prenom || "").toLowerCase().trim();
    if (!nom) return false;
    if (d.IsDeleted === 1 || d.IsDeleted === true || String(d.IsDeleted).toLowerCase() === "true") return false;
    if (nom.includes("sponsor")) return false;
    if (/^x+$/i.test(nom)) return false;
    if (nom === "test") return false;
    if (/^x+$/i.test(prenom)) return false;
    return true;
  });
  console.log("Valid records:", valid.length);
  
  const nameGroups = new Map();
  valid.forEach((d) => {
    const normNom = (d.Nom || "").trim().toLowerCase().replace(/\s+/g, " ");
    const normPrenom = (d.Prenom || "").trim().toLowerCase().replace(/\s+/g, " ");
    const key = `${normNom}_${normPrenom}`;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key).push(d);
  });
  console.log("Grouped players:", nameGroups.size);
}
checkPlayers();
