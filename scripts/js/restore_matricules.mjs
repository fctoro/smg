import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function extractSeasonCode(seasonStr) {
    if (!seasonStr) return null;
    const cleanSeason = String(seasonStr).trim();
    
    // Format complet: "2018-2019"
    const matchFull = cleanSeason.match(/20(\d{2})[-/]?20(\d{2})/);
    if (matchFull) return `${matchFull[1]}${matchFull[2]}`;
    
    // Format court: "1819", "2627", "2021"
    if (/^\d{4}$/.test(cleanSeason)) return cleanSeason;
    
    // Format partiel: "18/19", "18-19"
    const matchPartial = cleanSeason.match(/(\d{2})[-/](\d{2})/);
    if (matchPartial) return `${matchPartial[1]}${matchPartial[2]}`;
    
    return null;
}

function extractSeasonCodeFromDate(dateStr) {
    if (!dateStr) return null;
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    let startYear, endYear;
    if (m >= 7) {
        startYear = y;
        endYear = y + 1;
    } else {
        startYear = y - 1;
        endYear = y;
    }
    return `${String(startYear).substring(2, 4)}${String(endYear).substring(2, 4)}`;
}

async function main() {
    console.log("Fetching players...");
    let allPlayers = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('tblEtudiants').select('*').range(from, from + step - 1);
        if (error) {
            console.error("Error fetching players", error);
            break;
        }
        if (data && data.length > 0) {
            allPlayers = [...allPlayers, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }
    
    console.log(`Found ${allPlayers.length} total players.`);
    
    let updates = [];
    
    for (const p of allPlayers) {
        let bestSeasonCode = extractSeasonCode(p.Saison);
        
        // S'il n'y a pas de saison claire en base, on tente de la déduire de la date de création ou d'inscription
        if (!bestSeasonCode && p.DateInscription) {
            bestSeasonCode = extractSeasonCodeFromDate(p.DateInscription);
        }
        if (!bestSeasonCode && p.DtCreation) {
            bestSeasonCode = extractSeasonCodeFromDate(p.DtCreation);
        }
        
        if (bestSeasonCode) {
            const numId = String(p.EtudiantID).replace(/\D/g, "") || String(p.EtudiantID);
            const paddedId = String(numId).padStart(4, "0");
            const expectedMatricule = `FCT-${bestSeasonCode}-${paddedId}`;
            
            // Si le matricule en base de données est incorrect ou s'il commence par l'année actuelle par erreur
            if (p.matricule !== expectedMatricule) {
                updates.push({
                    EtudiantID: p.EtudiantID,
                    nom: p.Nom,
                    prenom: p.Prenom,
                    oldMatricule: p.matricule,
                    newMatricule: expectedMatricule
                });
            }
        }
    }

    console.log(`Found ${updates.length} players to restore matricule.`);
    
    // Batch update
    let count = 0;
    for (const update of updates) {
        count++;
        console.log(`[${count}/${updates.length}] Restoring ${update.prenom} ${update.nom}: ${update.oldMatricule} -> ${update.newMatricule}`);
        
        const { error } = await supabase
            .from('tblEtudiants')
            .update({ matricule: update.newMatricule })
            .eq('EtudiantID', update.EtudiantID);
            
        if (error) {
            console.error(`Error updating player ${update.EtudiantID}:`, error);
        }
    }
    
    console.log("Restoration complete!");
}

main();
