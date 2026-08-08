-- 1. Création de la fonction pour calculer le code saison (ex: '1516' pour 2015-2016)
CREATE OR REPLACE FUNCTION get_season_code(p_session_id int, p_date_facture timestamp)
RETURNS text AS $$
DECLARE
    v_debut timestamp;
    v_fin timestamp;
    v_date timestamp;
BEGIN
    SELECT "DateDebut", "DateFin" INTO v_debut, v_fin
    FROM "tblSessions"
    WHERE "SessionId" = p_session_id; 
    
    IF v_debut IS NOT NULL AND v_fin IS NOT NULL THEN
        -- Si l'année de début et l'année de fin sont identiques, on calcule la saison sportive (ex: de mai à juillet 2016 => 1516)
        IF EXTRACT(YEAR FROM v_debut) = EXTRACT(YEAR FROM v_fin) THEN
            IF EXTRACT(MONTH FROM v_debut) >= 7 THEN
                RETURN TO_CHAR(EXTRACT(YEAR FROM v_debut) % 100, 'FM00') || TO_CHAR((EXTRACT(YEAR FROM v_debut) + 1) % 100, 'FM00');
            ELSE
                RETURN TO_CHAR((EXTRACT(YEAR FROM v_debut) - 1) % 100, 'FM00') || TO_CHAR(EXTRACT(YEAR FROM v_debut) % 100, 'FM00');
            END IF;
        ELSE
            -- Si les années sont différentes (ex: 2015 et 2016 => 1516)
            RETURN TO_CHAR(EXTRACT(YEAR FROM v_debut) % 100, 'FM00') || TO_CHAR(EXTRACT(YEAR FROM v_fin) % 100, 'FM00');
        END IF;
    END IF;
    
    -- Solution de repli si la session n'est pas trouvée
    v_date := COALESCE(p_date_facture, CURRENT_TIMESTAMP);
    
    IF EXTRACT(MONTH FROM v_date) >= 7 THEN
        RETURN TO_CHAR(EXTRACT(YEAR FROM v_date) % 100, 'FM00') || TO_CHAR((EXTRACT(YEAR FROM v_date) + 1) % 100, 'FM00');
    ELSE
        RETURN TO_CHAR((EXTRACT(YEAR FROM v_date) - 1) % 100, 'FM00') || TO_CHAR(EXTRACT(YEAR FROM v_date) % 100, 'FM00');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Suppression de l'ancien trigger s'il existait
DROP TRIGGER IF EXISTS trg_before_insert_facture ON "tblFacture";

-- 3. Création / Redéfinition propre de la logique du trigger
CREATE OR REPLACE FUNCTION tg_generate_no_facture()
RETURNS TRIGGER AS $$
DECLARE
    v_season_code text;
    v_next_num integer;
BEGIN
    IF NEW."NoFacture" IS NULL OR NEW."NoFacture" = '' THEN
        v_season_code := get_season_code(NEW."SessionId", NEW."DateFacture");
        
        -- On cherche le numéro le plus élevé pour cette saison spécifique
        SELECT COALESCE(MAX(NULLIF(SUBSTRING("NoFacture" FROM '-([0-9]+)$'), '')::integer), 0) + 1
        INTO v_next_num
        FROM "tblFacture"
        WHERE "NoFacture" LIKE 'FCT-' || v_season_code || '-%';
        
        -- On génère le numéro FCT-1213-0001
        NEW."NoFacture" := 'FCT-' || v_season_code || '-' || LPAD(v_next_num::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attacher le Trigger à la table tblFacture pour les futures factures
CREATE TRIGGER trg_before_insert_facture
BEFORE INSERT ON "tblFacture"
FOR EACH ROW
EXECUTE FUNCTION tg_generate_no_facture();

-- 5. Désactiver temporairement l'exécution des triggers pour cette session (Solution adaptée à Supabase)
SET session_replication_role = 'replica';

-- 6. & 7. Bloc de migration PL/pgSQL (100% sécurisé, aucune table temporaire nécessaire)
DO $$
DECLARE
    rec RECORD;
    v_season_code TEXT;
    v_new_nofacture TEXT;
    v_counter INTEGER;
BEGIN
    -- On parcourt toutes les factures chronologiquement
    FOR rec IN 
        SELECT 
            f."Id", 
            f."NoFacture" as old_nofacture, 
            f."SessionId", 
            f."DateFacture", 
            s."DateDebut"
        FROM "tblFacture" f
        LEFT JOIN "tblSessions" s ON f."SessionId" = s."SessionId"
        ORDER BY COALESCE(f."DateFacture", s."DateDebut", '2015-01-01'::timestamp), f."Id"
    LOOP
        -- Calcul du code de saison pour cette ligne
        v_season_code := get_season_code(rec."SessionId", rec."DateFacture");
        
        -- On cherche le compteur actuel pour cette saison directement
        SELECT COALESCE(MAX(NULLIF(SUBSTRING("NoFacture" FROM '-([0-9]+)$'), '')::integer), 0) + 1
        INTO v_counter
        FROM "tblFacture"
        WHERE "NoFacture" LIKE 'FCT-' || v_season_code || '-%';
        
        -- Assemblage du nouveau numéro
        v_new_nofacture := 'FCT-' || v_season_code || '-' || LPAD(v_counter::text, 4, '0');
        
        -- Mise à jour immédiate
        UPDATE "tblFacture" SET "NoFacture" = v_new_nofacture WHERE "Id" = rec."Id";
        
        -- Mise à jour des relations (paiements et inscriptions liés)
        UPDATE "tblPaiements" SET "NoFacture" = v_new_nofacture WHERE "FactureId" = rec."Id" OR "NoFacture" = rec.old_nofacture;
        UPDATE "tblInscriptions" SET "NoFacture" = v_new_nofacture WHERE "NoFacture" = rec.old_nofacture;
        UPDATE "tblFactures" SET "NoFacture" = v_new_nofacture WHERE "NoFacture" = rec.old_nofacture;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Réactiver les triggers pour la session
SET session_replication_role = 'origin';
