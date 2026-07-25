import { Player, PlayerFormValues } from "@/types/club";

export const normalizePlayerFormValues = (
  values: PlayerFormValues,
): PlayerFormValues => ({
  photoUrl: values.photoUrl.trim(),
  nom: values.nom.trim(),
  prenom: values.prenom.trim(),
  dateNaissance: values.dateNaissance.trim(),
  poste: values.poste.trim(),
  sexe: values.sexe,
  categorie: values.categorie.trim(),
  telephone: values.telephone.trim(),
  email: values.email.trim(),
  adresse: values.adresse.trim(),
  statut: values.statut,
  cotisationMontant: Number.isFinite(values.cotisationMontant)
    ? values.cotisationMontant
    : 0,
  cotisationDevise: values.cotisationDevise || "US",
  cotisationStatut: values.cotisationStatut,
});

export const toPlayerFormValues = (player: Player): PlayerFormValues => ({
  ...normalizePlayerFormValues({
    photoUrl: player.photoUrl,
    nom: player.nom,
    prenom: player.prenom,
    dateNaissance: player.dateNaissance,
    poste: player.poste,
    sexe: player.sexe,
    categorie: player.categorie,
    telephone: player.telephone,
    email: player.email,
    adresse: player.adresse,
    statut: player.statut,
    cotisationMontant: player.cotisationMontant,
    cotisationDevise: player.cotisationDevise,
    cotisationStatut: player.cotisationStatut,
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
