import { ClubEvent, Payment, Player } from "@/types/club";

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
  }).format(parsed);
};

export const formatClubCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export const getActivePlayersCount = (players: Player[]) =>
  players.filter((player) => player.statut === "actif").length;

export const getLatePaymentsCount = (payments: Payment[]) =>
  payments.filter((payment) => payment.statut === "late").length;

export const getMonthlyPaymentsTotal = (payments: Payment[], period: string) =>
  payments
    .filter(
      (payment) => payment.periode === period && payment.statut === "paid",
    )
    .reduce((total, payment) => total + payment.montant, 0);

export const getUpcomingEventsCount = (
  events: ClubEvent[],
  referenceDate = new Date(),
) => {
  const referenceTime = referenceDate.getTime();
  return events.filter((event) => new Date(event.date).getTime() >= referenceTime)
    .length;
};

export const getRecentPlayers = (players: Player[], limit = 6) =>
  [...players]
    .sort(
      (a, b) =>
        new Date(b.dateInscription).getTime() -
        new Date(a.dateInscription).getTime(),
    )
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

export const getMonthlyPaymentsSeries = (payments: Payment[], year: number) => {
  const totals = Array.from({ length: 12 }, () => 0);

  payments.forEach((payment) => {
    if (payment.statut !== "paid") {
      return;
    }
    const [paymentYear, paymentMonth] = payment.periode.split("-").map(Number);
    if (paymentYear === year && paymentMonth >= 1 && paymentMonth <= 12) {
      totals[paymentMonth - 1] += payment.montant;
    }
  });

  return totals;
};
