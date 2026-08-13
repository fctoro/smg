const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkAlumni() {
  let { data, error } = await supabase.from("tblEtudiants").select("*");
  let valid = data.filter(d => {
    const nom = (d.Nom || "").toLowerCase().trim();
    if (!nom) return false;
    if (d.IsDeleted === 1 || d.IsDeleted === true || String(d.IsDeleted).toLowerCase() === "true") return false;
    if (nom.includes("sponsor")) return false;
    return true;
  });
  
  let alumniCount = 0;
  valid.forEach(g => {
    const isAlumni = g.EstAlumni === true || g.EstAlumni === 1 || String(g.EstAlumni).toLowerCase() === "true" || String(g.StatutJoueur).toLowerCase() === "alumni";
    if (isAlumni) alumniCount++;
  });
  
  console.log("Alumni count:", alumniCount);
}
checkAlumni();
