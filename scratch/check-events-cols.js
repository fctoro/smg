require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addCreatedBy() {
  console.log("Adding created_by to tblEvenements...");
  // Use RPC to execute SQL if possible, or we can just fetch one row to see if created_by exists
  const { data, error } = await supabase.from("tblEvenements").select("*").limit(1);
  if (error) {
    console.error("Error fetching events:", error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    console.log("Table is empty or columns hidden, attempting to insert a test event with created_by");
  }
}

addCreatedBy();
