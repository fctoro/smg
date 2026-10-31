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
    const cleanSeason = String(seasonStr).trim();
    
    // Format complet: "2018-2019", "2018/2019", "Saison 2018-2019"
    const matchFull = cleanSeason.match(/20(\d{2})[-/]?20(\d{2})/);
    if (matchFull) {
      return `${matchFull[1]}${matchFull[2]}`;
    }
    
    // Format court: "1819", "2627", "2021" (pour 2020-2021)
    if (/^\d{4}$/.test(cleanSeason)) {
      return cleanSeason;
    }
    
    // Format partiel: "18/19", "18-19"
    const matchPartial = cleanSeason.match(/(\d{2})[-/](\d{2})/);
    if (matchPartial) {
      return `${matchPartial[1]}${matchPartial[2]}`;
    }
  }
  const fullSeason = getCurrentSeason(date);
  const parts = fullSeason.split("-");
  return `${parts[0].substring(2, 4)}${parts[1].substring(2, 4)}`;
}

/**
 * Generates an automatic player matricule code based on season and student ID.
 * Format: FCT-{SeasonCode}-{PaddedId} (e.g. FCT-2627-0045 or DET-2627-0045)
 */
export function generatePlayerMatricule(studentId: number | string, seasonStr?: string, isDetection?: boolean): string {
  const sCode = getSeasonCode(seasonStr);
  const numId = String(studentId).replace(/\D/g, "") || String(studentId);
  const paddedId = String(numId).padStart(4, "0");
  const prefix = isDetection ? "DET" : "FCT";
  return `${prefix}-${sCode}-${paddedId}`;
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

export const SEASON_MONTHS = [
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
] as const;

/**
 * Returns the list of month names covered by a payment of `count` months,
 * starting after `pastMonthsPaid` already settled months.
 */
export function getCoveredSeasonMonths(pastMonthsPaid: number = 0, count: number = 1): string[] {
  const safePast = Math.max(0, pastMonthsPaid);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (safePast + i) % SEASON_MONTHS.length;
    result.push(SEASON_MONTHS[idx]);
  }
  return result;
}

/**
 * Returns a human-friendly label for covered months (e.g. "Septembre", "Septembre & Octobre", "Septembre, Octobre & Novembre", "Septembre à Décembre").
 */
export function formatCoveredMonthsLabel(months: string[]): string {
  if (!months || months.length === 0) return "";
  if (months.length === 1) return months[0];
  if (months.length === 2) return `${months[0]} & ${months[1]}`;
  if (months.length <= 4) {
    return `${months.slice(0, -1).join(", ")} & ${months[months.length - 1]}`;
  }
  return `${months[0]} à ${months[months.length - 1]} (${months.length} mois)`;
}

/**
 * Extracts the exact set of season months already paid by a player from their past payments.
 * Supports [MOIS_NOMS:Septembre,Octobre] as well as fallback [MOIS_PAYES:N] or "N mois".
 */
export function extractPlayerPaidMonths(payments: any[]): string[] {
  if (!payments || payments.length === 0) return [];

  const paidSet = new Set<string>();

  // Trier les paiements par date (du plus ancien au plus récent)
  const sorted = [...payments].sort((a, b) => {
    const da = new Date(a.datePaiement || a.createdAt || 0).getTime();
    const db = new Date(b.datePaiement || b.createdAt || 0).getTime();
    return da - db;
  });

  for (const p of sorted) {
    const remark = String(p.remarque || "");
    const isCancelled = String(p.statut || "").toLowerCase() === "annule" || String(p.statut || "").toLowerCase() === "annulé";
    if (isCancelled) continue;

    // 1. Chercher [MOIS_NOMS:...]
    const nomsMatch = remark.match(/\[MOIS_NOMS:\s*([^\]]+)\]/i);
    if (nomsMatch && nomsMatch[1]) {
      const parts = nomsMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      for (const m of parts) {
        const matched = SEASON_MONTHS.find((sm) => sm.toLowerCase() === m.toLowerCase());
        if (matched) paidSet.add(matched);
      }
      continue;
    }

    // 2. Fallback: [MOIS_PAYES:N] ou "N mois"
    const payesMatch = remark.match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || remark.match(/(\d+)\s*mois/i);
    if (payesMatch && payesMatch[1]) {
      const count = parseInt(payesMatch[1], 10) || 0;
      let added = 0;
      for (const sm of SEASON_MONTHS) {
        if (added >= count) break;
        if (!paidSet.has(sm)) {
          paidSet.add(sm);
          added++;
        }
      }
    }
  }

  // Retourner les mois dans l'ordre chronologique de SEASON_MONTHS
  return SEASON_MONTHS.filter((m) => paidSet.has(m));
}

/**
 * Returns the next `count` unpaid season months that are not yet in `paidMonths`.
 */
export function getNextUnpaidMonths(paidMonths: string[] = [], count: number = 1): string[] {
  const paidSet = new Set(paidMonths.map((m) => m.toLowerCase()));
  const unpaid = SEASON_MONTHS.filter((m) => !paidSet.has(m.toLowerCase()));
  return unpaid.slice(0, Math.max(1, count));
}
