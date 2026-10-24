export type EvaluationFormType = "U8" | "FIELD_U10_U18" | "GOALKEEPER";

export function determineEvaluationType(category: string, poste: string): EvaluationFormType {
  const p = (poste || "").toLowerCase().trim();
  if (p.includes("gardien") || p.includes("goal") || p === "gk") {
    return "GOALKEEPER";
  }
  const c = (category || "").toUpperCase().trim();
  if (c === "U8") {
    return "U8";
  }
  return "FIELD_U10_U18";
}

// ==========================================
// 1. U8 SPECIFIC CRITERIA & TESTS
// ==========================================
export interface U8EvaluationRatings {
  aspectMental: number; // 1-5
  jeuPreSportif: number; // 1-5
  presentation: number; // 1-5
  jonglerieRebonds: number; // 1-5
  jonglerieSansRebonds: number; // 1-5
  contactBallon: number; // 1-5
  contactPlat: number; // 1-5
  contactInterieurExterieur: number; // 1-5
  contactCourt: number; // 1-5
  contactPointe: number; // 1-5
  contactTalon: number; // 1-5
}

export interface U8EvaluationTests {
  motriciteSecondes: string;
  slalomSecondes: string;
}

// ==========================================
// 2. FIELD PLAYER U10-U18 CRITERIA
// ==========================================
export interface FieldU10U18Ratings {
  // Évaluation Générale (6)
  competencesTechniques: number;
  competencesTactiques: number;
  competencesAttaque: number;
  jeuFitnessConditionnement: number;
  aspectMental: number;
  presentation: number;

  // Qualités d'Attaque (6)
  techniqueFinition: number;
  passesPrecises: number;
  equilibreVision: number;
  dribblesFeintes: number;
  passesLongues: number;
  courirApresBallon: number;

  // Qualités Défensives (6)
  techniqueDegagement: number;
  positionnement: number;
  competencesTackles: number;
  canalisationRetard: number;
  comprehensionDefensive1v1: number;
  comprehensionPrincipes: number;
}

// ==========================================
// 3. GOALKEEPER CRITERIA
// ==========================================
export interface GoalkeeperRatings {
  // Évaluation Générale (12)
  priseDeBalle: number;
  ramassageGauche: number;
  ramassageDroit: number;
  demiSaut: number;
  priseAerienne: number;
  saut: number;
  detente: number;
  positionDeBase: number;
  reactionAuSol: number;
  anticipationBalleAuSol: number;
  reflexe: number;
  passeLongue: number;

  // Qualités Techniques (2)
  techniqueDegagement: number;
  comprehensionPrincipes: number;
}

// ==========================================
// ADVANCED TESTS (Used by U10-U18 and Goalkeepers)
// ==========================================
export interface AdvancedTests {
  // Test de Jonglage (6)
  jonglagePiedFort: string;
  jonglagePiedFaible: string;
  jonglageAlterne: string;
  jonglageCuisseGauche: string;
  jonglageCuisseDroite: string;
  jonglageCuisseAlternee: string;

  // Test de Vivacité
  vivacite: string;

  // Test de Vitesse (4)
  vitesse10M: string;
  vitesse20M: string;
  vitesse30M: string;
  vitesse40M: string;
}

// ==========================================
// UNIFIED EVALUATION DATA SCHEMA
// ==========================================
export interface EvaluationHeader {
  playerName: string;
  categorie: string;
  poste: string;
  evaluationDate: string;
}

export interface EvaluationSignatures {
  coachName: string;
  pdgName?: string;
  date: string;
}

export interface FullEvaluationData {
  version: number;
  formType: EvaluationFormType;
  category: string;
  poste: string;
  evaluator_name: string;
  evaluator_role?: string;
  header: EvaluationHeader;
  ratingsU8?: U8EvaluationRatings;
  ratingsField?: FieldU10U18Ratings;
  ratingsGK?: GoalkeeperRatings;
  testsU8?: U8EvaluationTests;
  testsAdvanced?: AdvancedTests;
  observations: string;
  signatures: EvaluationSignatures;
}

// Legacy alias
export type U8EvaluationData = FullEvaluationData;

export interface PlayerEvaluationRecord {
  id: string;
  player_id: string;
  coach_id: string;
  evaluation_date: string;
  saison: string;
  created_at: string;
  comments: string;
  parsedData?: FullEvaluationData | null;
}

export function parseEvaluationComments(comments: string): FullEvaluationData | null {
  if (!comments || typeof comments !== "string") return null;
  const trimmed = comments.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const data = JSON.parse(trimmed);
    if (data && (data.category || data.formType || data.ratings || data.ratingsU8 || data.ratingsField || data.ratingsGK)) {
      // Auto-detect formType if missing from earlier U8 data
      if (!data.formType) {
        data.formType = determineEvaluationType(data.header?.categorie || data.category, data.header?.poste || data.poste);
      }
      return data as FullEvaluationData;
    }
  } catch {
    return null;
  }
  return null;
}
