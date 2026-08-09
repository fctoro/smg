require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function addColumn() {
  const url = process.env.DATABASE_URL
    .replace("Fulmounproduction#2012,", encodeURIComponent("Fulmounproduction#2012,"))
    .replace(",@", "@");
    
  const client = new Client({
    connectionString: url
  });

  try {
    await client.connect();
    console.log("Connected to DB");
    
    // Add created_by column if it doesn't exist
    await client.query(`
      ALTER TABLE "tblEvenements" 
      ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
    `);
    
    console.log("Column created_by added successfully!");
    
    // Check columns
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tblEvenements';
    `);
    console.log("Columns:", res.rows.map(r => r.column_name));
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

addColumn();
