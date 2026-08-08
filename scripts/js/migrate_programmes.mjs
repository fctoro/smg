import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function determineSeason(dateStr, sessionName) {
    // 1. Try to extract year from name if obvious
    const yearMatch = sessionName.match(/20\d{2}/);
    let extractedYear = null;
    if (yearMatch) {
        extractedYear = parseInt(yearMatch[0], 10);
    }
    
    // 2. Use DateDebut if available
    if (dateStr) {
        const dt = new Date(dateStr);
        if (!isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = dt.getMonth() + 1; // 1-12
            // If before August, belongs to (y-1)-y season. If August+, belongs to y-(y+1)
            let startYear = y;
            if (m < 8) {
                startYear = y - 1;
            }
            const endYear = startYear + 1;
            return String(startYear).substring(2,4) + String(endYear).substring(2,4);
        }
    }
    
    // 3. Fallback to extracted year from name
    if (extractedYear) {
        // Assume summer camp e.g. "ETE 2024" => belongs to 2324 or 2425?
        // Standardize: year -> year + (year+1)
        return String(extractedYear).substring(2,4) + String(extractedYear + 1).substring(2,4);
    }
    
    // Default fallback
    return "2425";
}

async function main() {
    console.log("Fetching sessions...");
    const { data: sessions, error: sessionErr } = await supabase.from('tblSessions').select('*');
    if (sessionErr) throw sessionErr;

    console.log("Fetching inscriptions...");
    const { data: inscriptions, error: inscriptErr } = await supabase.from('tblInscriptions').select('SessionId, EtudiantId');
    if (inscriptErr) throw inscriptErr;

    // Filter out true seasons and any string containing "saison" (case insensitive)
    const programs = sessions.filter(s => {
        if (!s.Session) return false;
        if (s.Session.toLowerCase().includes('saison')) return false;
        
        // Exclude generic format 2425 or 2024-2025
        const normalSeasonRegex = /^(?:20)?\d{2}[-/]?(?:20)?\d{2}$|^\d{4}$/;
        if (normalSeasonRegex.test(s.Session)) return false;

        return true;
    });

    console.log(`Found ${programs.length} programs to migrate.`);

    for (const prog of programs) {
        const saison = determineSeason(prog.DateDebut, prog.Session);
        
        // Find all EtudiantIDs for this session
        const relatedInscriptions = inscriptions.filter(i => i.SessionId === prog.SessionId);
        // Convert to string IDs to match frontend requirements
        const joueurs = relatedInscriptions.map(i => String(i.EtudiantId));

        // Default Date (if null)
        const dtProg = prog.DateDebut || new Date().toISOString().split('T')[0];
        
        // Default Categorie based on name
        let categorie = "Toutes catégories";
        if (prog.Session.toLowerCase().includes("ti toro")) categorie = "Ti Toro";
        else if (prog.Session.toLowerCase().includes("girl")) categorie = "Féminin";

        const { error: insertErr } = await supabase.from('programmes_match').insert({
            nom: prog.Session,
            date_programme: dtProg.split('T')[0], // YYYY-MM-DD
            saison: saison,
            categorie: categorie,
            joueurs: joueurs
        });

        if (insertErr) {
            console.error(`Failed to insert ${prog.Session}:`, insertErr);
        } else {
            console.log(`Successfully migrated: ${prog.Session} (Saison: ${saison}, Joueurs: ${joueurs.length})`);
        }
    }
    
    console.log("Migration complete!");
}

main();
