require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from("tblEvenements").insert([
    {
      titre: "Test Event",
      date: new Date().toISOString(),
      lieu: "Test",
      type: "Entraînement",
      created_by: "system@test.com"
    }
  ]).select();
  
  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log("Success:", data);
    await supabase.from("tblEvenements").delete().eq("id", data[0].id);
  }
}

testInsert();
