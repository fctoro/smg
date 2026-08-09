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
    console.error("Erreur: Variables d'environnement manquantes (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Démarrage du script : Forcer l'inactivité pour tous sauf paiements Juin-Juillet 2026...");

    // 1. Fetch all players
    let allPlayers = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('tblEtudiants').select('EtudiantID, Nom, Prenom, StatutJoueur').range(from, from + step - 1);
        if (error) {
            console.error("Erreur lors de la récupération des joueurs:", error);
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
    console.log(`Nombre total de joueurs récupérés : ${allPlayers.length}`);

    // 2. Fetch all payments in the range (2026-06-01 to 2026-07-31)
    let allPayments = [];
    from = 0;
    while (true) {
        const { data, error } = await supabase.from('tblPaiements')
            .select('EtudiantId, DateTransact')
            .gte('DateTransact', '2026-06-01')
            .lte('DateTransact', '2026-07-31T23:59:59')
            .range(from, from + step - 1);
            
        if (error) {
            console.error("Erreur lors de la récupération des paiements:", error);
            break;
        }
        if (data && data.length > 0) {
            allPayments = [...allPayments, ...data];
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }
    console.log(`Nombre total de paiements en Juin/Juillet 2026 : ${allPayments.length}`);

    // Set of EtudiantId who paid
    const paidStudentIds = new Set(allPayments.map(p => p.EtudiantId));
    console.log(`Nombre unique de joueurs ayant payé dans cette période : ${paidStudentIds.size}`);

    // 3. Filter players to update
    const playersToUpdate = allPlayers.filter(p => {
        // Ignorer ceux qui ont payé dans la période
        if (paidStudentIds.has(p.EtudiantID)) {
            return false;
        }

        // On ne met à jour que si ce n'est pas déjà inactif
        const isAlreadyInactive = 
            (p.StatutJoueur && p.StatutJoueur.toLowerCase() === 'inactif');

        return !isAlreadyInactive;
    });

    console.log(`Nombre de joueurs à désactiver : ${playersToUpdate.length}`);

    if (playersToUpdate.length === 0) {
        console.log("Aucun joueur à mettre à jour. Fin du script.");
        return;
    }

    // 4. Update in batches
    const batchSize = 50;
    let updatedCount = 0;
    const etudiantIdsToUpdate = playersToUpdate.map(p => p.EtudiantID);

    for (let i = 0; i < etudiantIdsToUpdate.length; i += batchSize) {
        const batch = etudiantIdsToUpdate.slice(i, i + batchSize);
        console.log(`Mise à jour du lot ${i / batchSize + 1} de ${Math.ceil(etudiantIdsToUpdate.length / batchSize)}...`);
        
        const { error } = await supabase
            .from('tblEtudiants')
            .update({ 
                StatutJoueur: 'inactif',
                EstAlumni: false,
                IsDeleted: 0
            })
            .in('EtudiantID', batch);
            
        if (error) {
            console.error(`Erreur lors de la mise à jour du lot ${i / batchSize + 1}:`, error);
        } else {
            updatedCount += batch.length;
        }
    }
    
    console.log(`Terminé ! ${updatedCount} joueurs ont été passés en inactif.`);
}

main();
