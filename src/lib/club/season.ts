/**
 * Returns the current active season based on date (e.g., "2026-2027").
 * Seasons run from July of year Y to June of year Y+1.
 */
export function getCurrentSeason(date: Date = new Date()): string {
  const y = date.getFullYear();
  // Le 1er janvier de l'année Y, la saison par défaut devient Y-(Y+1)
  const startYear = y;
  const endYear = startYear + 1;
  return `${startYear}-${endYear}`;
}

/**
 * Returns the 4-digit short season code (e.g., "2627" for season "2026-2027").
 */
export function getSeasonCode(seasonStr?: string, date: Date = new Date()): string {
  if (seasonStr) {
    const parts = seasonStr.split("-");
    if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
      return `${parts[0].substring(2, 4)}${parts[1].substring(2, 4)}`;
    }
  }
  const fullSeason = getCurrentSeason(date);
  const parts = fullSeason.split("-");
  return `${parts[0].substring(2, 4)}${parts[1].substring(2, 4)}`;
}

/**
 * Generates an automatic player matricule code based on season and student ID.
 * Format: FCT-{SeasonCode}-{PaddedId} (e.g. FCT-2627-0045)
 */
export function generatePlayerMatricule(studentId: number | string, seasonStr?: string): string {
  const sCode = getSeasonCode(seasonStr);
  const numId = String(studentId).replace(/\D/g, "") || String(studentId);
  const paddedId = String(numId).padStart(4, "0");
  return `FCT-${sCode}-${paddedId}`;
}

/**
 * Returns a dynamic list of available season options up to the current active season.
 * E.g. for 2026: ["2026-2027", "2025-2026", "2024-2025", "2023-2024"]
 * No future unavailable seasons are included.
 */
export function getDynamicSeasonOptions(pastYears = 3, futureYears = 0): string[] {
  const currentSeason = getCurrentSeason();
  const currentStartYear = parseInt(currentSeason.split("-")[0], 10);
  const seasons: string[] = [];
  
  for (let i = futureYears; i >= -pastYears; i--) {
    const startY = currentStartYear + i;
    seasons.push(`${startY}-${startY + 1}`);
  }
  
  return seasons;
}
