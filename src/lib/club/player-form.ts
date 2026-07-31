import { Player, PlayerFormValues } from "@/types/club";

export const normalizePlayerFormValues = (
  values: PlayerFormValues,
): PlayerFormValues => ({
  photoUrl: (values.photoUrl || "").trim(),
  nom: (values.nom || "").trim(),
  prenom: (values.prenom || "").trim(),
  dateNaissance: (values.dateNaissance || "").trim(),
  poste: (values.poste || "").trim(),
  sexe: values.sexe || "Masculin",
  categorie: (values.categorie || "").trim(),
  telephone: (values.telephone || "").trim(),
  email: (values.email || "").trim(),
  adresse: (values.adresse || "").trim(),
  statut: values.statut || "actif",
  cotisationMontant: Number.isFinite(values.cotisationMontant)
    ? values.cotisationMontant
    : 0,
  cotisationDevise: values.cotisationDevise || "US",
  cotisationStatut: values.cotisationStatut || "pending",

  photoIdentiteUrl: values.photoIdentiteUrl,
  acteNaissanceUrl: values.acteNaissanceUrl,
  carteIdentiteParentUrl: values.carteIdentiteParentUrl,
  dossierPdfUrl: values.dossierPdfUrl,

  programme: values.programme || "FC Toro (6 ans et plus)",
  ecole: values.ecole || "",
  experienceSoccer: values.experienceSoccer || "",

  parentNomPrenom: values.parentNomPrenom || "",
  parentEmail: values.parentEmail || "",
  parentTelephone: values.parentTelephone || "",
  parentAdresse: values.parentAdresse || "",

  urgenceNomPrenom: values.urgenceNomPrenom || "",
  urgenceLien: values.urgenceLien || "",
  urgenceTelephone: values.urgenceTelephone || "",
  urgenceEmail: values.urgenceEmail || "",
  urgenceAdresse: values.urgenceAdresse || "",

  tailleHaut: values.tailleHaut || "M",
  tailleShort: values.tailleShort || "M",
  numerosPreferes: values.numerosPreferes || "",

  planPaiement: values.planPaiement || "PLAN #1 (Annuel)",
  modePaiementChoisi: values.modePaiementChoisi || "Transfert bancaire",
});

export const toPlayerFormValues = (player: Player): PlayerFormValues => ({
  ...normalizePlayerFormValues({
    photoUrl: player.photoUrl || "",
    nom: player.nom || "",
    prenom: player.prenom || "",
    dateNaissance: player.dateNaissance || "",
    poste: player.poste || "",
    sexe: player.sexe,
    categorie: player.categorie || "",
    telephone: player.telephone || "",
    email: player.email || "",
    adresse: player.adresse || "",
    statut: player.statut,
    cotisationMontant: player.cotisationMontant,
    cotisationDevise: player.cotisationDevise,
    cotisationStatut: player.cotisationStatut,
    photoIdentiteUrl: player.photoIdentiteUrl,
    acteNaissanceUrl: player.acteNaissanceUrl,
    carteIdentiteParentUrl: player.carteIdentiteParentUrl,
    dossierPdfUrl: player.dossierPdfUrl,

    programme: player.programme,
    ecole: player.ecole,
    experienceSoccer: player.experienceSoccer,

    parentNomPrenom: player.parentNomPrenom,
    parentEmail: player.parentEmail,
    parentTelephone: player.parentTelephone,
    parentAdresse: player.parentAdresse,

    urgenceNomPrenom: player.urgenceNomPrenom,
    urgenceLien: player.urgenceLien,
    urgenceTelephone: player.urgenceTelephone,
    urgenceEmail: player.urgenceEmail,
    urgenceAdresse: player.urgenceAdresse,

    tailleHaut: player.tailleHaut,
    tailleShort: player.tailleShort,
    numerosPreferes: player.numerosPreferes,

    planPaiement: player.planPaiement,
    modePaiementChoisi: player.modePaiementChoisi,
  }),
});

export const createPlayerFromForm = (
  id: string,
  values: PlayerFormValues,
  dateInscription: string,
): Player => {
  const normalized = normalizePlayerFormValues(values);
  const avatar =
    normalized.photoUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${normalized.prenom} ${normalized.nom}`.trim() || "Nouveau Joueur",
    )}&background=0D8ABC&color=fff`;

  return {
    id,
    ...normalized,
    photoUrl: avatar,
    dateInscription,
    dernierPaiement: dateInscription,
  };
};
