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
    let allData = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('tblEtudiants').select('DtCreation, DateNaissance').range(from, from + step - 1);
        if (error) break;
        if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }
    
    // Find latest DtCreation
    const dates = allData.map(d => new Date(d.DtCreation)).filter(d => !isNaN(d.getTime()));
    const maxDate = new Date(Math.max.apply(null, dates));
    const minDate = new Date(Math.min.apply(null, dates));
    
    console.log("=== ANNEES D'INSCRIPTION (DtCreation) ===");
    console.log(`Première inscription : ${minDate.getFullYear()}`);
    console.log(`Dernière inscription : ${maxDate.getFullYear()} (Date exacte: ${maxDate.toISOString()})`);
    
    // Find latest birth year
    const birthDates = allData.map(d => new Date(d.DateNaissance)).filter(d => !isNaN(d.getTime()));
    const maxBirthDate = new Date(Math.max.apply(null, birthDates));
    const minBirthDate = new Date(Math.min.apply(null, birthDates));
    
    console.log("\n=== ANNEES DE NAISSANCE ===");
    console.log(`Joueur le plus âgé né en : ${minBirthDate.getFullYear()}`);
    console.log(`Joueur le plus jeune né en : ${maxBirthDate.getFullYear()}`);
}
main();
