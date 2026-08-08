-- Script pour remettre à zéro tous les statuts "Joueur spécial"
-- Ce script va vider le champ statutJoueur pour tous les joueurs qui ont ce statut

UPDATE joueurs 
SET statut_joueur = '' 
WHERE LOWER(statut_joueur) NOT LIKE '%bourse%' 
  AND LOWER(statut_joueur) NOT LIKE '%demi%'
  AND statut_joueur IS NOT NULL 
  AND statut_joueur != '';

-- Vérification : Afficher le nombre de joueurs mis à jour
SELECT 
  COUNT(*) as joueurs_avec_statut_reset,
  'Tous les statuts Joueur spécial ont été supprimés' as message
FROM joueurs 
WHERE statut_joueur = '';

-- Vérification : Afficher les statistiques actuelles
SELECT 
  COUNT(CASE WHEN LOWER(statut_joueur) LIKE '%bourse%' AND LOWER(statut_joueur) NOT LIKE '%demi%' THEN 1 END) as bourse_100,
  COUNT(CASE WHEN LOWER(statut_joueur) LIKE '%demi%' THEN 1 END) as demi_bourse_50,
  COUNT(CASE WHEN LOWER(statut_joueur) NOT LIKE '%bourse%' AND LOWER(statut_joueur) NOT LIKE '%demi%' AND statut_joueur != '' THEN 1 END) as joueurs_speciaux,
  COUNT(CASE WHEN statut_joueur = '' OR statut_joueur IS NULL THEN 1 END) as sans_statut
FROM joueurs 
WHERE statut != 'alumni';