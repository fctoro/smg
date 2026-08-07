import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Try to load .env.local first, then .env
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching players...");
    let allData = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabase.from('tblEtudiants').select('*').range(from, from + step - 1);
        if (error) {
            console.error("Error fetching:", error);
            break;
        }
        if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }
    
    console.log(`Total rows fetched from tblEtudiants: ${allData.length}`);
    
    // Filter out invalid/deleted just like the app does
    const validEtudiants = allData.filter(d => {
        const nom = (d.Nom || "").toLowerCase().trim();
        const prenom = (d.Prenom || "").toLowerCase().trim();
        if (!nom) return false;
        if (d.IsDeleted === 1 || d.IsDeleted === true || String(d.IsDeleted).toLowerCase() === "true") return false;
        if (nom.includes("sponsor")) return false;
        if (/^x+$/i.test(nom)) return false;
        if (nom === "test") return false;
        if (/^x+$/i.test(prenom)) return false;
        return true;
    });

    console.log(`Total valid players: ${validEtudiants.length}`);
    
    const statuses = {};
    const categories = {};
    
    validEtudiants.forEach(d => {
        // Status mapping
        const allValuesStr = JSON.stringify(Object.values(d)).toLowerCase();
        let status = "Actif";
        if (d.EstAlumni === true || d.EstAlumni === 1 || String(d.EstAlumni) === "true") {
            status = "Alumni";
        } else if (
            allValuesStr.includes("abandon") ||
            allValuesStr.includes("quitt") ||
            allValuesStr.includes("déménag") ||
            allValuesStr.includes("demenag") ||
            allValuesStr.includes("inactif") ||
            d.Actif === false || d.Actif === 0 ||
            d.Abandon === true || d.Abandon === 1
        ) {
            status = "Abandonné";
        } else if (allValuesStr.includes("bless")) {
            status = "Blessé";
        } else if (allValuesStr.includes("suspend")) {
            status = "Suspendu";
        }
        
        statuses[status] = (statuses[status] || 0) + 1;
        
        // Category mapping
        const rawCat = (d.Categorie || d.categorie || d.Category || d.category || "").toString().trim().toLowerCase();
        let cat = "Non définie";
        if (rawCat) {
            cat = rawCat.toUpperCase();
        } else {
            // Very rough fallback
            cat = "Sans catégorie";
        }
        
        categories[cat] = (categories[cat] || 0) + 1;
    });

    console.log("\n=== COMPTE RENDU DES JOUEURS ===");
    console.log(`\nStatuts (${validEtudiants.length} joueurs):`);
    Object.entries(statuses).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => console.log(`- ${k}: ${v}`));
    
    console.log(`\nCatégories principales (Top 10):`);
    Object.entries(categories).sort((a,b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`- ${k}: ${v}`));
}

main();
