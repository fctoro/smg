import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmedLine = line.trim();
  const match = trimmedLine.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createDefaultAdmin() {
  console.log("Création du compte administrateur par défaut...");
  
  const email = "footballclubtoro@gmail.com";
  const password = "MachesuyoToro#2026,"; 

  // 1. Create User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Admin Temporaire" }
  });

  if (authError) {
    if (authError.message.includes('already')) {
        console.log("L'utilisateur existe déjà dans l'authentification. Mise à jour de son profil...");
        
        // Find user by email to update profile
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
             console.error("Erreur lors de la récupération des utilisateurs:", listError.message);
             return;
        }
        
        const existingUser = usersData.users.find(u => u.email === email);
        
        if (existingUser) {
            // Update password to match what user expects
            await supabase.auth.admin.updateUserById(existingUser.id, { password });
            console.log("Mot de passe mis à jour.");

            // Check if profile exists, if not insert, if yes update
            const { error: upsertError } = await supabase.from('profiles').upsert({
                id: existingUser.id,
                full_name: "Admin Temporaire",
                role: "Super Admin",
                phone: ""
            });
            
            if (upsertError) {
                console.error("Erreur lors de la mise à jour du profil:", upsertError.message);
            } else {
                console.log("Profil Super Admin mis à jour avec succès pour", email);
            }
        }
    } else {
        console.error("Erreur lors de la création de l'utilisateur:", authError.message);
    }
    return;
  }

  // 2. Insert Profile
  if (authData.user) {
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      full_name: "Admin Temporaire",
      role: "Super Admin",
      phone: ""
    }]);

    if (profileError) {
      console.error("Erreur lors de l'insertion du profil:", profileError.message);
    } else {
      console.log(`Compte Super Admin créé avec succès !`);
      console.log(`Email : ${email}`);
      console.log(`Mot de passe : ${password}`);
    }
  }
}

createDefaultAdmin();
