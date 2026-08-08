const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const registrationsSQL = `INSERT INTO "public"."player_registrations" ("id", "created_at", "program", "child_first_name", "child_last_name", "child_birth_date", "child_gender", "child_address", "child_school", "child_soccer_experience", "guardian_name", "guardian_email", "guardian_phone", "guardian_address", "emergency_name", "emergency_relation", "emergency_phone", "emergency_email", "emergency_address", "uniform_top_size", "uniform_short_size", "preferred_numbers", "payment_plan", "payment_method", "signature_name", "consents", "ordered_uniforms", "financial_commitment_name", "financial_commitment_date", "financial_commitment_phone", "financial_commitment_signature") VALUES (71, '2026-07-15 19:28:48.363858+00', 'fcToro', 'Theo', 'Gabriel', '2013-05-13', 'Garcon (M)', '823 rte d anglade', 'Lycee Francais', 'Fc Shana', 'Gabriel Gaelle', 'gaelleg03@gmail.com', '+50948911414', '', 'Dupoux David', 'Beau pere', '+50937342011', 'davidupoux@gmail.com', '823 rte d anglade', 'AS', 'AS', '13', 'PLAN #3 (Mensuel)', 'transfert', 'Gaelle Gabriel', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '[]', null, null, null, null), (74, '2026-07-15 19:35:58.430868+00', 'fcToro', 'Mathias', 'Gabriel', '2011-01-14', 'Garcon (M)', '823 rte d anglade', 'Union school', '', 'Gabriel Gaelle', 'gaelleg03@gmail.com', '+20948911414', '', 'Dupoux David', 'Beau pere', '+50937342011', 'davidupoux@gmail.con', '823 rte d anglade', 'AM', 'AM', '9', 'PLAN #3 (Mensuel)', 'transfert', 'Gaelle Gabriel', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '[]', null, null, null, null), (76, '2026-07-15 20:11:46.888239+00', 'fcToro', 'Stan-Sahel', 'Madhère', '2019-10-23', 'Garcon (M)', 'Rue Pipo Juvénat 7', 'CPCM', 'N/A', 'Rony Marie Angelie', 'angelro1920@yahoo.fr', '+50937770247', '', 'Rony Marie Angelie', 'Mère', '+50937770247', '', '', 'YXS', 'YXS', '7,9,10,11', 'PLAN #1 (Annuel)', 'transfert', 'Marie Angelie Rony', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '[]', null, null, null, null), (77, '2026-07-15 20:54:13.37627+00', 'tiToro', 'Gaïa Zulie-Harahel', 'Duret', '2021-10-16', 'Filles (F)', 'Vivy Mitchell', 'Bumble Bee académie', '', 'Jean Nancy', 'jnancyjean31@gmail.com', '+50938492680', '', 'Duret Dirin', 'Père', '+50937209418', '', 'Vivy Mitchell', 'YS', 'YM', '', 'PLAN #1 (Annuel)', 'cash_cheque', 'Jean Nancy', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '[]', null, null, null, null), (84, '2026-07-16 15:43:05.081721+00', 'fcToro', 'Triste', 'Momplaisir', '2015-09-18', 'Garcon (M)', '4 rue Jessica Prolongee Vivy Mitchell', 'Quisqueya Christian School (QCS)', 'N/A', 'Stenley Momplaisir', 'smomplaisirs@hotmail.com', '+50938813081', '4 rue Jessica Prolongee Vivy Mitchell', 'Leilah Christine Decembre Momplaisir', 'Mere', '+50938728715', 'lei.decembre@gmail.com', '4 rue Jessica Prolongée Vivy Mitchell', 'YM', 'YM', '7 (preferentiel),11,8', 'PLAN #3 (Mensuel)', 'cash_cheque', 'Stenley Momplaisir', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '["uniforme_jeux1","uniforme_jeux2","uniforme_jeux3"]', 'Stenley Momplaisir', '1976-01-07', '+50938813081', 'Stenley Momplaisir'), (102, '2026-07-18 16:22:41.133865+00', 'tiToro', 'Stan-Hylan', 'MADHERE', '2021-05-10', 'Garcon (M)', 'Juvenat 7 Rue Pipo', 'Pomme D''Appi', 'Fc Toro', 'Rony Marie Angelie', 'angelro1920@yahoo.fr', '+50937770247', '', 'MADHERE Stanley', 'Pere', '4313-5913', 'angelro1920@yahoo.fr', 'Juvenat 7 Rue Pipo', 'YXS', 'YXS', '10,22', 'PLAN #1 (Annuel)', 'transfert', 'Madhere Marie Angelie', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '["uniforme_jeux2","uniforme_jeux3"]', 'Marie Angelie Madhere', '2026-07-18', '+50937770247', 'MADHERE Marie Angelie'), (103, '2026-07-24 01:17:43.084336+00', 'fcToro', 'Durffy Eloïm', 'Aladin', '2014-10-15', 'Garcon (M)', '15 , Rue Jean Baptiste ,Delmas 33', 'Ecole Jean Marie Guilloux', 'FC Toro', 'STEEVE ALADIN', 'aladinsteeve@gmail.com', '+509 36307711', '', 'Petit Jessie', 'Soeur', '+1 8134057411', 'bookingjessiesmall@gmail.com', '', 'YL', 'YL', '6', 'PLAN #3 (Mensuel)', 'transfert', 'Steeve Aladin', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '["uniforme_jeux1","uniforme_jeux2","uniforme_jeux3"]', 'STEEVE ALADIN', '1987-01-01', '+50936307711', 'Steeve Aladin'), (104, '2026-07-24 15:03:42.92945+00', 'fcToro', 'Aiden Daniel', 'Antoine', '2015-01-21', 'Garcon (M)', '19, Rue Aime-Bastien, Thomassin 32', 'La Gardoche Nouvelle', '3', 'Antoine Marie Anaïse', 'manaiseantoine@hotmail.com', '+50938401952', '19, Rue Aime Bastien, Thomassin 32', 'Antoine Joseph Roger', 'Grand-Pere', '3388-9066 / 3710-9066', '', '19, Rue Aime Bastien, Thomassin 32', 'YL', 'YL', '9, 10, 19', 'PLAN #3 (Mensuel)', 'transfert', 'Marie Anaïse Antoine', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '["uniforme_jeux1"]', 'Marie Anaise Antoine', '2026-07-24', '+50938401952', 'Marie Anaïse Antoine'), (105, '2026-07-24 23:24:03.362062+00', 'fcToro', 'Heinz Moir-Gianni', 'MICHEL', '2016-12-21', 'Garcon (M)', '16, Rue Ferrand de Baudières, Peguy-Ville, Petion-ville', 'Institution Denise Fouchard', '', 'Moise MICHEL', 'moisemichel15@gmail.com', '+50934330681', '', 'MICHEL Marie Paule Jacquet', 'Mere', '36613364', 'marpaulelive@gmail.com', '16, Rue Ferrand de Baudières, Peguy-Ville, Petion-ville', 'YL', 'YM', '10, 7, 20', 'PLAN #3 (Mensuel)', 'transfert', 'Moise MICHEL', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '["uniforme_jeux1","uniforme_jeux2","uniforme_jeux3"]', 'Moise MICHEL', '2026-07-24', '+50934330681', 'Moise MICHEL'), (106, '2026-07-25 13:40:49.660818+00', 'fcToro', 'Nathan', 'Alcegaire', '2020-08-24', 'Garcon (M)', '11 Canapé vert', 'Collège Catts pressoir', '', 'Stéphanie Neguerre', 'sneguerre@yahoo.fr', '37650079', '10 rue Robin bois verna', 'Stéphanie Neguerre', 'Mère', '37650079', 'sneguerre@yahoo.fr', '11, canapé vert sainte marie', 'YXS', 'YXS', '24', 'PLAN #3 (Mensuel)', 'cash_cheque', 'Douinel Alcegaire', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":true}', '["uniforme_jeux1","uniforme_jeux2","uniforme_jeux3","backpack"]', 'Néguerre Stephanie', '2026-07-25', '37650079', 'Stéphanie Neguerre'), (107, '2026-07-25 18:32:41.011432+00', 'fcToro', 'Rodjensky Emmanuel', 'Piton', '2020-07-10', 'Filles (F)', 'Rue Amiral kilick #9, Bas Morne Calvaire', 'hdhdhhf', '', 'Rodjensky Emmanuel Piton', 'pitonrodjy@gmail.com', '+50938756867', 'Rue Amiral kilick #9, Bas Morne Calvaire', 'Rodjensky Emmanuel Piton', 'Pere', '50938756867', 'pitonrodjy@gmail.com', 'Rue Amiral kilick #9, Bas Morne Calvaire', 'YL', 'YM', '12', 'PLAN #1 (Annuel)', 'carte', 'piton', '{"consent_media":true,"consent_health":true,"consent_accuracy":true,"consent_emergency":false}', '["uniforme_jeux1","tracksuit","backpack"]', 'Francky Piton', '2026-07-18', '+50934499141', 'piton');`;

const documentsSQL = `INSERT INTO "public"."player_registration_documents" ("id", "registration_id", "doc_key", "filename", "content_type", "size_bytes", "data", "created_at", "path") VALUES (142, 71, 'document_photo_id', 'IMG_3623.jpeg', 'image/jpeg', 44856, null, '2026-07-15 19:28:48.363858+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/71-document_photo_id-1784143728468-IMG_3623.jpeg'), (143, 71, 'document_birth_certificate', 'IMG_3726.jpeg', 'image/jpeg', 267001, null, '2026-07-15 19:28:48.363858+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/71-document_birth_certificate-1784143729015-IMG_3726.jpeg'), (144, 71, 'document_parent_id', 'IMG_3728.jpeg', 'image/jpeg', 295163, null, '2026-07-15 19:28:48.363858+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/71-document_parent_id-1784143729447-IMG_3728.jpeg'), (148, 74, 'document_photo_id', '0126B5FD-D6DF-4011-BAB1-F4373C60488C.png', 'image/png', 1650517, null, '2026-07-15 19:35:58.430868+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/74-document_photo_id-1784144158544-0126B5FD-D6DF-4011-BAB1-F4373C60488C.png'), (149, 74, 'document_birth_certificate', 'IMG_3727.jpeg', 'image/jpeg', 402829, null, '2026-07-15 19:35:58.430868+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/74-document_birth_certificate-1784144159660-IMG_3727.jpeg'), (150, 74, 'document_parent_id', 'IMG_3728.jpeg', 'image/jpeg', 295163, null, '2026-07-15 19:35:58.430868+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/74-document_parent_id-1784144160357-IMG_3728.jpeg'), (154, 76, 'document_photo_id', 'IMG_3501.jpeg', 'image/jpeg', 796251, null, '2026-07-15 20:11:46.888239+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/76-document_photo_id-1784146306987-IMG_3501.jpeg'), (155, 76, 'document_birth_certificate', 'IMG_6937.jpeg', 'image/jpeg', 323575, null, '2026-07-15 20:11:46.888239+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/76-document_birth_certificate-1784146308987-IMG_6937.jpeg'), (156, 76, 'document_parent_id', 'IMG_6669.jpeg', 'image/jpeg', 2424733, null, '2026-07-15 20:11:46.888239+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/76-document_parent_id-1784146309378-IMG_6669.jpeg'), (157, 77, 'document_photo_id', 'IMG_3859.jpeg', 'image/jpeg', 88522, null, '2026-07-15 20:54:13.37627+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/77-document_photo_id-1784148853477-IMG_3859.jpeg'), (158, 77, 'document_birth_certificate', 'IMG_3330.jpeg', 'image/jpeg', 520430, null, '2026-07-15 20:54:13.37627+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/77-document_birth_certificate-1784148854301-IMG_3330.jpeg'), (159, 77, 'document_parent_id', 'IMG_3396.jpeg', 'image/jpeg', 935744, null, '2026-07-15 20:54:13.37627+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/77-document_parent_id-1784148855473-IMG_3396.jpeg'), (178, 84, 'document_photo_id', 'Photo ID Tristen Momplaisir.JPG', 'image/jpeg', 81028, null, '2026-07-16 15:43:05.081721+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/84-document_photo_id-1784216585197-Photo_ID_Tristen_Momplaisir.JPG'), (179, 84, 'document_birth_certificate', 'Tristen Passport picture.jpg', 'image/jpeg', 601638, null, '2026-07-16 15:43:05.081721+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/84-document_birth_certificate-1784216585880-Tristen_Passport_picture.jpg'), (180, 84, 'document_parent_id', 'Photo passeport Stenley.jpeg', 'image/jpeg', 0, null, '2026-07-16 15:43:05.081721+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/84-document_parent_id-1784216586280-Photo_passeport_Stenley.jpeg'), (232, 102, 'document_photo_id', 'WhatsApp Image 2026-07-18 at 12.08.40 (1).jpeg', 'image/jpeg', 75128, null, '2026-07-18 16:22:41.133865+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/102-document_photo_id-1784391761232-WhatsApp_Image_2026-07-18_at_12.08.40_1_.jpeg'), (233, 102, 'document_birth_certificate', 'WhatsApp Image 2026-07-18 at 12.06.59.jpeg', 'image/jpeg', 191896, null, '2026-07-18 16:22:41.133865+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/102-document_birth_certificate-1784391761666-WhatsApp_Image_2026-07-18_at_12.06.59.jpeg'), (234, 102, 'document_parent_id', 'WhatsApp Image 2026-07-18 at 12.07.50.jpeg', 'image/jpeg', 98786, null, '2026-07-18 16:22:41.133865+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/102-document_parent_id-1784391762143-WhatsApp_Image_2026-07-18_at_12.07.50.jpeg'), (235, 103, 'document_photo_id', 'Elo Pic.jpeg', 'image/jpeg', 72914, null, '2026-07-24 01:17:43.084336+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/103-document_photo_id-1784855863197-Elo_Pic.jpeg'), (236, 103, 'document_birth_certificate', 'Extrait Eloïm_page-0001 (1).jpg', 'image/jpeg', 1350314, null, '2026-07-24 01:17:43.084336+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/103-document_birth_certificate-1784855863748-Extrait_Elo_m_page-0001_1_.jpg'), (237, 103, 'document_parent_id', 'Passport Steeve_page-0001.jpg', 'image/jpeg', 598982, null, '2026-07-24 01:17:43.084336+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/103-document_parent_id-1784855864437-Passport_Steeve_page-0001.jpg'), (238, 104, 'document_photo_id', 'WhatsApp Image 2026-07-24 at 10.50.06.jpeg', 'image/jpeg', 24998, null, '2026-07-24 15:03:42.92945+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/104-document_photo_id-1784905423053-WhatsApp_Image_2026-07-24_at_10.50.06.jpeg'), (239, 104, 'document_birth_certificate', 'Aiden - Birth Certificate_page-0001.jpg', 'image/jpeg', 1852029, null, '2026-07-24 15:03:42.92945+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/104-document_birth_certificate-1784905423685-Aiden_-_Birth_Certificate_page-0001.jpg'), (240, 104, 'document_parent_id', 'Anaise Antoine - Permis de conduire_page-0001.jpg', 'image/jpeg', 862450, null, '2026-07-24 15:03:42.92945+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/104-document_parent_id-1784905424110-Anaise_Antoine_-_Permis_de_conduire_page-0001.jpg'), (241, 105, 'document_photo_id', 'photo_identite_recadree.jpg', 'image/jpeg', 184025, null, '2026-07-24 23:24:03.362062+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/105-document_photo_id-1784935443465-photo_identite_recadree.jpg'), (242, 105, 'document_birth_certificate', 'Extrait_Heinz_p1.jpg', 'image/jpeg', 832479, null, '2026-07-24 23:24:03.362062+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/105-document_birth_certificate-1784935444113-Extrait_Heinz_p1.jpg'), (243, 105, 'document_parent_id', 'CIN_Moise.jpg', 'image/jpeg', 804211, null, '2026-07-24 23:24:03.362062+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/105-document_parent_id-1784935444529-CIN_Moise.jpg'), (244, 106, 'document_photo_id', 'DSC09823.JPG', 'image/jpeg', 79327, null, '2026-07-25 13:40:49.660818+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/106-document_photo_id-1784986849771-DSC09823.JPG'), (245, 106, 'document_birth_certificate', '5A376D87-5B65-4196-B5CC-016426B0B0F7.JPG', 'image/jpeg', 1245345, null, '2026-07-25 13:40:49.660818+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/106-document_birth_certificate-1784986850308-5A376D87-5B65-4196-B5CC-016426B0B0F7.JPG'), (246, 106, 'document_parent_id', 'image.jpg', 'image/jpeg', 2855096, null, '2026-07-25 13:40:49.660818+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/106-document_parent_id-1784986850852-image.jpg'), (247, 107, 'document_photo_id', 'iaef.jPG', 'image/jpeg', 48188, null, '2026-07-25 18:32:41.011432+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/107-document_photo_id-1785004361109-iaef.jPG'), (248, 107, 'document_birth_certificate', 'iaef.jPG', 'image/jpeg', 48188, null, '2026-07-25 18:32:41.011432+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/107-document_birth_certificate-1785004361614-iaef.jPG'), (249, 107, 'document_parent_id', 'iaef.jPG', 'image/jpeg', 48188, null, '2026-07-25 18:32:41.011432+00', 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/107-document_parent_id-1785004361855-iaef.jPG')`;

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  const createTablesSQL = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- Create site_messages table
    CREATE TABLE IF NOT EXISTS public.site_messages (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL,
      phone text,
      message text,
      type text NOT NULL,
      payload jsonb,
      is_read boolean DEFAULT false,
      status text DEFAULT 'pending',
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Create player_registrations table
    CREATE TABLE IF NOT EXISTS public.player_registrations (
      id integer PRIMARY KEY,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      program text NOT NULL,
      child_first_name text NOT NULL,
      child_last_name text NOT NULL,
      child_birth_date date NOT NULL,
      child_gender text NOT NULL,
      child_address text NOT NULL,
      child_school text NOT NULL,
      child_soccer_experience text,
      guardian_name text NOT NULL,
      guardian_email text NOT NULL,
      guardian_phone text NOT NULL,
      guardian_address text,
      emergency_name text NOT NULL,
      emergency_relation text NOT NULL,
      emergency_phone text NOT NULL,
      emergency_email text,
      emergency_address text,
      uniform_top_size text NOT NULL,
      uniform_short_size text NOT NULL,
      preferred_numbers text,
      payment_plan text NOT NULL,
      payment_method text NOT NULL,
      signature_name text NOT NULL,
      consents jsonb,
      ordered_uniforms jsonb,
      financial_commitment_name text,
      financial_commitment_date date,
      financial_commitment_phone text,
      financial_commitment_signature text,
      status text DEFAULT 'pending'
    );

    CREATE SEQUENCE IF NOT EXISTS player_registrations_id_seq OWNED BY public.player_registrations.id;
    ALTER TABLE public.player_registrations ALTER COLUMN id SET DEFAULT nextval('player_registrations_id_seq');

    -- Create player_registration_documents table
    CREATE TABLE IF NOT EXISTS public.player_registration_documents (
      id integer PRIMARY KEY,
      registration_id integer REFERENCES public.player_registrations(id) ON DELETE CASCADE,
      doc_key text NOT NULL,
      filename text NOT NULL,
      content_type text,
      size_bytes integer,
      data bytea,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      path text
    );

    CREATE SEQUENCE IF NOT EXISTS player_registration_documents_id_seq OWNED BY public.player_registration_documents.id;
    ALTER TABLE public.player_registration_documents ALTER COLUMN id SET DEFAULT nextval('player_registration_documents_id_seq');
  `;

  console.log('Creating tables...');
  await client.query(createTablesSQL);
  console.log('Tables created successfully.');

  console.log('Inserting registrations data...');
  try {
    await client.query(registrationsSQL);
    console.log('Registrations inserted successfully.');
  } catch (err) {
    if (err.message.includes('duplicate key')) {
        console.log('Registrations already exist, skipping insert.');
    } else {
        console.error('Error inserting registrations:', err.message);
    }
  }

  console.log('Inserting documents data...');
  try {
    await client.query(documentsSQL);
    console.log('Documents inserted successfully.');
  } catch (err) {
    if (err.message.includes('duplicate key')) {
        console.log('Documents already exist, skipping insert.');
    } else {
        console.error('Error inserting documents:', err.message);
    }
  }

  console.log('Generating site_messages from registrations...');
  const res = await client.query('SELECT * FROM player_registrations');
  for (const reg of res.rows) {
      const payload = {
         id: reg.id,
         child_first_name: reg.child_first_name,
         child_last_name: reg.child_last_name
      };
      
      const checkMsg = await client.query("SELECT id FROM site_messages WHERE type='joueur' AND payload->>'id' = $1", [reg.id.toString()]);
      if (checkMsg.rows.length === 0) {
         await client.query(`
           INSERT INTO site_messages (name, email, phone, type, payload, created_at)
           VALUES ($1, $2, $3, 'joueur', $4, $5)
         `, [reg.guardian_name, reg.guardian_email, reg.guardian_phone, JSON.stringify(payload), reg.created_at]);
      }
  }
  
  await client.query("SELECT setval('player_registrations_id_seq', (SELECT MAX(id) FROM player_registrations))");
  await client.query("SELECT setval('player_registration_documents_id_seq', (SELECT MAX(id) FROM player_registration_documents))");

  console.log('Setup complete!');
  await client.end();
}

run();
