import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking DB directly...");
    const { data, error } = await supabase.from('tblEtudiants')
        .select('EtudiantID, Nom, Prenom, StatutJoueur, EstAlumni, IsDeleted')
        .eq('StatutJoueur', 'inactif')
        .limit(10);
        
    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log(`Found ${data.length} inactive players. Samples:`);
        console.log(data);
    }
}
main();
