export type PlayerStatus = "actif" | "blesse" | "suspendu" | "abandonne" | "alumni";

export type PaymentStatus = "paid" | "pending" | "late";

export type EventType = "match" | "entrainement" | "reunion";

export type EventCalendarColor = "Danger" | "Success" | "Primary" | "Warning";

export type PaymentMethod = "virement" | "carte" | "especes" | "mobile";

export type StaffRole = "Coach" | "Assistant" | "Admin" | "Medical";

export type MatchFormResult = "W" | "D" | "L";

export type MatchState = "FT" | "A venir";

export interface Coach {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  sexe?: string;
  categories: string[];
  saison?: string;
  created_at?: string;
}

export interface Effectif {
  id: string;
  nom: string;
  date_match: string;
  periode: string;
  categorie: string;
  joueurs: string[];
  tactique_id?: string;
  coach_email: string;
  created_at?: string;
}

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
  photoIdentiteUrl?: string;
  acteNaissanceUrl?: string;
  carteIdentiteParentUrl?: string;
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
  montantUS: number;
  montantHTG: number;
  devise: "US" | "HTG";
  taux?: number;
  statut: PaymentStatus;
  periode: string;
  methode: PaymentMethod;
  datePaiement?: string;
  remarque?: string;
}

export interface Invoice {
  id: string;
  noFacture: string;
  playerId: string;
  sessionId: string;
  remarque: string;
  montantAPayer: number;
  montantPaye: number;
  montantUS: number;
  montantHTG: number;
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
  playerIds?: string[];
}

export interface Employee {
  id: string;
  employeId?: number;
  nom: string;
  prenom: string;
  sexe?: string;
  fonction: string;
  salaire?: number | null;
  devise?: "US" | "HTG";
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

export type Alumni = Player;

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
  photoIdentiteUrl?: string;
  acteNaissanceUrl?: string;
  carteIdentiteParentUrl?: string;
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
  devise?: "US" | "HTG";
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

export type AlumniFormValues = PlayerFormValues;

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
  prelevementPourcentage?: number;
  prelevementMontant?: number;
  netAPayer: number;
  devise?: "US" | "HTG";
  statut: "paye" | "en_attente" | "annule";
  datePaiement?: string;
  modePaiement: "virement" | "especes" | "chèque" | "mobile";
  notes?: string;
  pieceJointe?: string;
}

export interface SiteMessage {
  id: string;
  type_message: "inscription_joueur" | "devenir_fan" | "stagiaire" | "contact_general";
  statut: "nouveau" | "lu" | "archive" | "inscrit";
  contact_nom: string;
  contact_email: string;
  contact_telephone?: string;
  sujet?: string;
  contenu?: string;
  reference_id?: string; // ID from specific tables
  created_at: string;
  metadata?: any;
}
