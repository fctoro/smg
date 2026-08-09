require("dotenv").config({ path: ".env.local" });

async function checkSchema() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(url, { headers: { apikey: key } });
  const data = await res.json();
  const eventsSchema = data.definitions.tblEvenements;
  console.log("tblEvenements properties:", Object.keys(eventsSchema.properties));
}

checkSchema();
