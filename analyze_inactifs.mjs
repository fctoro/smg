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
    let allPlayers = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('tblEtudiants').select('*').range(from, from + step - 1);
        if (error) break;
        if (data && data.length > 0) {
            allPlayers = [...allPlayers, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }

    let allInscriptions = [];
    from = 0;
    while (true) {
        const { data, error } = await supabase.from('tblInscriptions').select('*').range(from, from + step - 1);
        if (error) break;
        if (data && data.length > 0) {
            allInscriptions = [...allInscriptions, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }

    let allPayments = [];
    from = 0;
    while (true) {
        const { data, error } = await supabase.from('tblPaiements').select('*').range(from, from + step - 1);
        if (error) break;
        if (data && data.length > 0) {
            allPayments = [...allPayments, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }

    let allSessions = [];
    from = 0;
    while (true) {
        const { data, error } = await supabase.from('tblSessions').select('*').range(from, from + step - 1);
        if (error) break;
        if (data && data.length > 0) {
            allSessions = [...allSessions, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
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

    let inactiveCount = 0;
    let cutoffYear = 2024;

    const validEtudiants = allPlayers.filter(d => {
        const nom = (d.Nom || "").toLowerCase().trim();
        const prenom = (d.Prenom || "").toLowerCase().trim();
        if (!nom) return false;
        if (d.IsDeleted === 1 || String(d.IsDeleted).toLowerCase() === "true") return false;
        if (nom.includes("sponsor")) return false;
        if (/^x+$/i.test(nom)) return false;
        if (nom === "test") return false;
        if (/^x+$/i.test(prenom)) return false;
        return true;
    });

    validEtudiants.forEach(p => {
        // Find latest inscription
        const studentInscriptions = allInscriptions.filter(i => i.EtudiantId === p.EtudiantID);
        const sortedInscriptions = [...studentInscriptions].sort((a, b) => new Date(b.DateInscription || 0).getTime() - new Date(a.DateInscription || 0).getTime());
        const latestSessionId = sortedInscriptions.length > 0 ? sortedInscriptions[0].SessionId : null;
        let playerSaison = latestSessionId != null ? sessionsMap.get(latestSessionId) : p.Saison || "";

        // Find latest payment
        const studentPayments = allPayments.filter(pay => pay.EtudiantId === p.EtudiantID);
        const sortedPayments = [...studentPayments].sort((a, b) => new Date(b.DateTransact || 0).getTime() - new Date(a.DateTransact || 0).getTime());
        const dernierPaiementDate = sortedPayments.length > 0 ? new Date(sortedPayments[0].DateTransact) : null;

        // Condition for inactive: 
        // No payment after cutoff AND (no season or season string indicates year before cutoff)
        
        let isActive = false;

        if (dernierPaiementDate && dernierPaiementDate.getFullYear() >= cutoffYear) {
            isActive = true;
        }

        // Try to extract year from saison string (e.g. "2024-2025" -> 2024)
        if (!isActive && playerSaison) {
            const matches = playerSaison.match(/\b(20\d{2})\b/g);
            if (matches) {
                const maxYear = Math.max(...matches.map(Number));
                if (maxYear >= cutoffYear) {
                    isActive = true;
                }
            }
        }

        // If newly created after cutoff
        if (!isActive && p.DtCreation) {
            const creationDate = new Date(p.DtCreation);
            if (creationDate.getFullYear() >= cutoffYear) {
                isActive = true;
            }
        }

        // If explicitly set to Alumni, Abandonne, etc., we ignore for this script.
        const allValuesStr = JSON.stringify(Object.values(p)).toLowerCase();
        let isAlreadyHandled = p.EstAlumni === true || p.EstAlumni === 1 || 
                               allValuesStr.includes("abandon") || 
                               allValuesStr.includes("quitt") || 
                               allValuesStr.includes("déménag") || 
                               allValuesStr.includes("demenag") || 
                               allValuesStr.includes("inactif") ||
                               allValuesStr.includes("bless") || 
                               allValuesStr.includes("suspend") ||
                               p.Actif === false || p.Actif === 0 || p.Abandon === true || p.Abandon === 1;

        if (!isActive && !isAlreadyHandled) {
            inactiveCount++;
        }
    });

    console.log(`Players identified as inactive (no payment, season, or creation >= ${cutoffYear}): ${inactiveCount} out of ${validEtudiants.length}`);
}

main();
