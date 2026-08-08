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
    let allSessions = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('tblSessions').select('Session').range(from, from + step - 1);
        if (error) {
            console.error("Error fetching data:", error);
            break;
        }
        if (data && data.length > 0) {
            allSessions = [...allSessions, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }

    const uniqueSaisons = [...new Set(allSessions.map(p => p.Session).filter(Boolean))];
    
    // Filter out obvious seasons (like 2425, 2526, 2324, 2024-2025 etc)
    const normalSeasonRegex = /^(?:20)?\d{2}[-/]?(?:20)?\d{2}$|^\d{4}$/;
    
    const potentialProgrammes = uniqueSaisons.filter(s => !normalSeasonRegex.test(s));
    
    console.log("\n--- POTENTIAL PROGRAMMES ---");
    potentialProgrammes.forEach(p => console.log(p));
}

main();
