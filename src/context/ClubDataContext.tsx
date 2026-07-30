"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
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
  PayrollRecord,
} from "@/types/club";
import { supabase } from "@/lib/supabaseClient";
import { groupParentsByFamily } from "@/lib/club/parents";

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
          bonus: bonus,
          deductions: deductions,
          prelevementPourcentage,
          prelevementMontant,
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

        const [etudiantsData, paiementsData, inscriptionsData, sessionsData, facturesData, employesData, evenementsData, payrollData] = await Promise.all([
          fetchAll("tblEtudiants"),
          fetchAll("tblPaiements"),
          fetchAll("tblInscriptions"),
          fetchAll("tblSessions"),
          fetchAll("tblFacture"),
          fetchAll("tblEmployes"),
          fetchAll("tblEvenements").catch(() => []),
          fetchAll("tblPayroll").catch(() => [])
        ]);

        console.log("[DEBUG ClubDataContext] etudiantsData length:", etudiantsData?.length);

        const sessionsMap = new Map();
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
          
          // Filtrage global des étudiants invalides ("x", "xx", sans nom, sponsors)
          const validEtudiants = etudiantsData.filter((d: any) => {
            const nom = (d.Nom || "").toLowerCase().trim();
            const prenom = (d.Prenom || "").toLowerCase().trim();
            
            if (!nom) return false; // Pas de nom = invalide
            if (d.IsDeleted === 1 || d.IsDeleted === true || String(d.IsDeleted).toLowerCase() === "true") return false; // Exclusion des joueurs supprimés logiquement
            if (nom.includes("sponsor")) return false; // Exclusion des sponsors
            if (/^x+$/i.test(nom)) return false; // Exclusion de "x", "xx", "xxx"...
            if (nom === "test") return false;
            if (/^x+$/i.test(prenom)) return false; // Exclusion si le prénom est juste "x" ou "xx"

            return true;
          });
          
          console.log("[DEBUG ClubDataContext] validEtudiants length:", validEtudiants?.length);

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
            const allValuesStr = (JSON.stringify(Object.values(d)) + JSON.stringify(studentInscriptions)).toLowerCase();
            if (d.EstAlumni === true || d.EstAlumni === 1 || d.EstAlumni === "true" || d.EstAlumni === "1" || allValuesStr.includes("alumni")) {
              playerStatus = "alumni";
            } else if (
              allValuesStr.includes("abandon") ||
              allValuesStr.includes("quitt") ||
              allValuesStr.includes("déménag") ||
              allValuesStr.includes("demenag") ||
              allValuesStr.includes("inactif") ||
              d.Actif === false ||
              d.Actif === 0 ||
              d.Abandon === true ||
              d.Abandon === 1
            ) {
              playerStatus = "abandonne";
            } else if (allValuesStr.includes("bless")) {
              playerStatus = "blesse";
            } else if (allValuesStr.includes("suspend")) {
              playerStatus = "suspendu";
            }

            return {
              id: String(d.EtudiantID),
              matricule: matricule,
              nom: d.Nom || "",
              prenom: d.Prenom || "",
              photoUrl: d.PhotoUrl || "/images/user/silhouette.svg",
              poste: d.Poste || d.poste || "Joueur",
              sexe: d.Sexe === "F" ? "Féminin" : "Masculin", 
              categorie: (() => {
                const rawCat = (d.Categorie || d.categorie || d.Category || d.category || "").toString().trim();
                const lowerCat = rawCat.toLowerCase();

                if (rawCat && lowerCat !== "ti toro" && lowerCat !== "titoro" && lowerCat !== "default") {
                  if (/^u-?\d+$/i.test(lowerCat)) {
                    const num = lowerCat.replace(/[^\d]/g, "");
                    return `U${num}`;
                  }
                  return rawCat;
                }

                if (d.DateNaissance) {
                  const dt = new Date(d.DateNaissance);
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

                return rawCat || "ti toro";
              })(),
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
          setParents(groupParentsByFamily(fetchedParents));
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
        }

        if (paiementsData && paiementsData.length > 0) {
          const fetchedPayments: Payment[] = paiementsData
            .map((p: any): Payment => {
              const montantUS = p.MntPayeUS || 0;
              const montantHTG = p.MntPayeGd || 0;
              const montant = montantUS || montantHTG || 0;
              const devise: "US" | "HTG" = montantHTG > 0 ? "HTG" : "US";

              return {
                id: String(p.Id),
                playerId: String(p.EtudiantId),
                montant,
                montantUS,
                montantHTG,
                devise,
                taux: p.Taux || p.taux || undefined,
                statut: "paid" as any, // Historique des transactions = payé
                periode: p.DateTransact ? p.DateTransact.substring(0, 7) : new Date().toISOString().substring(0, 7),
                methode: (p.ModePaiement || "especes") as any,
                datePaiement: p.DateTransact ? p.DateTransact.split("T")[0] : undefined,
                remarque: p.Remarque || p.Description || "",
              };
            })
            .filter((p: Payment) => p.montant > 0 || p.montantUS > 0 || p.montantHTG > 0);
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
            const mntUS = f.MntPayeUS || 0;
            const mntHTG = f.MntPayeGd || 0;
            return {
              id: String(f.Id),
              noFacture: f.NoFacture || `FCT-XXXX-${String(f.Id).padStart(4, "0")}`,
              playerId: String(f.EtudiantId),
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
              bonus: bonus,
              deductions: deductions,
              prelevementPourcentage,
              prelevementMontant,
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

        const has2026 = fetchedPayroll.some((p) => p.mois && p.mois.startsWith("2026"));
        if (!has2026) {
          const empsForPayroll = employesData || [];
          const mockRecs = generateMockPayrollRecords(empsForPayroll);
          fetchedPayroll = [...fetchedPayroll, ...mockRecs];
        }

        setPayrollRecords(fetchedPayroll);
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
