export type TacticalRole = "DEF" | "MID" | "ATT";

export interface TacticalLine {
  role: TacticalRole;
  count: number;
}

export interface TacticalFormation {
  id: string;
  label: string;
  family: string;
  style: string;
  size: number;
  lines: TacticalLine[];
}

const createFormation = (
  id: string,
  label: string,
  family: string,
  style: string,
  lines: TacticalLine[],
  size: number = 11
): TacticalFormation => ({
  id,
  label,
  family,
  style,
  size,
  lines,
});

export const fifaFormations: TacticalFormation[] = [
  createFormation(
    "442-classic",
    "4-4-2",
    "Ligne de 4",
    "Bloc equilibre avec deux attaquants.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 4 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "4411",
    "4-4-1-1",
    "Ligne de 4",
    "Deux lignes compactes avec un soutien offensif.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 4 },
      { role: "MID", count: 1 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "433-balanced",
    "4-3-3",
    "Ligne de 4",
    "Occupation de la largeur et pressing haut.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 3 },
      { role: "ATT", count: 3 },
    ],
  ),
  createFormation(
    "433-false9",
    "4-3-3 Faux 9",
    "Ligne de 4",
    "Neuf decrocheur pour creer des intervalles.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 3 },
      { role: "ATT", count: 3 },
    ],
  ),
  createFormation(
    "4231",
    "4-2-3-1",
    "Ligne de 4",
    "Double pivot et 3 createurs derriere la pointe.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 2 },
      { role: "MID", count: 3 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "4141",
    "4-1-4-1",
    "Ligne de 4",
    "Verrou central avec une sentinelle.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 1 },
      { role: "MID", count: 4 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "451",
    "4-5-1",
    "Ligne de 4",
    "Milieu dense pour controler le tempo.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 5 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "4222",
    "4-2-2-2",
    "Ligne de 4",
    "Axe fort avec deux soutiens offensifs.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 2 },
      { role: "MID", count: 2 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "424",
    "4-2-4",
    "Ligne de 4",
    "Pression offensive maximale.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 2 },
      { role: "ATT", count: 4 },
    ],
  ),
  createFormation(
    "4321",
    "4-3-2-1",
    "Ligne de 4",
    "Sapin de Noel avec triangle axial.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 3 },
      { role: "MID", count: 2 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "4312",
    "4-3-1-2",
    "Ligne de 4",
    "Meneur axial derriere deux pointes.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 3 },
      { role: "MID", count: 1 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "4132",
    "4-1-3-2",
    "Ligne de 4",
    "Protection axe puis projection rapide.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 1 },
      { role: "MID", count: 3 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "4213",
    "4-2-1-3",
    "Ligne de 4",
    "Double pivot + meneur + trident.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 2 },
      { role: "MID", count: 1 },
      { role: "ATT", count: 3 },
    ],
  ),
  createFormation(
    "41212-narrow",
    "4-1-2-1-2",
    "Ligne de 4",
    "Losange et jeu interieur.",
    [
      { role: "DEF", count: 4 },
      { role: "MID", count: 1 },
      { role: "MID", count: 2 },
      { role: "MID", count: 1 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "352",
    "3-5-2",
    "Ligne de 3",
    "Couloirs actifs avec duo offensif.",
    [
      { role: "DEF", count: 3 },
      { role: "MID", count: 5 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "343",
    "3-4-3",
    "Ligne de 3",
    "Largeur maximale et transitions rapides.",
    [
      { role: "DEF", count: 3 },
      { role: "MID", count: 4 },
      { role: "ATT", count: 3 },
    ],
  ),
  createFormation(
    "3421",
    "3-4-2-1",
    "Ligne de 3",
    "Deux meneurs derriere la pointe.",
    [
      { role: "DEF", count: 3 },
      { role: "MID", count: 4 },
      { role: "MID", count: 2 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "3412",
    "3-4-1-2",
    "Ligne de 3",
    "Meneur axial avec duo de finition.",
    [
      { role: "DEF", count: 3 },
      { role: "MID", count: 4 },
      { role: "MID", count: 1 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "3142",
    "3-1-4-2",
    "Ligne de 3",
    "Sentinelle basse et relais verticaux.",
    [
      { role: "DEF", count: 3 },
      { role: "MID", count: 1 },
      { role: "MID", count: 4 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "3511",
    "3-5-1-1",
    "Ligne de 3",
    "Bloc dense avec soutien proche de la pointe.",
    [
      { role: "DEF", count: 3 },
      { role: "MID", count: 5 },
      { role: "MID", count: 1 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "3241",
    "3-2-4-1",
    "Ligne de 3",
    "Structure moderne pour dominer l'entrejeu.",
    [
      { role: "DEF", count: 3 },
      { role: "MID", count: 2 },
      { role: "MID", count: 4 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "3331",
    "3-3-3-1",
    "Ligne de 3",
    "Pressing ultra agressif avec densite haute.",
    [
      { role: "DEF", count: 3 },
      { role: "MID", count: 3 },
      { role: "MID", count: 3 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "532",
    "5-3-2",
    "Ligne de 5",
    "Defensif solide et sorties en contre.",
    [
      { role: "DEF", count: 5 },
      { role: "MID", count: 3 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "523",
    "5-2-3",
    "Ligne de 5",
    "Pistons hauts et trio offensif.",
    [
      { role: "DEF", count: 5 },
      { role: "MID", count: 2 },
      { role: "ATT", count: 3 },
    ],
  ),
  createFormation(
    "541",
    "5-4-1",
    "Ligne de 5",
    "Bloc bas compact pour proteger la surface.",
    [
      { role: "DEF", count: 5 },
      { role: "MID", count: 4 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "5212",
    "5-2-1-2",
    "Ligne de 5",
    "Meneur axial dans une base a 5.",
    [
      { role: "DEF", count: 5 },
      { role: "MID", count: 2 },
      { role: "MID", count: 1 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "5221",
    "5-2-2-1",
    "Ligne de 5",
    "Deux supports entre les lignes.",
    [
      { role: "DEF", count: 5 },
      { role: "MID", count: 2 },
      { role: "MID", count: 2 },
      { role: "ATT", count: 1 },
    ],
  ),
  createFormation(
    "5122",
    "5-1-2-2",
    "Ligne de 5",
    "Sentinelle unique et deux attaquants.",
    [
      { role: "DEF", count: 5 },
      { role: "MID", count: 1 },
      { role: "MID", count: 2 },
      { role: "ATT", count: 2 },
    ],
  ),
  createFormation(
    "5311",
    "5-3-1-1",
    "Ligne de 5",
    "Bloc prudent avec attaquant de soutien.",
    [
      { role: "DEF", count: 5 },
      { role: "MID", count: 3 },
      { role: "MID", count: 1 },
      { role: "ATT", count: 1 },
    ],
  ),
  
  // --- FOOT À 9 (Size: 9) ---
  createFormation("332", "3-3-2", "Foot à 9", "Équilibre parfait pour le jeu à 9.", 
    [{ role: "DEF", count: 3 }, { role: "MID", count: 3 }, { role: "ATT", count: 2 }], 9),
  createFormation("341", "3-4-1", "Foot à 9", "Milieu renforcé et pressing haut.", 
    [{ role: "DEF", count: 3 }, { role: "MID", count: 4 }, { role: "ATT", count: 1 }], 9),
  createFormation("242", "2-4-2", "Foot à 9", "Offensif avec occupation de la largeur.", 
    [{ role: "DEF", count: 2 }, { role: "MID", count: 4 }, { role: "ATT", count: 2 }], 9),
  createFormation("323", "3-2-3", "Foot à 9", "Jeu direct très offensif.", 
    [{ role: "DEF", count: 3 }, { role: "MID", count: 2 }, { role: "ATT", count: 3 }], 9),
  createFormation("431", "4-3-1", "Foot à 9", "Défense solide et contre-attaque.", 
    [{ role: "DEF", count: 4 }, { role: "MID", count: 3 }, { role: "ATT", count: 1 }], 9),

  // --- FOOT À 8 (Size: 8) ---
  createFormation("331", "3-3-1", "Foot à 8", "Stabilité défensive et contrôle.", 
    [{ role: "DEF", count: 3 }, { role: "MID", count: 3 }, { role: "ATT", count: 1 }], 8),
  createFormation("232", "2-3-2", "Foot à 8", "Jeu porté vers l'avant.", 
    [{ role: "DEF", count: 2 }, { role: "MID", count: 3 }, { role: "ATT", count: 2 }], 8),
  createFormation("241", "2-4-1", "Foot à 8", "Densité au milieu de terrain.", 
    [{ role: "DEF", count: 2 }, { role: "MID", count: 4 }, { role: "ATT", count: 1 }], 8),
  createFormation("322", "3-2-2", "Foot à 8", "Bloc solide et duo d'attaque.", 
    [{ role: "DEF", count: 3 }, { role: "MID", count: 2 }, { role: "ATT", count: 2 }], 8),

  // --- FOOT À 5 (Size: 5) ---
  createFormation("22", "2-2", "Foot à 5", "La formation classique du foot à 5 en carré.", 
    [{ role: "DEF", count: 2 }, { role: "ATT", count: 2 }], 5),
  createFormation("121", "1-2-1", "Foot à 5", "Le losange, idéal pour la possession.", 
    [{ role: "DEF", count: 1 }, { role: "MID", count: 2 }, { role: "ATT", count: 1 }], 5),
  createFormation("211", "2-1-1", "Foot à 5", "Défense resserrée, jeu de contre le 'Y'.", 
    [{ role: "DEF", count: 2 }, { role: "MID", count: 1 }, { role: "ATT", count: 1 }], 5),
  createFormation("112", "1-1-2", "Foot à 5", "Formation ultra-offensive en 'Y inversé'.", 
    [{ role: "DEF", count: 1 }, { role: "MID", count: 1 }, { role: "ATT", count: 2 }], 5),
];

export const defaultFifaFormationId = fifaFormations[0]?.id ?? "";
