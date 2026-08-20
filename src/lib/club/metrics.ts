import { ClubEvent, Payment, Player } from "@/types/club";
export * from "./season";

export const getPlayerFullName = (player: Player) =>
  `${player.prenom} ${player.nom}`;

export const formatClubDate = (date: string) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

export const formatClubNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US").format(value);
};

export const formatClubCurrency = (amount: number | null | undefined, devise: "US" | "HTG" = "US") => {
  const safeAmount = amount && !isNaN(amount) ? amount : 0;
  if (devise === "HTG") {
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(safeAmount);
    return `${formatted} HTG`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safeAmount).replace("$", "US$");
};

export const getActivePlayersCount = (players: Player[]) =>
  players.filter((player) => player.statut === "actif").length;

export const getLatePaymentsCount = (payments: Payment[]) =>
  payments.filter((payment) => payment.statut === "late").length;

export const getMonthlyPaymentsTotalUS = (payments: Payment[], period: string) =>
  payments
    .filter(
      (payment) => payment.periode === period && payment.statut === "paid",
    )
    .reduce((total, payment) => total + (payment.montantUS || 0), 0);

export const getMonthlyPaymentsTotalHTG = (payments: Payment[], period: string) =>
  payments
    .filter(
      (payment) => payment.periode === period && payment.statut === "paid",
    )
    .reduce((total, payment) => total + (payment.montantHTG || 0), 0);

export const getUpcomingEventsCount = (
  events: ClubEvent[],
  referenceDate = new Date(),
) => {
  const referenceTime = referenceDate.getTime();
  return events.filter((event) => new Date(event.date).getTime() >= referenceTime)
    .length;
};

import { parseDateLocal } from "./date";

export const getRecentPlayers = (players: Player[], limit = 6) =>
  [...players]
    .sort((a, b) => {
      const da = parseDateLocal(a.dateInscription);
      const db = parseDateLocal(b.dateInscription);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;

      if (tb !== ta) {
        return tb - ta;
      }
      const numA = parseInt(a.id, 10) || 0;
      const numB = parseInt(b.id, 10) || 0;
      return numB - numA;
    })
    .slice(0, limit);

export const getUpcomingEvents = (
  events: ClubEvent[],
  limit = 5,
  referenceDate = new Date(),
) =>
  [...events]
    .filter((event) => new Date(event.date).getTime() >= referenceDate.getTime())
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    .slice(0, limit);

export const getMonthlyPaymentsSeries = (payments: Payment[], year: number | "all") => {
  const totalsUS = Array.from({ length: 12 }, () => 0);
  const totalsHTG = Array.from({ length: 12 }, () => 0);

  payments.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const [paymentYear, paymentMonth] = payment.periode.split("-").map(Number);
    
    // Si year === "all", on cumule tout par mois (pour voir la saisonnalité globale)
    // Sinon on filtre sur l'année spécifique
    if (year === "all" || (paymentYear === year && paymentMonth >= 1 && paymentMonth <= 12)) {
      totalsUS[paymentMonth - 1] += (payment.montantUS || 0);
      totalsHTG[paymentMonth - 1] += (payment.montantHTG || 0);
    }
  });

  return {
    dataUS: totalsUS,
    dataHTG: totalsHTG
  };
};
