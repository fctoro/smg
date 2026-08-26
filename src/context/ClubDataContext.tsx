"use client";

import { getSeasonCode, generatePlayerMatricule } from "@/lib/club/season";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  mockAlumni,
  mockEmployees,
  mockEvents,
  mockParents,
  mockPayments,
  mockPlayers,
  mockStaff,
} from "@/data/club/mock-data";
import {
  Alumni,
  ClubEvent,
  Employee,
  Parent,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Player,
  PlayerStatus,
  StaffMember,
  Invoice,
  PayrollRecord,
  PricingItem,
} from "@/types/club";
import { supabase } from "@/lib/supabaseClient";
import { groupParentsByFamily } from "@/lib/club/parents";
import {
  fetchRubriquesFromSupabase,
  addRubriqueToSupabase,
  updateRubriqueInSupabase,
  deleteRubriqueInSupabase,
  DEFAULT_PRICING_ITEMS,
} from "@/lib/club/supabase-crud";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface ClubDataContextValue {
  players: Player[];
  setPlayers: SetState<Player[]>;
  parents: Parent[];
  setParents: SetState<Parent[]>;
  employees: Employee[];
  setEmployees: SetState<Employee[]>;
  staff: StaffMember[];
  setStaff: SetState<StaffMember[]>;
  alumni: Alumni[];
  setAlumni: SetState<Alumni[]>;
  events: ClubEvent[];
  setEvents: SetState<ClubEvent[]>;
  payments: Payment[];
  setPayments: SetState<Payment[]>;
  invoices: Invoice[];
  setInvoices: SetState<Invoice[]>;
  payrollRecords: PayrollRecord[];
  setPayrollRecords: SetState<PayrollRecord[]>;
  rubriques: PricingItem[];
  setRubriques: SetState<PricingItem[]>;
  refreshRubriques: () => Promise<PricingItem[] | undefined>;
  addRubrique: (data: Omit<PricingItem, "id"> & { id?: string }) => Promise<PricingItem>;
  updateRubrique: (id: string, data: Partial<PricingItem>) => Promise<void>;
  deleteRubrique: (id: string) => Promise<void>;
  hydrated: boolean;
}

const ClubDataContext = createContext<ClubDataContextValue | null>(null);

const STORAGE_KEYS = {
  players: "club-data-players-v1",
  parents: "club-data-parents-v1",
  employees: "club-data-employees-v1",
  staff: "club-data-staff-v1",
  alumni: "club-data-alumni-v1",
  events: "club-data-events-v1",
  payments: "club-data-payments-v1",
  invoices: "club-data-invoices-v1",
  payrollRecords: "club-data-payroll-v3",
};

const parseStoredArray = <T,>(value: string | null, fallback: T[]): T[] => {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const safeSetItem = (key: string, value: any) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`LocalStorage error for key "${key}":`, err);
  }
};

const generateMockPayrollRecords = (empList: any[]): PayrollRecord[] => {
  const records: PayrollRecord[] = [];
  const startYear = 2024;
  const now = new Date();
  const currentYearActual = now.getFullYear() || 2026;
  const currentMonthActual = now.getMonth() + 1; // 7 for July

  const years = Array.from({ length: currentYearActual - startYear + 1 }, (_, i) => currentYearActual - i);

  years.forEach((yearNum) => {
    const yearStr = String(yearNum);
    // For past years: months 1..12. For current year: only up to current month (1..currentMonthActual)
    const maxMonth = yearNum === currentYearActual ? currentMonthActual : 12;

    for (let m = 1; m <= maxMonth; m++) {
      const monthStr = String(m).padStart(2, "0");
      const mIdx = m;

      (empList || []).forEach((emp: any, index: number) => {
        const baseSalary = emp.salaire || emp.Salaire || 400 + (index % 5) * 120;
        const bonus = (index + mIdx) % 3 === 0 ? 50 : 0;
        const prelevementPourcentage = 2;
        const prelevementMontant = Math.round(baseSalary * prelevementPourcentage) / 100;
        const deductions = 25 + prelevementMontant;
        const net = baseSalary + bonus - deductions;
        const mKey = `${yearStr}-${monthStr}`;

        const isCurrentMonth = yearNum === currentYearActual && m === currentMonthActual;
        const isPending = isCurrentMonth && index % 4 === 0;

        const empDevise: "US" | "HTG" = emp.devise || emp.Devise || (baseSalary >= 1000 ? "HTG" : "US");

        records.push({
          id: `pay-${emp.id || emp.EmployeId}-${mKey}`,
          employeId: String(emp.id || emp.EmployeId),
          employeNom: emp.nom || emp.Nom || "Nom",
          employePrenom: emp.prenom || emp.Prenom || "Prénom",
          fonction: emp.fonction || emp.Fonction || emp.role || emp.Profession || "Employé FC Toro",
          mois: mKey,
          salaireBase: baseSalary,
          typeSalaire: "fixe",
          bonus: bonus,
          deductions: deductions,
          prelevementPourcentage,
          prelevementMontant,
          vacancesPayees: 0,
          congeSansSolde: 0,
          cumulPaiements: net,
          netAPayer: net,
          devise: empDevise,
          statut: isPending ? "en_attente" : "paye",
          datePaiement: isPending ? undefined : `${mKey}-25`,
          modePaiement: index % 2 === 0 ? "virement" : "especes",
          notes: `Salaire mensuel (${mKey})`,
        });
      });
    }
  });
  return records;
};

export const ClubDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  // alumni is derived from players
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [rubriques, setRubriques] = useState<PricingItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const item = window.localStorage.getItem("club-data-rubriques-v1");
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (err) {
        console.warn("Rubriques initial cache parse error:", err);
      }
    }
    return DEFAULT_PRICING_ITEMS;
  });
  const [hydrated, setHydrated] = useState(false);

  const refreshRubriques = useCallback(async () => {
    try {
      const loadedRubriques = await fetchRubriquesFromSupabase();
      if (loadedRubriques && loadedRubriques.length > 0) {
        setRubriques(loadedRubriques);
        safeSetItem("club-data-rubriques-v1", loadedRubriques);
      }
      return loadedRubriques;
    } catch (err) {
      console.warn("Erreur chargement rapide des rubriques :", err);
    }
  }, []);

  useEffect(() => {
    refreshRubriques();
  }, [refreshRubriques]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const fetchData = async () => {
      try {
        // Fonction pour paginer et récupérer toutes les lignes d'une table (contourne la limite de 1000 de Supabase)
        const fetchAll = async (table: string) => {
          let allData: any[] = [];
          let from = 0;
          const step = 1000;
          while (true) {
            const { data, error } = await supabase.from(table).select("*").range(from, from + step - 1);
            if (error) {
              console.warn(`Information ${table}:`, error.message || error);
              break;
            }
            if (data && data.length > 0) {
              allData = [...allData, ...data];
              if (data.length < step) break; // Fin des résultats
              from += step;
            } else {
              break;
            }
          }
          return allData;
        };

        const [etudiantsData, paiementsData, inscriptionsData, sessionsData, facturesData, employesData, evenementsData, payrollData, playerStatusData] = await Promise.all([
          fetchAll("tblEtudiants"),
          fetchAll("tblPaiements"),
          fetchAll("tblInscriptions"),
          fetchAll("tblSessions"),
          fetchAll("tblFacture"),
          fetchAll("tblEmployes"),
          fetchAll("tblEvenements").catch(() => []),
          fetchAll("tblPayroll").catch(() => []),
          fetchAll("player_status").catch(() => [])
        ]);

        console.log("[DEBUG ClubDataContext] etudiantsData length:", etudiantsData?.length);

        const sessionsMap = new Map();
        const studentToPrimaryIdMap = new Map<string, string>();
        if (sessionsData && sessionsData.length > 0) {
          sessionsData.forEach((s: any) => {
            if (s.Session && s.Session.trim() !== "") {
              sessionsMap.set(s.SessionId, s.Session.trim());
            } else if (s.DateDebut && s.DateFin) {
              const startYear = new Date(s.DateDebut).getFullYear();
              const endYear = new Date(s.DateFin).getFullYear();
              
              let seasonLabel = "";
              if (startYear === endYear) {
                const month = new Date(s.DateDebut).getMonth() + 1;
                if (month >= 7) {
                  seasonLabel = `${startYear}-${startYear + 1}`;
                } else {
                  seasonLabel = `${startYear - 1}-${startYear}`;
                }
              } else {
                seasonLabel = `${startYear}-${endYear}`;
              }
              
              sessionsMap.set(s.SessionId, seasonLabel);
            } else {
               sessionsMap.set(s.SessionId, "");
            }
          });
        }

        if (etudiantsData && etudiantsData.length > 0) {
          const paiements = paiementsData || [];
          const inscriptions = inscriptionsData || [];
          
          // Créer un Map des statuts depuis player_status
          const playerStatusMap = new Map<string, string>();
          if (playerStatusData && playerStatusData.length > 0) {
            playerStatusData.forEach((ps: any) => {
              playerStatusMap.set(String(ps.player_id), ps.status);
            });
          }
          
          // Filtrage global des étudiants invalides ("x", "xx", sans nom, sponsors)
          const validEtudiants = etudiantsData.filter((d: any) => {
            const nom = (d.Nom || "").toLowerCase().trim();
            const prenom = (d.Prenom || "").toLowerCase().trim();
            
            if (!nom) return false; // Pas de nom = invalide
            if (nom.includes("eugene") && prenom.includes("kensly")) return false;
            if (nom.includes("kensly") && prenom.includes("eugene")) return false;
            if (d.IsDeleted === 1 || d.IsDeleted === true || String(d.IsDeleted).toLowerCase() === "true") return false;
            if (nom.includes("sponsor")) return false; // Exclusion des sponsors
            if (/^x+$/i.test(nom)) return false; // Exclusion de "x", "xx", "xxx"...
            if (nom === "test") return false;
            if (/^x+$/i.test(prenom)) return false; // Exclusion si le prénom est juste "x" ou "xx"

            // Masquer les joueurs qui n'ont pas encore été validés par l'admin (venant du site public par ex)
            const statutJoueur = String(d.StatutJoueur || "").toLowerCase().trim();
            if (statutJoueur === "en attente" || statutJoueur === "a venir" || statutJoueur === "A venir" || statutJoueur === "nouveau") {
              return false;
            }

            return true;
          });
          
          console.log("[DEBUG ClubDataContext] validEtudiants length:", validEtudiants?.length);

          // Regroupement et déduplication des joueurs par nom et prénom
          const nameGroups = new Map<string, any[]>();
          validEtudiants.forEach((d: any) => {
            const normNom = (d.Nom || "").trim().toLowerCase().replace(/\s+/g, " ");
            const normPrenom = (d.Prenom || "").trim().toLowerCase().replace(/\s+/g, " ");
            
            // Si le prénom est manquant, trop court (<2 lettres) ou identique au nom, ne pas fusionner pour éviter d'écraser des frères ou personnes distinctes
            let key = `${normNom}_${normPrenom}`;
            if (!normPrenom || normPrenom.length < 2 || normNom === normPrenom) {
              key = `id_${d.EtudiantID}`;
            }
            
            if (!nameGroups.has(key)) {
              nameGroups.set(key, []);
            }
            nameGroups.get(key)!.push(d);
          });

          const fetchedPlayers: Player[] = [];

          nameGroups.forEach((group) => {
            // Trier le groupe pour trouver l'entrée d'origine (la première inscription / création)
            const sortedGroup = [...group].sort((a, b) => {
              const dateA = a.DtCreation ? new Date(a.DtCreation).getTime() : Infinity;
              const dateB = b.DtCreation ? new Date(b.DtCreation).getTime() : Infinity;
              if (dateA !== dateB && !isNaN(dateA) && !isNaN(dateB)) {
                return dateA - dateB;
              }
              const idA = Number(a.EtudiantID) || 0;
              const idB = Number(b.EtudiantID) || 0;
              return idA - idB;
            });

            // Priorité à l'entrée possédant explicitement une saison initiale "2022-2023" ou la plus ancienne
            const recordWithSeason2223 = sortedGroup.find(g => g.Saison && String(g.Saison).includes("2022-2023"));
            const primaryRecord = recordWithSeason2223 || sortedGroup[0];
            const primaryId = String(primaryRecord.EtudiantID);

            // Récupérer tous les IDs liés à cette même personne et les mapper vers primaryId
            const allGroupIds = group.map((g) => g.EtudiantID);
            allGroupIds.forEach((gid) => {
              studentToPrimaryIdMap.set(String(gid), primaryId);
            });

            // Agrégation de tous les paiements des doublons
            const studentPayments = paiements.filter((p: any) => allGroupIds.includes(p.EtudiantId));
            // On additionne uniquement les montants USD (MntPayeUS) pour éviter de mélanger HTG et USD
            // Les paiements en HTG ont MntPayeUS=0 et MntPayeGd > 0, donc on les ignore ici
            const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + (Number(p.MntPayeUS) || 0), 0);
            const sortedPayments = [...studentPayments].sort((a: any, b: any) => 
              new Date(b.DateTransact || 0).getTime() - new Date(a.DateTransact || 0).getTime()
            );
            const dernierPaiementDate = sortedPayments.length > 0 && sortedPayments[0].DateTransact 
              ? sortedPayments[0].DateTransact.split("T")[0] 
              : "";

            // Agrégation de toutes les inscriptions des doublons
            const studentInscriptions = inscriptions.filter((i: any) => allGroupIds.includes(i.EtudiantId));
            
            // Inscriptions triées par date croissante (pour identifier la PREMIÈRE saison d'entrée)
            const sortedInscriptionsAsc = [...studentInscriptions].sort((a: any, b: any) =>
              new Date(a.DateInscription || 0).getTime() - new Date(b.DateInscription || 0).getTime()
            );
            let firstSeasonStr = sortedInscriptionsAsc.length > 0 ? sessionsMap.get(sortedInscriptionsAsc[0].SessionId) : "";

            // Inscriptions triées par date décroissante (pour la saison actuelle d'affichage)
            const sortedInscriptionsDesc = [...studentInscriptions].sort((a: any, b: any) =>
              new Date(b.DateInscription || 0).getTime() - new Date(a.DateInscription || 0).getTime()
            );
            let latestSeasonStr = sortedInscriptionsDesc.length > 0 ? sessionsMap.get(sortedInscriptionsDesc[0].SessionId) : "";

            let entrySeason = firstSeasonStr || primaryRecord.Saison || "";
            if (!entrySeason && primaryRecord.DtCreation) {
              const dt = new Date(primaryRecord.DtCreation);
              if (!isNaN(dt.getTime())) {
                const y = dt.getFullYear();
                const m = dt.getMonth() + 1;
                let startYear, endYear;
                if (m >= 7) {
                  startYear = y;
                  endYear = y + 1;
                } else {
                  startYear = y - 1;
                  endYear = y;
                }
                entrySeason = `${startYear}-${endYear}`;
              }
            }

            // Génération du matricule PERMANENT basé sur la 1ère saison d'entrée (ex: FCT-2223-4129 ou DET-2223-4129)
            const isDetection = group.some(g => (g.Info1 && String(g.Info1).includes("DETECTION")) || String(g.sourceDetection) === "true");
            const matricule = generatePlayerMatricule(primaryRecord.EtudiantID, entrySeason, isDetection);

            // Fusion des champs d'information
            const photoUrl = group.find(g => g.PhotoUrl && !g.PhotoUrl.includes("silhouette"))?.PhotoUrl || primaryRecord.PhotoUrl || "/images/user/silhouette.svg";
            const poste = group.find(g => g.Poste || g.poste)?.Poste || group.find(g => g.poste)?.poste || "Joueur";
            const sexe = group.find(g => g.Sexe === "F") ? "Féminin" : "Masculin";
            const telephone = group.find(g => g.Telephone)?.Telephone || "";
            const email = group.find(g => g.Email)?.Email || "";
            const dateNaissance = group.find(g => g.DateNaissance)?.DateNaissance || "";
            const adresse = group.find(g => g.Adresse)?.Adresse || "";

            // Informations parents du joueur
            const parentNomRec = group.find(g => g.NomParent)?.NomParent || primaryRecord.NomParent || "";
            const parentPrenomRec = group.find(g => g.PrenomParent)?.PrenomParent || primaryRecord.PrenomParent || "";
            let parentNomPrenom = (parentNomRec || parentPrenomRec)
              ? `${parentNomRec} ${parentPrenomRec}`.trim()
              : (primaryRecord.NomParent || "");
              
            // Fallback si NomParent et PrenomParent sont vides
            if (!parentNomPrenom) {
              parentNomPrenom = primaryRecord.EngagementFinancierNom 
                || primaryRecord.UrgenceNomPrenom 
                || primaryRecord.NomContact 
                || "";
            }
            const parentTelephone = group.find(g => g.TelephoneParent)?.TelephoneParent || primaryRecord.TelephoneParent || telephone;
            const parentEmail = group.find(g => g.EmailParent)?.EmailParent || primaryRecord.EmailParent || email;
            const parentAdresse = group.find(g => g.AdresseParent)?.AdresseParent || primaryRecord.AdresseParent || adresse;

            const photoIdentiteUrl = group.find(g => g.PhotoIdentiteUrl)?.PhotoIdentiteUrl || primaryRecord.PhotoIdentiteUrl || "";
            const acteNaissanceUrl = group.find(g => g.ActeNaissanceUrl)?.ActeNaissanceUrl || primaryRecord.ActeNaissanceUrl || "";
            const carteIdentiteParentUrl = group.find(g => g.CarteIdentiteParentUrl)?.CarteIdentiteParentUrl || primaryRecord.CarteIdentiteParentUrl || "";
            const fiche9eUrl = group.find(g => g.Info2)?.Info2 || primaryRecord.Info2 || "";
            const carnetVaccinationUrl = group.find(g => g.Info3)?.Info3 || primaryRecord.Info3 || "";

            // Détermination du statut réel du joueur
            const savedPlayerStatus = String(primaryRecord.StatutJoueur || "").trim().toLowerCase();
            let playerStatus: PlayerStatus = "actif";

            const isAlumni = group.some(g => g.EstAlumni === true || g.EstAlumni === 1 || String(g.EstAlumni).toLowerCase() === "true" || String(g.StatutJoueur).toLowerCase() === "alumni");
            const isAbandon = group.some(g => g.Abandon === true || g.Abandon === 1 || String(g.Abandon).toLowerCase() === "true" || String(g.StatutJoueur).toLowerCase().includes("abandon"));
            const isInactive = group.every(g => g.Actif === false || g.Actif === 0 || String(g.Actif).toLowerCase() === "false" || String(g.StatutJoueur).toLowerCase().includes("inactif"));
            const isBlesse = group.some(g => String(g.StatutJoueur).toLowerCase().includes("bless"));
            const isSuspendu = group.some(g => String(g.StatutJoueur).toLowerCase().includes("suspend"));

            if (isAlumni) {
              playerStatus = "alumni";
            } else if (isAbandon) {
              playerStatus = "abandonne";
            } else if (isInactive) {
              playerStatus = "inactif";
            } else if (isBlesse) {
              playerStatus = "blesse";
            } else if (isSuspendu) {
              playerStatus = "suspendu";
            } else if (savedPlayerStatus && ["actif", "inactif", "blesse", "suspendu", "abandonne", "alumni"].includes(savedPlayerStatus)) {
              playerStatus = savedPlayerStatus as PlayerStatus;
            }

            let finalStatutJoueur = savedPlayerStatus || undefined;
            for (const id of allGroupIds) {
              const st = playerStatusMap.get(String(id));
              if (st) {
                if (["actif", "inactif", "blesse", "suspendu", "abandonne", "alumni"].includes(st.toLowerCase())) {
                  playerStatus = st.toLowerCase() as PlayerStatus;
                } else {
                  finalStatutJoueur = st;
                }
              }
            }

            // Fallback pour le statut principal si finalStatutJoueur contenait un statut de base
            if (finalStatutJoueur && ["actif", "inactif", "blesse", "suspendu", "abandonne", "alumni"].includes(finalStatutJoueur.toLowerCase())) {
              playerStatus = finalStatutJoueur.toLowerCase() as PlayerStatus;
              finalStatutJoueur = undefined;
            }

            let currentDisplaySeason = latestSeasonStr || primaryRecord.Saison || entrySeason || "";
            if (typeof currentDisplaySeason === 'string' && currentDisplaySeason.trim().toLowerCase() === "saison 2026-2027") {
              currentDisplaySeason = "2026-2027";
            }

            // Contact d'urgence (recherche robuste sur toutes les colonnes et entrées du groupe)
            const findInGroup = (keys: string[]) => {
              for (const g of group) {
                for (const k of keys) {
                  if (g[k] !== undefined && g[k] !== null && String(g[k]).trim() !== "") {
                    return String(g[k]).trim();
                  }
                }
              }
              return "";
            };

            const urgenceNomPrenom = findInGroup(["UrgenceNomPrenom", "NomUrgence", "UrgenceNom", "ContactUrgence", "PersonneUrgence", "EmergencyName", "emergency_name", "NomContact"]);
            const urgenceLien = findInGroup(["UrgenceLien", "LienUrgence", "LienParenteUrgence", "LienUrgent", "EmergencyRelation", "emergency_relation"]);
            const urgenceTelephone = findInGroup(["UrgenceTelephone", "TelUrgence", "TelephoneUrgence", "UrgencePhone", "PhoneUrgence", "EmergencyPhone", "emergency_phone", "TelephoneContact"]);
            const urgenceEmail = findInGroup(["UrgenceEmail", "EmailUrgence", "EmergencyEmail", "emergency_email", "EmailContact"]);
            const urgenceAdresse = findInGroup(["UrgenceAdresse", "AdresseUrgence", "EmergencyAddress", "emergency_address", "AdresseContact"]);

            fetchedPlayers.push({
              id: primaryId,
              matricule: matricule,
              nom: primaryRecord.Nom || "",
              prenom: primaryRecord.Prenom || "",
              photoUrl,
              photoIdentiteUrl,
              acteNaissanceUrl,
              carteIdentiteParentUrl,
              fiche9eUrl,
              carnetVaccinationUrl,
              poste,
              sexe,
              categorie: (() => {
                const rawCat = (group.find(g => g.Categorie || g.categorie || g.Category || g.category)?.Categorie || primaryRecord.Categorie || "").toString().trim();
                const lowerCat = rawCat.toLowerCase();

                if (rawCat && lowerCat !== "ti toro" && lowerCat !== "titoro" && lowerCat !== "default") {
                  if (/^u-?\d+$/i.test(lowerCat)) {
                    const num = lowerCat.replace(/[^\d]/g, "");
                    return `U${num}`;
                  }
                  return rawCat;
                }

                if (dateNaissance) {
                  const dt = new Date(dateNaissance);
                  if (!isNaN(dt.getTime())) {
                    const birthYear = dt.getFullYear();
                    const currentYear = new Date().getFullYear();
                    const age = currentYear - birthYear;

                    if (age <= 6) return "ti toro";
                    if (age <= 8) return "U8";
                    if (age <= 10) return "U10";
                    if (age <= 12) return "U12";
                    if (age <= 14) return "U14";
                    if (age <= 16) return "U16";
                    if (age <= 18) return "U18";
                    return "Senior";
                  }
                }

                return rawCat || "Senior";
              })(),
               statut: playerStatus,
              statutJoueur: finalStatutJoueur,
              sourceDetection: isDetection,
              cotisationDevise: primaryRecord.CotisationDevise || "US",
              telephone,
              email,
              dateInscription: primaryRecord.DtCreation ? primaryRecord.DtCreation.split("T")[0] : (primaryRecord.Saison ? `${primaryRecord.Saison.substring(0, 4)}-09-01` : ""),
              dateNaissance: dateNaissance ? dateNaissance.split("T")[0] : "",
              adresse,
              cotisationMontant: totalPaid,
              cotisationStatut: totalPaid > 0 ? "paid" : "pending",
              dernierPaiement: dernierPaiementDate,
              saison: currentDisplaySeason,
              parentNomPrenom,
              parentTelephone,
              parentEmail,
              parentAdresse,
              parentLien: group.find(g => g.LienParente)?.LienParente || primaryRecord.LienParente || "",
              urgenceNomPrenom,
              urgenceLien,
              urgenceTelephone,
              urgenceEmail,
              urgenceAdresse,
              tailleHaut: group.find(g => g.TailleHaut || g.TailleMaillot)?.TailleHaut || group.find(g => g.TailleMaillot)?.TailleMaillot || primaryRecord.TailleHaut || primaryRecord.TailleMaillot || "Choisir",
              tailleShort: group.find(g => g.TailleShort)?.TailleShort || primaryRecord.TailleShort || "Choisir",
              numerosPreferes: group.find(g => g.NumerosPreferes)?.NumerosPreferes || primaryRecord.NumerosPreferes || "",
              ecole: group.find(g => g.Ecole)?.Ecole || primaryRecord.Ecole || "",
              experienceSoccer: group.find(g => g.ExperienceFoot || g.Experience)?.ExperienceFoot || group.find(g => g.Experience)?.Experience || primaryRecord.ExperienceFoot || primaryRecord.Experience || "",
              planPaiement: group.find(g => g.PlanPaiement || g.PaymentPlan)?.PlanPaiement || group.find(g => g.PaymentPlan)?.PaymentPlan || primaryRecord.PlanPaiement || primaryRecord.PaymentPlan || "",
              modePaiementChoisi: group.find(g => g.MethodePaiement)?.MethodePaiement || primaryRecord.MethodePaiement || "",
              programme: group.find(g => g.Programme)?.Programme || primaryRecord.Programme || "",
              commentIdentifie: (() => {
                const info1 = group.find(g => g.Info1)?.Info1 || "";
                const match = String(info1).match(/IDENTIFIE:([^|]+)/);
                return match ? match[1].trim() : "";
              })(),
              piedDominant: (() => {
                const info1 = group.find(g => g.Info1)?.Info1 || "";
                const match = String(info1).match(/PIED:([^|]+)/);
                return match ? match[1].trim() : "";
              })(),
              clubActuel: (() => {
                const info1 = group.find(g => g.Info1)?.Info1 || "";
                const match = String(info1).match(/CLUB:([^|]+)/);
                return match ? match[1].trim() : "";
              })(),
              postePrincipal: (() => {
                const info1 = group.find(g => g.Info1)?.Info1 || "";
                const match = String(info1).match(/POSTE_P:([^|]+)/);
                return match ? match[1].trim() : "";
              })(),
              posteSecondaire: (() => {
                const info1 = group.find(g => g.Info1)?.Info1 || "";
                const match = String(info1).match(/POSTE_S:([^|]+)/);
                return match ? match[1].trim() : "";
              })(),
            });
          });

          const fetchedParents: Parent[] = validEtudiants
            .filter((d: any) => d.NomParent || d.PrenomParent)
            .map((d: any) => {
              let tel = d.TelephoneParent || "";
              let mail = d.EmailParent || "";
              
              // Correction des erreurs de saisie dans la DB : Email saisi dans la case Téléphone
              if (tel.includes("@") && !mail) {
                mail = tel;
                tel = "";
              } else if (tel.includes("@") && mail) {
                const temp = mail;
                mail = tel;
                tel = temp; 
              }

              const parentPlayerId = studentToPrimaryIdMap.get(String(d.EtudiantID)) || String(d.EtudiantID);

              return {
                id: `pa-${d.EtudiantID}`,
                nom: d.NomParent || "",
                prenom: d.PrenomParent || "",
                telephone: tel,
                email: mail,
                lien: d.LienParente || "Parent",
                playerId: parentPlayerId,
              };
            });

          setPlayers(fetchedPlayers);
          setParents(groupParentsByFamily(fetchedParents));

          // Charger les paiements depuis tblPaiements dans l'état payments
          if (paiementsData && paiementsData.length > 0) {
            const modeMap: Record<number, PaymentMethod> = {
              1: "especes",
              2: "carte",
              3: "virement",
              4: "mobile",
              5: "mobile",
            };
            const fetchedPayments: Payment[] = paiementsData.map((p: any) => {
              const rawPid = String(p.EtudiantId);
              const resolvedPid = studentToPrimaryIdMap.get(rawPid) || rawPid;
              const mntUS = Number(p.MntPayeUS) || 0;
              const mntGd = Number(p.MntPayeGd) || 0;
              const devise: "US" | "HTG" = mntGd > 0 ? "HTG" : "US";
              const montant = mntGd > 0 ? mntGd : mntUS;
              
              let methode: PaymentMethod = "especes";
              if (typeof p.ModePaiement === "number") {
                methode = modeMap[p.ModePaiement] || "especes";
              } else if (typeof p.ModePaiement === "string") {
                const lower = p.ModePaiement.toLowerCase();
                if (lower.includes("vir") || lower === "3") methode = "virement";
                else if (lower.includes("cart") || lower === "2") methode = "carte";
                else if (lower.includes("mob") || lower.includes("moncash") || lower === "4" || lower === "5") methode = "mobile";
                else methode = "especes";
              }

              return {
                id: String(p.Id),
                playerId: resolvedPid,
                montant,
                montantUS: mntUS,
                montantHTG: mntGd,
                devise,
                taux: p.TauxChange || p.taux,
                statut: (p.Statut || "paid").toLowerCase() as PaymentStatus,
                periode: p.Periode || "",
                methode,
                datePaiement: p.DateTransact ? p.DateTransact.split("T")[0] : (p.DatePaiement ? p.DatePaiement.split("T")[0] : ""),
                remarque: p.Remarque || p.Description || "",
              };
            });
            setPayments(fetchedPayments);
          } else {
            setPayments(parseStoredArray<Payment>(window.localStorage.getItem(STORAGE_KEYS.payments), []));
          }
        } else {
          // Fallback sur le storage local si pas de données
          setPlayers(
            parseStoredArray<Player>(
              window.localStorage.getItem(STORAGE_KEYS.players),
              []
            )
          );
          setParents(
            groupParentsByFamily(
              parseStoredArray<Parent>(
                window.localStorage.getItem(STORAGE_KEYS.parents),
                []
              )
            )
          );
          setPayments(
            parseStoredArray<Payment>(
              window.localStorage.getItem(STORAGE_KEYS.payments),
              []
            )
          );
        }

        if (facturesData && facturesData.length > 0) {
          const fetchedInvoices: Invoice[] = facturesData.map((f: any) => {
            const mntA = f.MntAPayer || 0;
            const mntP = f.MntPayeUS || f.MntPayeGd || 0;
            const mntUS = f.MntPayeUS || 0;
            const mntHTG = f.MntPayeGd || 0;
            const rawPid = String(f.EtudiantId);
            const resolvedPid = studentToPrimaryIdMap.get(rawPid) || rawPid;
            return {
              id: String(f.Id),
              noFacture: f.NoFacture || `FCT-XXXX-${String(f.Id).padStart(4, "0")}`,
              playerId: resolvedPid,
              sessionId: String(f.SessionId),
              remarque: f.Remarque || "",
              montantAPayer: mntA,
              montantPaye: mntP,
              devise: f.MntPayeGd ? "HTG" : "US",
              montantUS: mntUS,
              montantHTG: mntHTG,
              dateFacture: f.DateFacture ? f.DateFacture.split("T")[0] : "",
              datePaiement: f.DatePaiement ? f.DatePaiement.split("T")[0] : undefined,
              statut: mntP >= mntA ? "paid" : (mntP > 0 ? "pending" : "late"),
            };
          });
          setInvoices(fetchedInvoices);
        } else {
          setInvoices(
            parseStoredArray<Invoice>(
              window.localStorage.getItem(STORAGE_KEYS.invoices),
              []
            )
          );
        }

        if (employesData) {
          const fetchedEmployees: Employee[] = employesData
            .filter((e: any) => {
              const isDesactive = e.Desactive === 1 || e.Desactive === true || String(e.Desactive).toLowerCase() === "true";
              const isDeleted = e.IsDeleted === 1 || e.IsDeleted === true || String(e.IsDeleted).toLowerCase() === "true";
              return !isDesactive && !isDeleted;
            })
            .map((e: any) => ({
              id: String(e.EmployeId),
              employeId: e.EmployeId,
              nom: e.Nom || "",
              prenom: e.Prenom || "",
              sexe: e.Sexe || "",
              fonction: e.Fonction || e.Profession || "Employé",
              role: e.Fonction || e.Profession || "Employé",
              salaire: e.Salaire || null,
              dateEmbauche: e.DateEmbauche ? e.DateEmbauche.split("T")[0] : "",
              dateDebut: e.DateEmbauche ? e.DateEmbauche.split("T")[0] : "",
              telephone: e.Telephone || "",
              email: e.Email || "",
              adresse: e.Adresse || "",
              niveauEtude: e.NiveauEtude || "",
              profession: e.Profession || "",
              photoUrl: e.Photo || "/images/user/silhouette.svg",
              desactive: false,
            }));
          setEmployees(fetchedEmployees);
          setStaff(fetchedEmployees);
        } else {
          const fallbackEmps = parseStoredArray<Employee>(
            window.localStorage.getItem(STORAGE_KEYS.employees),
            []
          );
          setEmployees(fallbackEmps);
          setStaff(fallbackEmps);
        }

        // Alumni is now derived from players, no need to process it here

        if (evenementsData && evenementsData.length > 0) {
          setEvents(evenementsData);
        } else {
          setEvents(
            parseStoredArray<ClubEvent>(
              window.localStorage.getItem(STORAGE_KEYS.events),
              []
            )
          );
        }
        
        let fetchedPayroll: PayrollRecord[] = [];
        if (payrollData && payrollData.length > 0) {
          fetchedPayroll = payrollData.map((p: any) => {
            const empIdStr = String(p.EmployeId || p.employeid || p.employe_id);
            const emp = employesData?.find((e: any) => String(e.EmployeId || e.employeid) === empIdStr);

            const baseSalary = p.SalaireBase || p.salairebase || p.salaire_base || (emp ? emp.Salaire : 0) || 0;
            const bonus = p.Bonus || p.bonus || 0;
            const deductions = p.Deductions || p.deductions || 0;
            const prelevementPourcentage = p.PrelevementPourcentage || p.prelevementpourcentage || p.prelevement_pourcentage || 2;
            const prelevementMontant =
              p.PrelevementMontant ||
              p.prelevementmontant ||
              p.prelevement_montant ||
              Math.round(baseSalary * prelevementPourcentage) / 100;
            const fallbackNet = baseSalary + bonus - deductions;

            return {
              id: String(p.Id || p.id),
              employeId: empIdStr,
              employeNom: p.EmployeNom || p.employenom || p.employe_nom || (emp ? emp.Nom : ""),
              employePrenom: p.EmployePrenom || p.employeprenom || p.employe_prenom || (emp ? emp.Prenom : ""),
              fonction: p.Fonction || p.fonction || (emp ? (emp.Fonction || emp.Profession) : ""),
              mois: p.Mois || p.mois || "",
              salaireBase: baseSalary,
              typeSalaire: p.TypeSalaire || p.typesalaire || p.type_salaire || "fixe",
              nombreSeances: p.NombreSeances || p.nombreseances || p.nombre_seances || 0,
              tauxParSeance: p.TauxParSeance || p.tauxparseance || p.taux_par_seance || 0,
              bonus: bonus,
              deductions: deductions,
              prelevementPourcentage,
              prelevementMontant,
              prelevementAvance: p.PrelevementAvance || p.prelevementavance || p.prelevement_avance || 0,
              prelevementType: p.PrelevementType || p.prelevementtype || p.prelevement_type || "taxe",
              vacancesPayees: p.VacancesPayees || p.vacancespayees || p.vacances_payees || 0,
              congeSansSolde: p.CongeSansSolde || p.congesanssolde || p.conge_sans_solde || 0,
              cumulPaiements: p.CumulPaiements || p.cumulpaiements || p.cumul_paiements || fallbackNet,
              netAPayer: p.NetAPayer || p.netapayer || p.net_a_payer || fallbackNet,
              devise: (p.Devise || p.devise || (emp?.Devise || emp?.devise) || (baseSalary >= 1000 ? "HTG" : "US")) as "US" | "HTG",
              statut: p.Statut || p.statut || "en_attente",
              datePaiement: p.DatePaiement || p.datepaiement || p.date_paiement ? (p.DatePaiement || p.datepaiement || p.date_paiement).split("T")[0] : undefined,
              modePaiement: p.ModePaiement || p.modepaiement || p.mode_paiement || "especes",
              notes: p.Notes || p.notes || "",
              pieceJointe: p.PieceJointe || p.piecejointe || p.piece_jointe || "",
            };
          });
        }

        setPayrollRecords(fetchedPayroll);

        // Fetch Rubriques
        const loadedRubriques = await fetchRubriquesFromSupabase();
        setRubriques(loadedRubriques);
      } catch (err) {
        console.error("Erreur lors de la récupération des données", err);
      }

      setHydrated(true);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(STORAGE_KEYS.players, players);
  }, [hydrated, players]);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(STORAGE_KEYS.parents, parents);
  }, [hydrated, parents]);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(STORAGE_KEYS.employees, employees);
    safeSetItem(STORAGE_KEYS.staff, employees);
  }, [hydrated, employees]);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(STORAGE_KEYS.events, events);
  }, [hydrated, events]);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(STORAGE_KEYS.payments, payments);
  }, [hydrated, payments]);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(STORAGE_KEYS.invoices, invoices);
  }, [hydrated, invoices]);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem(STORAGE_KEYS.payrollRecords, payrollRecords);
  }, [hydrated, payrollRecords]);

  useEffect(() => {
    if (!hydrated) return;
    safeSetItem("club-data-rubriques-v1", rubriques);
  }, [hydrated, rubriques]);

  const addRubrique = async (data: Omit<PricingItem, "id"> & { id?: string }) => {
    const created = await addRubriqueToSupabase(data);
    setRubriques((prev) => {
      const updated = [...prev.filter((r) => r.id !== created.id), created];
      safeSetItem("club-data-rubriques-v1", updated);
      return updated;
    });
    return created;
  };

  const updateRubrique = async (id: string, data: Partial<PricingItem>) => {
    await updateRubriqueInSupabase(id, data);
    setRubriques((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, ...data } : r));
      safeSetItem("club-data-rubriques-v1", updated);
      return updated;
    });
  };

  const deleteRubrique = async (id: string) => {
    await deleteRubriqueInSupabase(id);
    setRubriques((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      safeSetItem("club-data-rubriques-v1", updated);
      return updated;
    });
  };

  const alumni = useMemo(() => players.filter(p => p.statut === "alumni"), [players]);

  return (
    <ClubDataContext.Provider
      value={{
        players,
        setPlayers,
        parents,
        setParents,
        employees,
        setEmployees,
        staff,
        setStaff,
        alumni,
        setAlumni: () => {}, 
        events,
        setEvents,
        payments,
        setPayments,
        invoices,
        setInvoices,
        payrollRecords,
        setPayrollRecords,
        rubriques,
        setRubriques,
        refreshRubriques,
        addRubrique,
        updateRubrique,
        deleteRubrique,
        hydrated,
      }}
    >
      {children}
    </ClubDataContext.Provider>
  );
};

export const useClubData = () => {
  const context = useContext(ClubDataContext);
  if (!context) {
    throw new Error("useClubData must be used inside ClubDataProvider");
  }
  return context;
};