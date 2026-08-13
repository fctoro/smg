import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const coachRates = [
  { montant: 1500, label: "Week-end" },
  { montant: 1350, label: "Week-end" },
  { montant: 950, label: "Semaine" },
  { montant: 450, label: "Semaine" },
  { montant: 550, label: "Semaine" },
  { montant: 750, label: "Week-end" },
  { montant: 600, label: "Semaine" },
  { montant: 700, label: "Week-end" },
  { montant: 650, label: "Week-end" }
];

async function addRates() {
  for (const rate of coachRates) {
    const rubriqueId = `rubrique-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      id: rubriqueId,
      rubrique: `Coach: ${rate.label} (${rate.montant} HTG)`,
      montant: rate.montant,
      devise: "HTG",
      precision: `Taux par séance Coach - ${rate.label}`,
      categorie: "Payroll",
      est_adhesion: false,
      actif: true,
    };

    console.log(`Inserting ${payload.rubrique}...`);
    const { error } = await supabase.from("tblRubriques").insert(payload);
    if (error) {
      console.error("Error inserting:", error.message);
    }
  }
  console.log("Done inserting coach rates.");
}

addRates();
