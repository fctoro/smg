import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import WebSocket from 'ws';

global.WebSocket = WebSocket;

if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Erreur: Variables d'environnement manquantes.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getSeasonCodeFromSeasonStr(seasonStr) {
    if (!seasonStr) return null;
    const parts = seasonStr.split("-");
    if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
        return `${parts[0].substring(2, 4)}${parts[1].substring(2, 4)}`;
    }
    return null;
}

function getSeasonFromDate(dateStr) {
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
    console.log("=== Correction des Matricules par Première Saison ===");

    // Fetch Sessions
    let allSessions = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('tblSessions').select('*').range(from, from + step - 1);
        if (error || !data || data.length === 0) break;
        allSessions = [...allSessions, ...data];
        if (data.length < step) break;
        from += step;
    }

    const sessionsMap = new Map();
    allSessions.forEach(s => {
        let seasonLabel = "";
        if (s.Session && s.Session.trim() !== "") {
            seasonLabel = s.Session.trim();
        } else if (s.DateDebut && s.DateFin) {
            const startYear = new Date(s.DateDebut).getFullYear();
            const endYear = new Date(s.DateFin).getFullYear();
            if (startYear === endYear) {
                const month = new Date(s.DateDebut).getMonth() + 1;
                seasonLabel = month >= 7 ? `${startYear}-${startYear + 1}` : `${startYear - 1}-${startYear}`;
            } else {
                seasonLabel = `${startYear}-${endYear}`;
            }
        }
        sessionsMap.set(s.SessionId, seasonLabel);
    });

    // Fetch Inscriptions
    let allInscriptions = [];
    from = 0;
    while (true) {
        const { data, error } = await supabase.from('tblInscriptions').select('*').range(from, from + step - 1);
        if (error || !data || data.length === 0) break;
        allInscriptions = [...allInscriptions, ...data];
        if (data.length < step) break;
        from += step;
    }

    // Fetch Players
    let allPlayers = [];
    from = 0;
    while (true) {
        const { data, error } = await supabase.from('tblEtudiants').select('*').range(from, from + step - 1);
        if (error) {
            console.error("Erreur Fetch Players:", error);
            break;
        }
        if (!data || data.length === 0) break;
        allPlayers = [...allPlayers, ...data];
        if (data.length < step) break;
        from += step;
    }

    console.log(`Total joueurs à analyser: ${allPlayers.length}`);

    let updateCount = 0;
    const batchUpdates = [];

    for (const p of allPlayers) {
        // Find inscriptions for this student and sort ASCENDING (first season)
        const studentInscriptions = allInscriptions
            .filter(i => i.EtudiantId === p.EtudiantID)
            .sort((a, b) => new Date(a.DateInscription || 0).getTime() - new Date(b.DateInscription || 0).getTime());

        let sCode = null;

        if (studentInscriptions.length > 0) {
            const firstSessionId = studentInscriptions[0].SessionId;
            const firstSeasonStr = sessionsMap.get(firstSessionId);
            sCode = getSeasonCodeFromSeasonStr(firstSeasonStr);
        }

        if (!sCode && p.DtCreation) {
            sCode = getSeasonFromDate(p.DtCreation);
        }

        if (!sCode && p.Saison) {
            sCode = getSeasonCodeFromSeasonStr(p.Saison);
        }

        if (!sCode) {
            sCode = "2526"; // Fallback default
        }

        const paddedId = String(p.EtudiantID).padStart(4, "0");
        const correctMatricule = `FCT-${sCode}-${paddedId}`;

        if (p.Matricule !== correctMatricule) {
            batchUpdates.push({ EtudiantID: p.EtudiantID, Matricule: correctMatricule, oldMatricule: p.Matricule });
        }
    }

    console.log(`Nombre de matricules à corriger dans Supabase: ${batchUpdates.length}`);

    for (let i = 0; i < batchUpdates.length; i++) {
        const item = batchUpdates[i];
        const { error } = await supabase
            .from('tblEtudiants')
            .update({ Matricule: item.Matricule })
            .eq('EtudiantID', item.EtudiantID);

        if (error) {
            console.error(`Erreur update ID ${item.EtudiantID}:`, error.message);
        } else {
            updateCount++;
            if (i < 10 || i % 100 === 0) {
                console.log(`[${i+1}/${batchUpdates.length}] Mis à jour ID ${item.EtudiantID}: ${item.oldMatricule} -> ${item.Matricule}`);
            }
        }
    }

    console.log(`=== Terminé ! ${updateCount} matricules corrigés en base de données. ===`);
}

main();
