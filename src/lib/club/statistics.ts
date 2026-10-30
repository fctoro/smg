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

/**
 * Décompose les paiements cumulés multi-versements en transactions individuelles datées.
 * Si un paiement possède des tags [VERSEMENT:amt_DEV_DATE:YYYY-MM-DD], chaque versement
 * est extrait avec sa date réelle et son montant propre. Le paiement initial est recalculé
 * avec la date [DATE_INITIALE:YYYY-MM-DD] et le solde restant.
 * Pour les paiements sans versements multiples, getPaymentRealAmounts est appliqué.
 */
export const decomposePaymentTransactions = (payments: Payment[], players?: Player[]): Payment[] => {
  const playerMap = new Map((players || []).map((pl) => [String(pl.id), pl]));
  const result: Payment[] = [];

  payments.forEach((p) => {
    const remark = String(p.remarque || (p as any).Remarque || "");
    const versementRegex = /\[VERSEMENT:\s*([\d.]+)_([A-Za-z]+)(?:_TAUX:([\d.]+))?(?:_USD:([\d.]+))?_DATE:(\d{4}-\d{2}-\d{2})\]/gi;

    const versementMatches = [...remark.matchAll(versementRegex)];

    // Si aucun versement daté ultérieur, le paiement est une transaction unique
    if (versementMatches.length === 0) {
      const real = getPaymentRealAmounts(p);
      const cleanDate = p.datePaiement
        ? p.datePaiement.split("T")[0]
        : ((p as any).dateTransact ? (p as any).dateTransact.split("T")[0] : (p.periode ? `${p.periode}-01` : ""));
      result.push({
        ...p,
        datePaiement: cleanDate,
        montantUS: real.realUSD,
        montantHTG: real.realHTG,
        taux: real.taux,
      });
      return;
    }

    // Le paiement a des versements ultérieurs avec dates spécifiques
    let sumVersementsUSD = 0;
    let sumVersementsHTG = 0;

    versementMatches.forEach((m, idx) => {
      const amt = parseFloat(m[1]) || 0;
      const devRaw = (m[2] || "US").toUpperCase();
      const dev: "US" | "HTG" = devRaw.includes("HTG") ? "HTG" : "US";
      const tauxMatch = remark.match(/\[TAUX:\s*([\d.]+)\s*\]/i);
      const taux = m[3] ? parseFloat(m[3]) : (Number(p.taux) || (tauxMatch ? parseFloat(tauxMatch[1]) : 135));
      const amtUSD = m[4] ? parseFloat(m[4]) : (dev === "HTG" && taux > 0 ? amt / taux : amt);
      const amtHTG = dev === "HTG" ? amt : (taux > 0 ? amt * taux : 0);
      const vDate = m[5] || (p.datePaiement ? p.datePaiement.split("T")[0] : "");

      if (dev === "HTG") {
        sumVersementsHTG += amt;
        sumVersementsUSD += amtUSD;
      } else {
        sumVersementsUSD += amt;
        sumVersementsHTG += amtHTG;
      }

      result.push({
        ...p,
        id: `${p.id}-v${idx + 1}` as any,
        montant: amt,
        montantUS: Math.round(amtUSD * 100) / 100,
        montantHTG: Math.round(amtHTG * 100) / 100,
        devise: dev,
        taux: taux > 0 ? taux : undefined,
        datePaiement: vDate,
        remarque: `Versement solde #${idx + 1} (${vDate})`,
      });
    });

    // Reconstituer le paiement initial
    const initialDateMatch = remark.match(/\[DATE_INITIALE:(\d{4}-\d{2}-\d{2})\]/i);
    const pl = playerMap.get(String(p.playerId));
    const initialDate = initialDateMatch
      ? initialDateMatch[1]
      : (pl?.dateInscription ? pl.dateInscription.split("T")[0] : (p.datePaiement ? p.datePaiement.split("T")[0] : ""));

    const realAll = getPaymentRealAmounts(p);
    const initialUS = Math.max(0, realAll.realUSD - sumVersementsUSD);
    const initialHTG = Math.max(0, realAll.realHTG - sumVersementsHTG);
    const initialPrimary = p.devise === "HTG" ? initialHTG : initialUS;

    if (initialUS > 0 || initialHTG > 0 || initialPrimary > 0) {
      result.push({
        ...p,
        id: `${p.id}-init` as any,
        montant: initialPrimary > 0 ? Math.round(initialPrimary * 100) / 100 : p.montant,
        montantUS: Math.round(initialUS * 100) / 100,
        montantHTG: Math.round(initialHTG * 100) / 100,
        datePaiement: initialDate,
        remarque: (p.remarque || "")
          .replace(/\[VERSEMENT:[^\]]+\]/gi, "")
          .replace(/\[DERNIER_VERSEMENT:[^\]]+\]/gi, "")
          .replace(/\[SOLDE_HTG:[^\]]+\]/gi, "")
          .replace(/\[DATE_INITIALE:[^\]]+\]/gi, "")
          .trim() || "Paiement initial",
      });
    }
  });

  return result;
};

export const getYearlyRevenue = (payments: Payment[]): YearlyData[] => {
  const yearMap = new Map<number, { usd: number; htg: number }>();
  const transactions = decomposePaymentTransactions(payments);

  transactions.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const date = parseDateLocal(payment.datePaiement || payment.periode) || new Date();
    const year = date.getFullYear();
    const current = yearMap.get(year) || { usd: 0, htg: 0 };
    
    current.usd += Number(payment.montantUS) || 0;
    current.htg += Number(payment.montantHTG) || 0;
    
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
  const transactions = decomposePaymentTransactions(payments);

  transactions.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const date = parseDateLocal(payment.datePaiement || payment.periode) || new Date();
    if (date.getFullYear() === year) {
      const month = date.getMonth();
      totalsUSD[month] += Number(payment.montantUS) || 0;
      totalsHTG[month] += Number(payment.montantHTG) || 0;
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
  const transactions = decomposePaymentTransactions(payments);

  transactions.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const date = parseDateLocal(payment.datePaiement || payment.periode) || new Date();
    if (date.getFullYear() === year) {
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-S${String(weekNumber).padStart(2, "0")}`;
      const current = weekMap.get(weekKey) || { usd: 0, htg: 0 };
      
      current.usd += Number(payment.montantUS) || 0;
      current.htg += Number(payment.montantHTG) || 0;
      
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
export const getDailyRevenue = (payments: Payment[], targetDateStr?: string, players?: Player[]): DailyData[] => {
  const refDate = targetDateStr ? new Date(`${targetDateStr}T12:00:00`) : new Date();
  const days: DailyData[] = [];
  const transactions = decomposePaymentTransactions(payments, players);

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

    transactions.forEach((payment) => {
      if (payment.statut !== "paid") return;
      const pDateStr = payment.datePaiement || (payment as any).dateTransact || "";
      if (pDateStr.startsWith(dayKey)) {
        revUSD += Number(payment.montantUS) || 0;
        revHTG += Number(payment.montantHTG) || 0;
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