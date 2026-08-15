const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Fulmounproduction%232012,@db.efyjemzzapcrluqydwzj.supabase.co:5432/postgres' });
client.connect().then(() => {
  client.query('ALTER TABLE "tblEtudiants" ADD COLUMN "Poste" text;').then(() => {
    console.log("Column added");
    client.end();
  }).catch(e => {
    console.log("Error adding column:", e);
    client.end();
  });
}).catch(e => console.log("Connection error:", e));
