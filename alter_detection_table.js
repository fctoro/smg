const { Pool } = require("pg");

async function alterTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await pool.query(`
      ALTER TABLE detection_registrations 
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'nouveau',
      ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
    `);
    console.log("Table altered successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

alterTable();
