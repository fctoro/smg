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

export const formatClubCurrency = (amount: number, devise: "US" | "HTG" = "US") => {
  if (devise === "HTG") {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "HTG",
      maximumFractionDigits: 0,
    }).format(amount).replace("HTG", "Gourdes");
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount).replace("$", "US$");
};

export const getActivePlayersCount = (players: Player[]) =>
  players.filter((player) => player.statut === "actif").length;

export const getLatePaymentsCount = (payments: Payment[]) =>
  payments.filter((payment) => payment.statut === "late").length;

export const getMonthlyPaymentsTotal = (payments: Payment[], period: string) => {
  return payments
    .filter((payment) => payment.periode === period && payment.statut === "paid")
    .reduce(
      (acc, payment) => {
        if (payment.devise === "HTG") {
          acc.htg += payment.montant;
        } else {
          acc.usd += payment.montant;
        }
        return acc;
      },
      { usd: 0, htg: 0 }
    );
};

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
  const totalsUSD = Array.from({ length: 12 }, () => 0);
  const totalsHTG = Array.from({ length: 12 }, () => 0);

  payments.forEach((payment) => {
    if (payment.statut !== "paid") return;
    const [paymentYear, paymentMonth] = payment.periode.split("-").map(Number);
    if (paymentYear === year && paymentMonth >= 1 && paymentMonth <= 12) {
      if (payment.devise === "HTG") {
        totalsHTG[paymentMonth - 1] += payment.montant;
      } else {
        totalsUSD[paymentMonth - 1] += payment.montant;
      }
    }
  });

  return { usd: totalsUSD, htg: totalsHTG };
};
