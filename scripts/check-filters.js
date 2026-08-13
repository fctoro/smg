const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

global.WebSocket = require("ws");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkFetchedPlayers() {
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

  const etudiantsData = await fetchAll("tblEtudiants");
  console.log("Total etudiants:", etudiantsData.length);

  const validEtudiants = etudiantsData.filter((d) => {
    const nom = (d.Nom || "").toLowerCase().trim();
    const prenom = (d.Prenom || "").toLowerCase().trim();
    if (!nom) return false;
    if (nom.includes("eugene") && prenom.includes("kensly")) return false;
    if (nom.includes("kensly") && prenom.includes("eugene")) return false;
    if (d.IsDeleted === 1 || d.IsDeleted === true || String(d.IsDeleted).toLowerCase() === "true") return false;
    if (nom.includes("sponsor")) return false;
    if (/^x+$/i.test(nom)) return false;
    if (nom === "test") return false;
    if (/^x+$/i.test(prenom)) return false;
    return true;
  });
  
  const nameGroups = new Map();
  validEtudiants.forEach((d) => {
    const normNom = (d.Nom || "").trim().toLowerCase().replace(/\s+/g, " ");
    const normPrenom = (d.Prenom || "").trim().toLowerCase().replace(/\s+/g, " ");
    const key = `${normNom}_${normPrenom}`;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key).push(d);
  });
  
  let fetchedPlayersCount = 0;
  let activeCount = 0;
  
  nameGroups.forEach((group) => {
    fetchedPlayersCount++;
    const primaryRecord = group[0];
    const savedPlayerStatus = String(primaryRecord.StatutJoueur || "").trim().toLowerCase();
    
    let playerStatus = "actif";
    const isAlumni = group.some(g => g.EstAlumni === true || g.EstAlumni === 1 || String(g.EstAlumni).toLowerCase() === "true" || String(g.StatutJoueur).toLowerCase() === "alumni");
    const isAbandon = group.some(g => g.Abandon === true || g.Abandon === 1 || String(g.Abandon).toLowerCase() === "true" || String(g.StatutJoueur).toLowerCase().includes("abandon"));
    const isInactive = group.some(g => g.Actif === false || g.Actif === 0 || String(g.Actif).toLowerCase() === "false" || String(g.StatutJoueur).toLowerCase().includes("inactif"));
    
    if (isAlumni) playerStatus = "alumni";
    else if (isAbandon) playerStatus = "abandonne";
    else if (isInactive) playerStatus = "inactif";
    
    if (playerStatus !== "alumni") {
      activeCount++;
    }
  });
  
  console.log("Fetched players:", fetchedPlayersCount);
  console.log("Active (non-alumni) players:", activeCount);
}
checkFetchedPlayers();
