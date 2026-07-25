import { Parent } from "@/types/club";

const normalize = (value: string | undefined | null) =>
  (value || "").trim().toLowerCase();

const getPlayerIds = (parent: Parent) => {
  if (parent.playerIds?.length) {
    return parent.playerIds.filter(Boolean);
  }
  return parent.playerId ? [parent.playerId] : [];
};

export const getParentFamilyKey = (parent: Parent) => {
  const email = normalize(parent.email);
  if (email) {
    return `email:${email}`;
  }

  const fullName = `${normalize(parent.prenom)} ${normalize(parent.nom)}`.trim();
  const telephone = normalize(parent.telephone);
  return `name:${fullName}|phone:${telephone}`;
};

export const groupParentsByFamily = (parents: Parent[]): Parent[] => {
  const map = new Map<string, Parent>();

  parents.forEach((parent) => {
    const key = getParentFamilyKey(parent);
    const playerIds = getPlayerIds(parent);

    if (!map.has(key)) {
      map.set(key, {
        ...parent,
        playerId: parent.playerId || playerIds[0] || "",
        playerIds: Array.from(new Set(playerIds)),
      });
      return;
    }

    const current = map.get(key)!;
    const mergedPlayerIds = Array.from(
      new Set([...(current.playerIds || []), ...playerIds]),
    );

    map.set(key, {
      ...current,
      nom: current.nom || parent.nom,
      prenom: current.prenom || parent.prenom,
      telephone: current.telephone || parent.telephone,
      email: current.email || parent.email,
      lien: current.lien || parent.lien,
      playerId: current.playerId || parent.playerId || mergedPlayerIds[0] || "",
      playerIds: mergedPlayerIds,
    });
  });

  return Array.from(map.values());
};

export const getParentLinkedPlayerIds = (parent: Parent) => {
  return parent.playerIds?.length ? parent.playerIds : parent.playerId ? [parent.playerId] : [];
};
