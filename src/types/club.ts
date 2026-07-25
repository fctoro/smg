export type PlayerStatus = "actif" | "blesse" | "suspendu" | "abandonne";

export type PaymentStatus = "paid" | "pending" | "late";

export type EventType = "match" | "entrainement" | "reunion";

export type EventCalendarColor = "Danger" | "Success" | "Primary" | "Warning";

export type PaymentMethod = "virement" | "carte" | "especes" | "mobile";

export type StaffRole = "Coach" | "Assistant" | "Admin" | "Medical";

export type MatchFormResult = "W" | "D" | "L";

export type MatchState = "FT" | "A venir";

export interface Player {
  id: string;
  matricule?: string;
  nom: string;
  prenom: string;
  photoUrl: string;
  poste: string;
  sexe: "Féminin" | "Masculin";
  categorie: string;
  statut: PlayerStatus;
  telephone: string;
  email: string;
  dateInscription: string;
  dateNaissance: string;
  adresse: string;
  cotisationMontant: number;
  cotisationDevise: "US" | "HTG";
  cotisationStatut: PaymentStatus;
  dernierPaiement: string;
  saison?: string;
}

export interface ClubEvent {
  id: string;
  titre: string;
  date: string;
  lieu: string;
  type: EventType;
  calendarColor?: EventCalendarColor;
  participants: string[];
}

export interface Payment {
  id: string;
  playerId: string;
  montant: number;
  statut: PaymentStatus;
  periode: string;
  methode: PaymentMethod;
  datePaiement?: string;
  remarque?: string;
  devise?: "US" | "HTG";
}

export interface Invoice {
  id: string;
  noFacture: string;
  playerId: string;
  sessionId: string;
  remarque: string;
  montantAPayer: number;
  montantPaye: number;
  dateFacture: string;
  datePaiement?: string;
  statut: PaymentStatus;
  devise?: "US" | "HTG";
}

export interface Parent {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  lien: string;
  playerId: string;
}

export interface Employee {
  id: string;
  employeId?: number;
  nom: string;
  prenom: string;
  sexe?: string;
  fonction: string;
  salaire?: number | null;
  dateEmbauche?: string;
  telephone: string;
  email: string;
  adresse?: string;
  niveauEtude?: string;
  profession?: string;
  photoUrl?: string;
  desactive?: boolean | number;
  // Legacy / standard aliases
  role?: string;
  dateDebut?: string;
}

export type StaffMember = Employee;

export interface Alumni {
  id: string;
  nom: string;
  anneeEntree: number;
  anneeSortie: number;
  poste: string;
  situationActuelle: string;
}

export interface ClubStandingRow {
  teamId: string;
  teamName: string;
  logoUrl: string;
  pts: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  form: MatchFormResult[];
}

export interface ClubFixture {
  id: string;
  competition: string;
  round: string;
  kickoff: string;
  status: MatchState;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoUrl: string;
  awayLogoUrl: string;
  homeScore?: number;
  awayScore?: number;
}

export interface PlayerFormValues {
  photoUrl: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  poste: string;
  sexe: "Féminin" | "Masculin";
  categorie: string;
  telephone: string;
  email: string;
  adresse: string;
  statut: PlayerStatus;
  cotisationMontant: number;
  cotisationDevise: "US" | "HTG";
  cotisationStatut: PaymentStatus;
}

export interface ParentFormValues {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  lien: string;
  playerId: string;
}

export interface EmployeeFormValues {
  nom: string;
  prenom: string;
  sexe?: string;
  fonction: string;
  salaire?: number | null;
  dateEmbauche?: string;
  telephone: string;
  email: string;
  adresse?: string;
  niveauEtude?: string;
  profession?: string;
  desactive?: boolean | number;
  role?: string;
  dateDebut?: string;
}

export type StaffFormValues = EmployeeFormValues;

export interface AlumniFormValues {
  nom: string;
  anneeEntree: number;
  anneeSortie: number;
  poste: string;
  situationActuelle: string;
}

export interface PayrollRecord {
  id: string;
  employeId: string;
  employeNom: string;
  employePrenom: string;
  fonction: string;
  mois: string;
  salaireBase: number;
  bonus: number;
  deductions: number;
  netAPayer: number;
  statut: "paye" | "en_attente" | "annule";
  datePaiement?: string;
  modePaiement: "virement" | "especes" | "chèque" | "mobile";
  notes?: string;
}
