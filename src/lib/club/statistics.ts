import { Payment, Player } from "@/types/club";
import { parseDateLocal, parseDateLocalOrNow } from "./date";

export interface PeriodData {
  label: string;
  value: number;
}

export interface YearlyData {
  year: number;
  revenueUSD: number;
  revenueHTG: number;
  registrations: number;
}

export interface MonthlyData {
  month: string;
  monthLabel: string;
  revenueUSD: number;
  revenueHTG: number;
  registrations: number;
}

export interface DailyData {
  day: string;
  dayLabel: string;
  revenueUSD: number;
  revenueHTG: number;
  registrations: number;
}

export interface WeeklyData {
  week: string;
  weekLabel: string;
  revenueUSD: number;
  revenueHTG: number;
  registrations: number;
}

export interface PaymentRealAmounts {
  realUSD: number;
  realHTG: number;
  consolidatedUSD: number;
  taux: number;
}

// Grouper les revenus par année
export const isUSDDevise = (devise?: string | null): boolean => {
  if (!devise) return false;
  const normalized = String(devise).trim().toUpperCase();
  return normalized === "US" || normalized === "USD" || normalized === "$";
};

/**
 * Calcule la ventilation monétaire réelle d'un paiement en tenant compte des soldes réglés en HTG.
 * Si un tag [SOLDE_HTG:...] existe, les HTG correspondants sont reclassés en HTG et retirés du montant US.
 */
export const getPaymentRealAmounts = (payment: Payment | any): PaymentRealAmounts => {
  if (!payment) return { realUSD: 0, realHTG: 0, consolidatedUSD: 0, taux: 135 };

  const rem = String(payment.remarque || payment.Remarque || "");
  const soldeMatches = [...rem.matchAll(/\[SOLDE_HTG:([\d.]+)_TAUX:([\d.]+)_USD:([\d.]+)\]/g)];

  let soldeHTGSum = 0;
  let soldeUSDSum = 0;
  soldeMatches.forEach((m) => {
    soldeHTGSum += parseFloat(m[1]) || 0;
    soldeUSDSum += parseFloat(m[3]) || 0;
  });

  const rawUS = Number(payment.montantUS ?? payment.MntPayeUS) || 0;
  const rawGd = Number(payment.montantHTG ?? payment.MntPayeGd) || 0;
  const rawMontant = Number(payment.montant ?? payment.Montant) || 0;
  const devise = payment.devise || payment.Devise || (rawGd > 0 ? "HTG" : "US");

  let realUSD = 0;
  let realHTG = 0;

  if (soldeMatches.length > 0) {
    if (rawUS > 0) {
      realUSD = Math.max(0, rawUS - soldeUSDSum);
      realHTG = rawGd + soldeHTGSum;
    } else if (rawMontant > 0 && isUSDDevise(devise)) {
      realUSD = Math.max(0, rawMontant - soldeUSDSum);
      realHTG = rawGd + soldeHTGSum;
    } else {
      realUSD = rawUS;
      realHTG = rawGd + soldeHTGSum;
    }
  } else {
    if (rawUS > 0 && rawGd > 0) {
      realUSD = rawUS;
      realHTG = rawGd;
    } else if (rawGd > 0) {
      realUSD = 0;
      realHTG = rawGd;
    } else if (rawUS > 0) {
      realUSD = rawUS;
      realHTG = 0;
    } else if (devise === "HTG") {
      realUSD = 0;
      realHTG = rawMontant;
    } else {
      realUSD = rawMontant;
      realHTG = 0;
    }
  }

  const tauxMatch = rem.match(/\[TAUX:\s*([\d.]+)\s*\]/i);
  const taux = Number(payment.taux || payment.TauxChange) || (tauxMatch ? parseFloat(tauxMatch[1]) : 135);
  const consolidatedUSD = realUSD + (realHTG > 0 && taux > 0 ? realHTG / taux : 0);

  return {
    realUSD: Math.round(realUSD * 100) / 100,
    realHTG: Math.round(realHTG * 100) / 100,
    consolidatedUSD: Math.round(consolidatedUSD * 100) / 100,
    taux,
  };
};

export const getYearlyRevenue = (payments: Payment[]): YearlyData[] => {
  const yearMap = new Map<number, { usd: number; htg: number }>();

  payments.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const date = parseDateLocal(payment.datePaiement || payment.periode) || new Date();
    const year = date.getFullYear();
    const current = yearMap.get(year) || { usd: 0, htg: 0 };
    
    current.usd += Number(payment.montantUS) || (isUSDDevise(payment.devise) ? Number(payment.montant || 0) : 0);
    current.htg += Number(payment.montantHTG) || (payment.devise === "HTG" ? Number(payment.montant || 0) : 0);
    
    yearMap.set(year, current);
  });

  return Array.from(yearMap.entries())
    .map(([year, { usd, htg }]) => ({ year, revenueUSD: Math.round(usd * 100) / 100, revenueHTG: Math.round(htg * 100) / 100, registrations: 0 }))
    .sort((a, b) => a.year - b.year);
};

// Grouper les inscriptions par année
export const getYearlyRegistrations = (players: Player[]): YearlyData[] => {
  const yearMap = new Map<number, number>();

  players.forEach((player) => {
    const date = parseDateLocal(player.dateInscription) || new Date();
    const year = date.getFullYear();
    if (!isNaN(year)) {
      yearMap.set(year, (yearMap.get(year) || 0) + 1);
    }
  });

  return Array.from(yearMap.entries())
    .map(([year, registrations]) => ({ year, revenueUSD: 0, revenueHTG: 0, registrations }))
    .sort((a, b) => a.year - b.year);
};

// Grouper les revenus par mois pour une année donnée
export const getMonthlyRevenue = (payments: Payment[], year: number): MonthlyData[] => {
  const monthNames = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
  ];
  const totalsUSD = Array.from({ length: 12 }, () => 0);
  const totalsHTG = Array.from({ length: 12 }, () => 0);

  payments.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const date = parseDateLocal(payment.datePaiement || payment.periode) || new Date();
    if (date.getFullYear() === year) {
      const month = date.getMonth();
      totalsUSD[month] += Number(payment.montantUS) || (isUSDDevise(payment.devise) ? Number(payment.montant || 0) : 0);
      totalsHTG[month] += Number(payment.montantHTG) || (payment.devise === "HTG" ? Number(payment.montant || 0) : 0);
    }
  });

  return totalsUSD.map((usd, index) => ({
    month: `${year}-${String(index + 1).padStart(2, "0")}`,
    monthLabel: `${monthNames[index]} ${year}`,
    revenueUSD: Math.round(usd * 100) / 100,
    revenueHTG: Math.round(totalsHTG[index] * 100) / 100,
    registrations: 0,
  }));
};

// Grouper les inscriptions par mois pour une année donnée
export const getMonthlyRegistrations = (players: Player[], year: number): MonthlyData[] => {
  const monthNames = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
  ];
  const counts = Array.from({ length: 12 }, () => 0);

  players.forEach((player) => {
    const date = parseDateLocal(player.dateInscription) || new Date();
    if (date.getFullYear() === year) {
      const month = date.getMonth();
      counts[month] += 1;
    }
  });

  return counts.map((registrations, index) => ({
    month: `${year}-${String(index + 1).padStart(2, "0")}`,
    monthLabel: `${monthNames[index]} ${year}`,
    revenueUSD: 0,
    revenueHTG: 0,
    registrations,
  }));
};

// Grouper les revenus par semaine pour une année donnée
export const getWeeklyRevenue = (payments: Payment[], year: number): WeeklyData[] => {
  const weeks: WeeklyData[] = [];
  const weekMap = new Map<string, { usd: number; htg: number }>();

  payments.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const date = parseDateLocal(payment.datePaiement || payment.periode) || new Date();
    if (date.getFullYear() === year) {
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-S${String(weekNumber).padStart(2, "0")}`;
      const current = weekMap.get(weekKey) || { usd: 0, htg: 0 };
      
      current.usd += Number(payment.montantUS) || (isUSDDevise(payment.devise) ? Number(payment.montant || 0) : 0);
      current.htg += Number(payment.montantHTG) || (payment.devise === "HTG" ? Number(payment.montant || 0) : 0);
      
      weekMap.set(weekKey, current);
    }
  });

  weekMap.forEach(({ usd, htg }, weekKey) => {
    weeks.push({
      week: weekKey,
      weekLabel: `Semaine ${weekKey.split('-S')[1] || weekKey}`,
      revenueUSD: Math.round(usd * 100) / 100,
      revenueHTG: Math.round(htg * 100) / 100,
      registrations: 0,
    });
  });

  return weeks.sort((a, b) => a.week.localeCompare(b.week));
};

// Grouper les inscriptions par semaine pour une année donnée
export const getWeeklyRegistrations = (players: Player[], year: number): WeeklyData[] => {
  const weeks: WeeklyData[] = [];
  const weekMap = new Map<string, number>();

  players.forEach((player) => {
    const date = parseDateLocal(player.dateInscription) || new Date();
    if (date.getFullYear() === year) {
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-S${String(weekNumber).padStart(2, "0")}`;
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
    }
  });

  weekMap.forEach((registrations, weekKey) => {
    weeks.push({
      week: weekKey,
      weekLabel: `Semaine ${weekKey.split('-S')[1] || weekKey}`,
      revenueUSD: 0,
      revenueHTG: 0,
      registrations,
    });
  });

  return weeks.sort((a, b) => a.week.localeCompare(b.week));
};

// Grouper les revenus par jour (7 derniers jours glissants jusqu'à targetDateStr)
export const getDailyRevenue = (payments: Payment[], targetDateStr?: string): DailyData[] => {
  const refDate = targetDateStr ? new Date(`${targetDateStr}T12:00:00`) : new Date();
  const days: DailyData[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dayKey = `${yyyy}-${mm}-${dd}`;
    
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const dayLabel = `${dayNames[d.getDay()]} ${dd}/${mm}`;

    let revUSD = 0;
    let revHTG = 0;

    payments.forEach((payment) => {
      if (payment.statut !== "paid") return;
      const pDateStr = payment.datePaiement || (payment as any).dateTransact || "";
      if (pDateStr.startsWith(dayKey)) {
        revUSD += Number(payment.montantUS) || (isUSDDevise(payment.devise) ? Number(payment.montant || 0) : 0);
        revHTG += Number(payment.montantHTG) || (payment.devise === "HTG" ? Number(payment.montant || 0) : 0);
      }
    });

    days.push({
      day: dayKey,
      dayLabel,
      revenueUSD: Math.round(revUSD * 100) / 100,
      revenueHTG: Math.round(revHTG * 100) / 100,
      registrations: 0,
    });
  }

  return days;
};

// Fonction utilitaire pour obtenir le numéro de semaine
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Combiner les données financières et d'inscriptions
export const combineYearlyData = (
  revenueData: YearlyData[],
  registrationData: YearlyData[]
): YearlyData[] => {
  const combinedMap = new Map<number, YearlyData>();

  revenueData.forEach((item) => {
    combinedMap.set(item.year, { 
      year: item.year, 
      revenueUSD: item.revenueUSD, 
      revenueHTG: item.revenueHTG, 
      registrations: 0 
    });
  });

  registrationData.forEach((item) => {
    const existing = combinedMap.get(item.year);
    if (existing) {
      existing.registrations = item.registrations;
    } else {
      combinedMap.set(item.year, { 
        year: item.year, 
        revenueUSD: 0, 
        revenueHTG: 0, 
        registrations: item.registrations 
      });
    }
  });

  return Array.from(combinedMap.values()).sort((a, b) => a.year - b.year);
};

// Obtenir toutes les années disponibles
export const getAvailableYears = (players: Player[], payments: Payment[]): number[] => {
  const years = new Set<number>();

  players.forEach((player) => {
    const date = parseDateLocal(player.dateInscription) || new Date();
    const year = date.getFullYear();
    if (!isNaN(year)) years.add(year);
  });

  payments.forEach((payment) => {
    const date = parseDateLocal(payment.datePaiement || payment.periode) || new Date();
    const year = date.getFullYear();
    if (!isNaN(year)) years.add(year);
  });

  return Array.from(years).sort((a, b) => b - a); // Plus récent en premier
};