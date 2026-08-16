require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  client.query('ALTER TABLE "tblEtudiants" ADD COLUMN "Poste" text;').then(() => {
    console.log("Column added");
    client.end();
  }).catch(e => {
    console.log("Error adding column:", e);
    client.end();
  });
}).catch(e => console.log("Connection error:", e));

