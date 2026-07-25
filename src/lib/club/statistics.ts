import { Payment, Player } from "@/types/club";

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

export interface WeeklyData {
  week: string;
  weekLabel: string;
  revenueUSD: number;
  revenueHTG: number;
  registrations: number;
}

// Grouper les revenus par année
export const getYearlyRevenue = (payments: Payment[]): YearlyData[] => {
  const yearMap = new Map<number, { usd: number; htg: number }>();

  payments.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const year = new Date(payment.datePaiement || payment.periode).getFullYear();
    const current = yearMap.get(year) || { usd: 0, htg: 0 };
    
    if (payment.devise === "USD") {
      current.usd += payment.montant;
    } else {
      current.htg += payment.montant;
    }
    
    yearMap.set(year, current);
  });

  return Array.from(yearMap.entries())
    .map(([year, { usd, htg }]) => ({ year, revenueUSD: usd, revenueHTG: htg, registrations: 0 }))
    .sort((a, b) => a.year - b.year);
};

// Grouper les inscriptions par année
export const getYearlyRegistrations = (players: Player[]): YearlyData[] => {
  const yearMap = new Map<number, number>();

  players.forEach((player) => {
    const year = new Date(player.dateInscription).getFullYear();
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
    const date = new Date(payment.datePaiement || payment.periode);
    if (date.getFullYear() === year) {
      const month = date.getMonth();
      if (payment.devise === "USD") {
        totalsUSD[month] += payment.montant;
      } else {
        totalsHTG[month] += payment.montant;
      }
    }
  });

  return totalsUSD.map((usd, index) => ({
    month: `${year}-${String(index + 1).padStart(2, "0")}`,
    monthLabel: `${monthNames[index]} ${year}`,
    revenueUSD: usd,
    revenueHTG: totalsHTG[index],
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
    const date = new Date(player.dateInscription);
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
    const date = new Date(payment.datePaiement || payment.periode);
    if (date.getFullYear() === year) {
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;
      const current = weekMap.get(weekKey) || { usd: 0, htg: 0 };
      
      if (payment.devise === "USD") {
        current.usd += payment.montant;
      } else {
        current.htg += payment.montant;
      }
      
      weekMap.set(weekKey, current);
    }
  });

  weekMap.forEach(({ usd, htg }, weekKey) => {
    weeks.push({
      week: weekKey,
      weekLabel: weekKey,
      revenueUSD: usd,
      revenueHTG: htg,
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
    const date = new Date(player.dateInscription);
    if (date.getFullYear() === year) {
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
    }
  });

  weekMap.forEach((registrations, weekKey) => {
    weeks.push({
      week: weekKey,
      weekLabel: weekKey,
      revenueUSD: 0,
      revenueHTG: 0,
      registrations,
    });
  });

  return weeks.sort((a, b) => a.week.localeCompare(b.week));
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
    const year = new Date(player.dateInscription).getFullYear();
    if (!isNaN(year)) years.add(year);
  });

  payments.forEach((payment) => {
    const date = new Date(payment.datePaiement || payment.periode);
    const year = date.getFullYear();
    if (!isNaN(year)) years.add(year);
  });

  return Array.from(years).sort((a, b) => b - a); // Plus récent en premier
};