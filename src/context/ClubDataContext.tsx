"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  Player,
  PlayerStatus,
  StaffMember,
  Invoice,
} from "@/types/club";
import { supabase } from "@/lib/supabaseClient";

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

export const ClubDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hydrated, setHydrated] = useState(false);

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
              console.error(`Erreur ${table}:`, error);
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

        const [etudiantsData, paiementsData, inscriptionsData, sessionsData, facturesData, employesData, alumniData, evenementsData] = await Promise.all([
          fetchAll("tblEtudiants"),
          fetchAll("tblPaiements"),
          fetchAll("tblInscriptions"),
          fetchAll("tblSessions"),
          fetchAll("tblFacture"),
          fetchAll("tblEmployes"),
          fetchAll("tblAlumni").catch(() => []),
          fetchAll("tblEvenements").catch(() => [])
        ]);

        const sessionsMap = new Map();
        if (sessionsData && sessionsData.length > 0) {
          sessionsData.forEach((s: any) => {
            if (s.DateDebut && s.DateFin) {
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
               sessionsMap.set(s.SessionId, s.Session || "");
            }
          });
        }

        if (etudiantsData && etudiantsData.length > 0) {
          const paiements = paiementsData || [];
          const inscriptions = inscriptionsData || [];
          
          // Filtrage global des étudiants invalides ("x", "xx", sans nom, sponsors)
          const validEtudiants = etudiantsData.filter((d: any) => {
            const nom = (d.Nom || "").toLowerCase().trim();
            const prenom = (d.Prenom || "").toLowerCase().trim();
            
            if (!nom) return false; // Pas de nom = invalide
            if (nom.includes("sponsor")) return false; // Exclusion des sponsors
            if (/^x+$/i.test(nom)) return false; // Exclusion de "x", "xx", "xxx"...
            if (nom === "test") return false;
            if (/^x+$/i.test(prenom)) return false; // Exclusion si le prénom est juste "x" ou "xx"

            return true;
          });
          
          const fetchedPlayers: Player[] = validEtudiants.map((d: any) => {
            const studentPayments = paiements.filter((p: any) => p.EtudiantId === d.EtudiantID);
            const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + (p.MntPayeUS || p.MntPayeGd || 0), 0);
            
            const sortedPayments = [...studentPayments].sort((a: any, b: any) => 
              new Date(b.DateTransact || 0).getTime() - new Date(a.DateTransact || 0).getTime()
            );
            const dernierPaiementDate = sortedPayments.length > 0 && sortedPayments[0].DateTransact 
              ? sortedPayments[0].DateTransact.split("T")[0] 
              : "";

            const studentInscriptions = inscriptions.filter((i: any) => i.EtudiantId === d.EtudiantID);
            const sortedInscriptions = [...studentInscriptions].sort((a: any, b: any) =>
              new Date(b.DateInscription || 0).getTime() - new Date(a.DateInscription || 0).getTime()
            );
            const latestSessionId = sortedInscriptions.length > 0 ? sortedInscriptions[0].SessionId : null;
            const playerSaison = latestSessionId != null ? sessionsMap.get(latestSessionId) : "";

            // Génération de la nomenclature matricule (ex: FCT-1213-0001)
            let sCode = "";

            if (playerSaison) {
              // On essaie d'extraire depuis le nom de la saison (ex: "2018-2019")
              const parts = playerSaison.split("-");
              if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
                sCode = parts[0].substring(2, 4) + parts[1].substring(2, 4);
              }
            }

            // Fallback: Si pas de saison, on se base sur la date de création du joueur
            if (!sCode && d.DtCreation) {
              const dt = new Date(d.DtCreation);
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
                sCode = `${String(startYear).substring(2, 4)}${String(endYear).substring(2, 4)}`;
              }
            }

            // Ultime secours si aucune date disponible : saison courante (ex: 2526)
            if (!sCode) {
              const curY = new Date().getFullYear();
              sCode = `${String(curY - 1).substring(2, 4)}${String(curY).substring(2, 4)}`;
            }

            const matricule = `FCT-${sCode}-${String(d.EtudiantID).padStart(4, "0")}`;

            // Détermination du statut réel du joueur
            let playerStatus: PlayerStatus = "actif";
            const allObjStr = (JSON.stringify(d) + JSON.stringify(studentInscriptions)).toLowerCase();
            if (
              allObjStr.includes("abandon") ||
              allObjStr.includes("quitt") ||
              allObjStr.includes("déménag") ||
              allObjStr.includes("demenag") ||
              allObjStr.includes("inactif") ||
              d.Actif === false ||
              d.Actif === 0 ||
              d.Abandon === true ||
              d.Abandon === 1 ||
              d.Abandon === "1"
            ) {
              playerStatus = "abandonne";
            } else if (allObjStr.includes("bless")) {
              playerStatus = "blesse";
            } else if (allObjStr.includes("suspend")) {
              playerStatus = "suspendu";
            }

            return {
              id: String(d.EtudiantID),
              matricule: matricule,
              nom: d.Nom || "",
              prenom: d.Prenom || "",
              photoUrl: d.PhotoUrl || "/images/user/silhouette.svg",
              poste: "Joueur",
              sexe: d.Sexe === "F" ? "Féminin" : "Masculin", 
              categorie: d.Categorie || "ti toro",
              statut: playerStatus,
              cotisationDevise: d.CotisationDevise || "US",
              telephone: d.Telephone || "",
              email: d.Email || "",
              dateInscription: d.DtCreation ? d.DtCreation.split("T")[0] : new Date().toISOString().split("T")[0],
              dateNaissance: d.DateNaissance ? d.DateNaissance.split("T")[0] : "",
              adresse: d.Adresse || "",
              cotisationMontant: totalPaid,
              cotisationStatut: totalPaid > 0 ? "paid" : "pending",
              dernierPaiement: dernierPaiementDate,
              saison: playerSaison || d.Saison || "",
            };
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
                // S'il y a déjà un mail, on garde le tel erroné ou on nettoie
                const temp = mail;
                mail = tel;
                tel = temp; 
              }

              return {
                id: `pa-${d.EtudiantID}`,
                nom: d.NomParent || "",
                prenom: d.PrenomParent || "",
                telephone: tel,
                email: mail,
                lien: d.LienParente || "Parent",
                playerId: String(d.EtudiantID),
              };
            });

          setPlayers(fetchedPlayers);
          setParents(fetchedParents);
        } else {
          // Fallback sur le storage local si pas de données
          setPlayers(
            parseStoredArray<Player>(
              window.localStorage.getItem(STORAGE_KEYS.players),
              []
            )
          );
          setParents(
            parseStoredArray<Parent>(
              window.localStorage.getItem(STORAGE_KEYS.parents),
              []
            )
          );
        }

        if (paiementsData && paiementsData.length > 0) {
          const fetchedPayments: Payment[] = paiementsData
            .map((p: any): Payment => ({
              id: String(p.Id),
              playerId: String(p.EtudiantId),
              montant: p.MntPayeUS || p.MntPayeGd || 0,
              devise: p.MntPayeGd ? "HTG" : "US",
              statut: "paid" as any, // Historique des transactions = payé
              periode: p.DateTransact ? p.DateTransact.substring(0, 7) : new Date().toISOString().substring(0, 7),
              methode: (p.ModePaiement || "especes") as any,
              datePaiement: p.DateTransact ? p.DateTransact.split("T")[0] : undefined,
              remarque: p.Remarque || p.Description || "",
            }))
            .filter((p: Payment) => p.montant > 0); // On exclut les paiements à 0
          setPayments(fetchedPayments);
        } else {
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
            return {
              id: String(f.Id),
              noFacture: f.NoFacture || `FCT-XXXX-${String(f.Id).padStart(4, "0")}`,
              playerId: String(f.EtudiantId),
              sessionId: String(f.SessionId),
              remarque: f.Remarque || "",
              montantAPayer: mntA,
              montantPaye: mntP,
              devise: f.MntPayeGd ? "HTG" : "US",
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

        if (employesData && employesData.length > 0) {
          const fetchedEmployees: Employee[] = employesData.map((e: any) => ({
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
            desactive: e.Desactive === 1 || e.Desactive === true,
          }));
          setEmployees(fetchedEmployees);
          setStaff(fetchedEmployees);
        } else {
          const fallbackEmps = parseStoredArray<Employee>(
            window.localStorage.getItem(STORAGE_KEYS.employees),
            mockEmployees
          );
          setEmployees(fallbackEmps);
          setStaff(fallbackEmps);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des données", err);
      }

      if (alumniData && alumniData.length > 0) {
        setAlumni(alumniData);
      } else {
        setAlumni(
          parseStoredArray<Alumni>(
            window.localStorage.getItem(STORAGE_KEYS.alumni),
            []
          )
        );
      }

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
      setHydrated(true);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(players));
  }, [hydrated, players]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.parents, JSON.stringify(parents));
  }, [hydrated, parents]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(employees));
    window.localStorage.setItem(STORAGE_KEYS.staff, JSON.stringify(employees));
  }, [hydrated, employees]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.alumni, JSON.stringify(alumni));
  }, [hydrated, alumni]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
  }, [hydrated, events]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(payments));
  }, [hydrated, payments]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices));
  }, [hydrated, invoices]);

  return (
    <ClubDataContext.Provider
      value={{
        players,
        setPlayers,
        parents,
        setParents,
        employees,
        setEmployees,
        staff: employees,
        setStaff: setEmployees,
        alumni,
        setAlumni,
        events,
        setEvents,
        payments,
        setPayments,
        invoices,
        setInvoices,
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
