"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Player } from "@/types/club";
import { getPlayerFullName } from "@/lib/club/metrics";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentSeason } from "@/lib/club/season";
import { useUserRole } from "@/context/UserRoleContext";
import {
  FullEvaluationData,
  EvaluationFormType,
  U8EvaluationRatings,
  FieldU10U18Ratings,
  GoalkeeperRatings,
  U8EvaluationTests,
  AdvancedTests,
  PlayerEvaluationRecord,
  parseEvaluationComments,
  determineEvaluationType,
} from "@/types/evaluation";
import { OfficialEvaluationSheet } from "@/components/club/evaluations/OfficialEvaluationSheet";

interface CoachPlayerEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onSuccess?: () => void;
}

const DEFAULT_U8_RATINGS: U8EvaluationRatings = {
  aspectMental: 2,
  jeuPreSportif: 2,
  presentation: 2,
  jonglerieRebonds: 2,
  jonglerieSansRebonds: 2,
  contactBallon: 2,
  contactPlat: 2,
  contactInterieurExterieur: 2,
  contactCourt: 2,
  contactPointe: 2,
  contactTalon: 2,
};

const DEFAULT_FIELD_RATINGS: FieldU10U18Ratings = {
  competencesTechniques: 2,
  competencesTactiques: 2,
  competencesAttaque: 2,
  jeuFitnessConditionnement: 2,
  aspectMental: 2,
  presentation: 2,
  techniqueFinition: 2,
  passesPrecises: 2,
  equilibreVision: 2,
  dribblesFeintes: 2,
  passesLongues: 2,
  courirApresBallon: 2,
  techniqueDegagement: 2,
  positionnement: 2,
  competencesTackles: 2,
  canalisationRetard: 2,
  comprehensionDefensive1v1: 2,
  comprehensionPrincipes: 2,
};

const DEFAULT_GK_RATINGS: GoalkeeperRatings = {
  priseDeBalle: 2,
  ramassageGauche: 2,
  ramassageDroit: 2,
  demiSaut: 2,
  priseAerienne: 2,
  saut: 2,
  detente: 2,
  positionDeBase: 2,
  reactionAuSol: 2,
  anticipationBalleAuSol: 2,
  reflexe: 2,
  passeLongue: 2,
  techniqueDegagement: 2,
  comprehensionPrincipes: 2,
};

const DEFAULT_U8_TESTS: U8EvaluationTests = {
  motriciteSecondes: "",
  slalomSecondes: "",
};

const DEFAULT_ADVANCED_TESTS: AdvancedTests = {
  jonglagePiedFort: "",
  jonglagePiedFaible: "",
  jonglageAlterne: "",
  jonglageCuisseGauche: "",
  jonglageCuisseDroite: "",
  jonglageCuisseAlternee: "",
  vivacite: "",
  vitesse10M: "",
  vitesse20M: "",
  vitesse30M: "",
  vitesse40M: "",
};

export const CoachPlayerEvaluationModal: React.FC<CoachPlayerEvaluationModalProps> = ({
  isOpen,
  onClose,
  player,
  onSuccess,
}) => {
  const { userEmail } = useUserRole();

  // Mode: "history" (list) | "create" (form) | "view" (full printable sheet)
  const [viewMode, setViewMode] = useState<"history" | "create" | "view">("history");
  const [evaluations, setEvaluations] = useState<PlayerEvaluationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSheetData, setSelectedSheetData] = useState<FullEvaluationData | null>(null);

  // Form states (Pre-filled from player, editable, isolated)
  const [headerPlayerName, setHeaderPlayerName] = useState("");
  const [headerCategory, setHeaderCategory] = useState("U8");
  const [headerPoste, setHeaderPoste] = useState("Milieu");
  const [headerDate, setHeaderDate] = useState("");

  // Ratings per form type
  const [ratingsU8, setRatingsU8] = useState<U8EvaluationRatings>(DEFAULT_U8_RATINGS);
  const [ratingsField, setRatingsField] = useState<FieldU10U18Ratings>(DEFAULT_FIELD_RATINGS);
  const [ratingsGK, setRatingsGK] = useState<GoalkeeperRatings>(DEFAULT_GK_RATINGS);

  // Tests per form type
  const [testsU8, setTestsU8] = useState<U8EvaluationTests>(DEFAULT_U8_TESTS);
  const [testsAdvanced, setTestsAdvanced] = useState<AdvancedTests>(DEFAULT_ADVANCED_TESTS);

  const [observations, setObservations] = useState("");
  const [coachName, setCoachName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic automatic form detection:
  // If Poste contains "gardien" -> GOALKEEPER
  // Else if Category is "U8" -> U8
  // Else -> FIELD_U10_U18
  const activeFormType: EvaluationFormType = useMemo(() => {
    return determineEvaluationType(headerCategory, headerPoste);
  }, [headerCategory, headerPoste]);

  // Load evaluations history
  const fetchEvaluations = async () => {
    if (!player) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("player_evaluations")
        .select("*")
        .eq("player_id", player.id)
        .order("evaluation_date", { ascending: false });

      if (error) throw error;

      const mapped: PlayerEvaluationRecord[] = (data || []).map((row: any) => ({
        id: row.id,
        player_id: row.player_id,
        coach_id: row.coach_id,
        evaluation_date: row.evaluation_date,
        saison: row.saison,
        created_at: row.created_at,
        comments: row.comments,
        parsedData: parseEvaluationComments(row.comments),
      }));

      setEvaluations(mapped);

      if (mapped.length === 0) {
        setViewMode("create");
      } else {
        setViewMode("history");
      }
    } catch (err) {
      console.error("Erreur récupération évaluations:", err);
      setViewMode("create");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && player) {
      const today = new Date().toISOString().split("T")[0];
      setHeaderPlayerName(getPlayerFullName(player));
      setHeaderCategory(player.categorie || "U10");
      setHeaderPoste(player.poste || "Milieu");
      setHeaderDate(today);

      const defaultCoach = userEmail
        ? userEmail.split("@")[0].replace(/[._-]/g, " ")
        : "Coach";
      setCoachName(defaultCoach);

      setRatingsU8(DEFAULT_U8_RATINGS);
      setRatingsField(DEFAULT_FIELD_RATINGS);
      setRatingsGK(DEFAULT_GK_RATINGS);
      setTestsU8(DEFAULT_U8_TESTS);
      setTestsAdvanced(DEFAULT_ADVANCED_TESTS);
      setObservations("");

      fetchEvaluations();
    }
  }, [isOpen, player]);

  const handleStartNewForm = () => {
    const today = new Date().toISOString().split("T")[0];
    if (player) {
      setHeaderPlayerName(getPlayerFullName(player));
      setHeaderCategory(player.categorie || "U10");
      setHeaderPoste(player.poste || "Milieu");
      setHeaderDate(today);
    }
    setRatingsU8(DEFAULT_U8_RATINGS);
    setRatingsField(DEFAULT_FIELD_RATINGS);
    setRatingsGK(DEFAULT_GK_RATINGS);
    setTestsU8(DEFAULT_U8_TESTS);
    setTestsAdvanced(DEFAULT_ADVANCED_TESTS);
    setObservations("");
    setViewMode("create");
  };

  if (!player) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: FullEvaluationData = {
        version: 1,
        formType: activeFormType,
        category: headerCategory,
        poste: headerPoste,
        evaluator_name: coachName || "Coach",
        evaluator_role: "coach",
        header: {
          playerName: headerPlayerName,
          categorie: headerCategory,
          poste: headerPoste,
          evaluationDate: headerDate,
        },
        ratingsU8: activeFormType === "U8" ? ratingsU8 : undefined,
        ratingsField: activeFormType === "FIELD_U10_U18" ? ratingsField : undefined,
        ratingsGK: activeFormType === "GOALKEEPER" ? ratingsGK : undefined,
        testsU8: activeFormType === "U8" ? testsU8 : undefined,
        testsAdvanced: activeFormType !== "U8" ? testsAdvanced : undefined,
        observations,
        signatures: {
          coachName: coachName || "Coach",
          date: headerDate,
        },
      };

      const finalComments = JSON.stringify(payload);

      const { error } = await supabase.from("player_evaluations").insert([
        {
          player_id: player.id,
          comments: finalComments,
          saison: getCurrentSeason(),
          evaluation_date: headerDate || new Date().toISOString().split("T")[0],
          coach_id: userEmail || "coach",
        },
      ]);

      if (error) throw error;

      setObservations("");
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error("Erreur enregistrement évaluation:", err);
      alert("Erreur lors de l'enregistrement : " + (err.message || "Erreur serveur"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingRow = (
    label: string,
    currentVal: number,
    onChange: (val: number) => void
  ) => {
    return (
      <div className="flex items-center justify-between py-2 px-1 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md transition-colors">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          {[1, 2, 3, 4, 5].map((score) => {
            const isSelected = currentVal === score;
            return (
              <button
                type="button"
                key={score}
                onClick={() => onChange(score)}
                className={`w-7 h-7 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                  isSelected
                    ? "bg-[#ef233c] text-white shadow-sm ring-2 ring-[#ef233c]/30 scale-105"
                    : "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 hover:text-gray-900"
                }`}
              >
                {score}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={`${viewMode === "view" ? "max-w-4xl" : "max-w-5xl"} mx-auto w-full`}
    >
      <div className="p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#0a2347] text-white">
                {headerCategory || player.categorie || "Club"}
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Évaluation de {getPlayerFullName(player)}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Saison {getCurrentSeason()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {viewMode !== "history" && evaluations.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode("history")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              >
                ← Historique ({evaluations.length})
              </button>
            )}

            {viewMode === "history" && (
              <button
                type="button"
                onClick={handleStartNewForm}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-colors"
              >
                <span>+</span> Nouveau formulaire
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: HISTORY OF EVALUATIONS */}
        {viewMode === "history" && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="py-12 text-center text-sm text-gray-500">
                Chargement...
              </div>
            ) : evaluations.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Aucun formulaire enregistré pour ce joueur
                </p>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Commencez le suivi de ce joueur en remplissant son premier formulaire d'évaluation.
                </p>
                <button
                  type="button"
                  onClick={handleStartNewForm}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
                >
                  Remplir la fiche d'évaluation
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3">
                  {evaluations.map((ev) => {
                    const parsed = ev.parsedData;
                    const dateFormatted = new Date(
                      ev.evaluation_date
                    ).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });

                    const labelType =
                      parsed?.formType === "GOALKEEPER"
                        ? "Gardien de But"
                        : parsed?.formType === "FIELD_U10_U18"
                        ? `Joueur de champ (${parsed.category || "U10-U18"})`
                        : `Catégorie ${parsed?.category || "U8"}`;

                    return (
                      <div
                        key={ev.id}
                        className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-500/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#0a2347] text-white">
                              {labelType}
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              Évalué le {dateFormatted}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              (Saison {ev.saison})
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400">
                            Par : <strong className="text-gray-600 dark:text-gray-300">{parsed?.evaluator_name || ev.coach_id}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {parsed && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSheetData(parsed);
                                setViewMode("view");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0a2347] hover:bg-[#0d2d62] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ouvrir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: FORM MODE */}
        {viewMode === "create" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. INFORMATIONS DU JOUEUR (Modifiable & Isolé) */}
            <div className="space-y-3 pb-5 border-b border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                    Nom & Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={headerPlayerName}
                    onChange={(e) => setHeaderPlayerName(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={headerCategory}
                    onChange={(e) => setHeaderCategory(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                  >
                    <option value="U8">U8</option>
                    <option value="U10">U10</option>
                    <option value="U11">U11</option>
                    <option value="U12">U12</option>
                    <option value="U13">U13</option>
                    <option value="U14">U14</option>
                    <option value="U15">U15</option>
                    <option value="U16">U16</option>
                    <option value="U17">U17</option>
                    <option value="U18">U18</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                    Poste
                  </label>
                  <input
                    type="text"
                    required
                    list="postes-suggestions"
                    value={headerPoste}
                    onChange={(e) => setHeaderPoste(e.target.value)}
                    placeholder="Ex: Gardien de but, Attaquant..."
                    className="w-full text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                  />
                  <datalist id="postes-suggestions">
                    <option value="Gardien de but" />
                    <option value="Attaquant" />
                    <option value="Milieu de terrain" />
                    <option value="Défenseur central" />
                    <option value="Latéral" />
                    <option value="Ailier" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                    Date Évaluation
                  </label>
                  <input
                    type="date"
                    required
                    value={headerDate}
                    onChange={(e) => setHeaderDate(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Dynamic Form Active Indicator */}
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                <span className="text-gray-500">Formulaire actif :</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {activeFormType === "GOALKEEPER" && "Gardien de But"}
                  {activeFormType === "FIELD_U10_U18" && "Joueur de Champ (U10 à U18)"}
                  {activeFormType === "U8" && "Catégorie U8"}
                </span>
              </div>
            </div>

            {/* Scale Legend */}
            <div className="flex flex-wrap items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-200 dark:border-gray-800">
              <span><strong className="text-gray-900 dark:text-white">1 :</strong> Besoin de dév.</span>
              <span><strong className="text-gray-900 dark:text-white">2 :</strong> Bien</span>
              <span><strong className="text-gray-900 dark:text-white">3 :</strong> Très Bien</span>
              <span><strong className="text-gray-900 dark:text-white">4 :</strong> Excellent</span>
              <span><strong className="text-gray-900 dark:text-white">5 :</strong> Supérieur</span>
            </div>

            {/* ======================================================== */}
            {/* CASE 1: GOALKEEPER FORM */}
            {/* ======================================================== */}
            {activeFormType === "GOALKEEPER" && (
              <div className="space-y-6">
                {/* 1. ÉVALUATION GÉNÉRALE GARDIEN (12) */}
                <div className="space-y-1">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Évaluation Générale (Gardien)
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {renderRatingRow("Prise de balle", ratingsGK.priseDeBalle, (val) => setRatingsGK(p => ({ ...p, priseDeBalle: val })))}
                    {renderRatingRow("Ramassage Gauche", ratingsGK.ramassageGauche, (val) => setRatingsGK(p => ({ ...p, ramassageGauche: val })))}
                    {renderRatingRow("Ramassage Droit", ratingsGK.ramassageDroit, (val) => setRatingsGK(p => ({ ...p, ramassageDroit: val })))}
                    {renderRatingRow("Demi saut", ratingsGK.demiSaut, (val) => setRatingsGK(p => ({ ...p, demiSaut: val })))}
                    {renderRatingRow("Prise aérienne", ratingsGK.priseAerienne, (val) => setRatingsGK(p => ({ ...p, priseAerienne: val })))}
                    {renderRatingRow("Saut", ratingsGK.saut, (val) => setRatingsGK(p => ({ ...p, saut: val })))}
                    {renderRatingRow("Détente", ratingsGK.detente, (val) => setRatingsGK(p => ({ ...p, detente: val })))}
                    {renderRatingRow("Position de Base", ratingsGK.positionDeBase, (val) => setRatingsGK(p => ({ ...p, positionDeBase: val })))}
                    {renderRatingRow("Réaction au Sol", ratingsGK.reactionAuSol, (val) => setRatingsGK(p => ({ ...p, reactionAuSol: val })))}
                    {renderRatingRow("Anticipation de balle au sol", ratingsGK.anticipationBalleAuSol, (val) => setRatingsGK(p => ({ ...p, anticipationBalleAuSol: val })))}
                    {renderRatingRow("Reflexe", ratingsGK.reflexe, (val) => setRatingsGK(p => ({ ...p, reflexe: val })))}
                    {renderRatingRow("Passe Longue", ratingsGK.passeLongue, (val) => setRatingsGK(p => ({ ...p, passeLongue: val })))}
                  </div>
                </div>

                {/* 2. QUALITÉS TECHNIQUES GARDIEN (2) */}
                <div className="space-y-1">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Qualités Techniques (Gardien)
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {renderRatingRow("Technique de dégagement", ratingsGK.techniqueDegagement, (val) => setRatingsGK(p => ({ ...p, techniqueDegagement: val })))}
                    {renderRatingRow("Compréhension des principes", ratingsGK.comprehensionPrincipes, (val) => setRatingsGK(p => ({ ...p, comprehensionPrincipes: val })))}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* CASE 2: FIELD PLAYER U10-U18 FORM */}
            {/* ======================================================== */}
            {activeFormType === "FIELD_U10_U18" && (
              <div className="space-y-6">
                {/* 1. ÉVALUATION GÉNÉRALE (6) */}
                <div className="space-y-1">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Évaluation Générale
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {renderRatingRow("Compétences Techniques", ratingsField.competencesTechniques, (val) => setRatingsField(p => ({ ...p, competencesTechniques: val })))}
                    {renderRatingRow("Compétences Tactiques", ratingsField.competencesTactiques, (val) => setRatingsField(p => ({ ...p, competencesTactiques: val })))}
                    {renderRatingRow("Compétences d'Attaque", ratingsField.competencesAttaque, (val) => setRatingsField(p => ({ ...p, competencesAttaque: val })))}
                    {renderRatingRow("Jeu Fitness et Conditionnement", ratingsField.jeuFitnessConditionnement, (val) => setRatingsField(p => ({ ...p, jeuFitnessConditionnement: val })))}
                    {renderRatingRow("Aspect Mental / Auto Discipline", ratingsField.aspectMental, (val) => setRatingsField(p => ({ ...p, aspectMental: val })))}
                    {renderRatingRow("Présentation et Propreté", ratingsField.presentation, (val) => setRatingsField(p => ({ ...p, presentation: val })))}
                  </div>
                </div>

                {/* 2. QUALITÉS D'ATTAQUE (6) */}
                <div className="space-y-1">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Qualités d'Attaque
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {renderRatingRow("Technique de finition / compétences", ratingsField.techniqueFinition, (val) => setRatingsField(p => ({ ...p, techniqueFinition: val })))}
                    {renderRatingRow("Passes précises", ratingsField.passesPrecises, (val) => setRatingsField(p => ({ ...p, passesPrecises: val })))}
                    {renderRatingRow("Équilibre et Vision sous pression", ratingsField.equilibreVision, (val) => setRatingsField(p => ({ ...p, equilibreVision: val })))}
                    {renderRatingRow("Compétences de dribbles et feintes", ratingsField.dribblesFeintes, (val) => setRatingsField(p => ({ ...p, dribblesFeintes: val })))}
                    {renderRatingRow("Passes longues / Transversales", ratingsField.passesLongues, (val) => setRatingsField(p => ({ ...p, passesLongues: val })))}
                    {renderRatingRow("Courir après le ballon", ratingsField.courirApresBallon, (val) => setRatingsField(p => ({ ...p, courirApresBallon: val })))}
                  </div>
                </div>

                {/* 3. QUALITÉS DÉFENSIVES (6) */}
                <div className="space-y-1">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Qualités Défensives
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {renderRatingRow("Technique de dégagement", ratingsField.techniqueDegagement, (val) => setRatingsField(p => ({ ...p, techniqueDegagement: val })))}
                    {renderRatingRow("Positionnement", ratingsField.positionnement, (val) => setRatingsField(p => ({ ...p, positionnement: val })))}
                    {renderRatingRow("Compétences de tackles", ratingsField.competencesTackles, (val) => setRatingsField(p => ({ ...p, competencesTackles: val })))}
                    {renderRatingRow("Capacité de canalisation / retard", ratingsField.canalisationRetard, (val) => setRatingsField(p => ({ ...p, canalisationRetard: val })))}
                    {renderRatingRow("Compréhension défensive 1v1", ratingsField.comprehensionDefensive1v1, (val) => setRatingsField(p => ({ ...p, comprehensionDefensive1v1: val })))}
                    {renderRatingRow("Compréhension des principes", ratingsField.comprehensionPrincipes, (val) => setRatingsField(p => ({ ...p, comprehensionPrincipes: val })))}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* CASE 3: U8 FORM */}
            {/* ======================================================== */}
            {activeFormType === "U8" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Évaluation Générale
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {renderRatingRow("Aspect Mental / Auto Discipline", ratingsU8.aspectMental, (val) => setRatingsU8(p => ({ ...p, aspectMental: val })))}
                    {renderRatingRow("Jeu pré-sportif", ratingsU8.jeuPreSportif, (val) => setRatingsU8(p => ({ ...p, jeuPreSportif: val })))}
                    {renderRatingRow("Présentation et Propreté", ratingsU8.presentation, (val) => setRatingsU8(p => ({ ...p, presentation: val })))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Initiation à la Base Technique
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {renderRatingRow("Jonglerie avec rebonds", ratingsU8.jonglerieRebonds, (val) => setRatingsU8(p => ({ ...p, jonglerieRebonds: val })))}
                    {renderRatingRow("Jonglerie sans rebonds", ratingsU8.jonglerieSansRebonds, (val) => setRatingsU8(p => ({ ...p, jonglerieSansRebonds: val })))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Connaissance de la Surface de Contact
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {renderRatingRow("Contact avec ballon", ratingsU8.contactBallon, (val) => setRatingsU8(p => ({ ...p, contactBallon: val })))}
                    {renderRatingRow("Contact avec plat du pied", ratingsU8.contactPlat, (val) => setRatingsU8(p => ({ ...p, contactPlat: val })))}
                    {renderRatingRow("Contact intérieur et extérieur du pied", ratingsU8.contactInterieurExterieur, (val) => setRatingsU8(p => ({ ...p, contactInterieurExterieur: val })))}
                    {renderRatingRow("Contact court du pied", ratingsU8.contactCourt, (val) => setRatingsU8(p => ({ ...p, contactCourt: val })))}
                    {renderRatingRow("Contact pointe du pied", ratingsU8.contactPointe, (val) => setRatingsU8(p => ({ ...p, contactPointe: val })))}
                    {renderRatingRow("Contact talon du pied", ratingsU8.contactTalon, (val) => setRatingsU8(p => ({ ...p, contactTalon: val })))}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TESTS SECTION */}
            {/* ======================================================== */}
            {activeFormType === "U8" ? (
              /* U8 SIMPLE TESTS */
              <div className="space-y-2 pt-2">
                <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    Résultats TEST
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Test de motricité (secondes)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 12.4"
                      value={testsU8.motriciteSecondes}
                      onChange={(e) => setTestsU8(p => ({ ...p, motriciteSecondes: e.target.value }))}
                      className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Test Slalom (secondes)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 15.1"
                      value={testsU8.slalomSecondes}
                      onChange={(e) => setTestsU8(p => ({ ...p, slalomSecondes: e.target.value }))}
                      className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* ADVANCED TESTS (U10-U18 & GOALKEEPER) */
              <div className="space-y-4 pt-2">
                <div className="border-b border-gray-200 dark:border-gray-800 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    Résultats TEST :
                  </h4>
                </div>

                {/* 1. Jonglage */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block">
                    Test de Jonglage
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Pied fort</label>
                      <input
                        type="text"
                        value={testsAdvanced.jonglagePiedFort}
                        onChange={(e) => setTestsAdvanced(p => ({ ...p, jonglagePiedFort: e.target.value }))}
                        className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Pied faible</label>
                      <input
                        type="text"
                        value={testsAdvanced.jonglagePiedFaible}
                        onChange={(e) => setTestsAdvanced(p => ({ ...p, jonglagePiedFaible: e.target.value }))}
                        className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Alterné</label>
                      <input
                        type="text"
                        value={testsAdvanced.jonglageAlterne}
                        onChange={(e) => setTestsAdvanced(p => ({ ...p, jonglageAlterne: e.target.value }))}
                        className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Cuisse gauche</label>
                      <input
                        type="text"
                        value={testsAdvanced.jonglageCuisseGauche}
                        onChange={(e) => setTestsAdvanced(p => ({ ...p, jonglageCuisseGauche: e.target.value }))}
                        className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Cuisse droite</label>
                      <input
                        type="text"
                        value={testsAdvanced.jonglageCuisseDroite}
                        onChange={(e) => setTestsAdvanced(p => ({ ...p, jonglageCuisseDroite: e.target.value }))}
                        className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Cuisse alternée</label>
                      <input
                        type="text"
                        value={testsAdvanced.jonglageCuisseAlternee}
                        onChange={(e) => setTestsAdvanced(p => ({ ...p, jonglageCuisseAlternee: e.target.value }))}
                        className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Vivacité & Vitesse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  {/* Test de vivacité */}
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 h-4">
                      Test de vivacité
                    </span>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1 h-4">
                        Chrono (sec)
                      </label>
                      <input
                        type="text"
                        value={testsAdvanced.vivacite}
                        onChange={(e) => setTestsAdvanced(p => ({ ...p, vivacite: e.target.value }))}
                        className="w-full text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Test de vitesse */}
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 h-4">
                      Test de vitesse (secondes)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-center text-gray-500 mb-1 h-4">
                          10M
                        </label>
                        <input
                          type="text"
                          value={testsAdvanced.vitesse10M}
                          onChange={(e) => setTestsAdvanced(p => ({ ...p, vitesse10M: e.target.value }))}
                          className="w-full text-center text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-center text-gray-500 mb-1 h-4">
                          20M
                        </label>
                        <input
                          type="text"
                          value={testsAdvanced.vitesse20M}
                          onChange={(e) => setTestsAdvanced(p => ({ ...p, vitesse20M: e.target.value }))}
                          className="w-full text-center text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-center text-gray-500 mb-1 h-4">
                          30M
                        </label>
                        <input
                          type="text"
                          value={testsAdvanced.vitesse30M}
                          onChange={(e) => setTestsAdvanced(p => ({ ...p, vitesse30M: e.target.value }))}
                          className="w-full text-center text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-center text-gray-500 mb-1 h-4">
                          40M
                        </label>
                        <input
                          type="text"
                          value={testsAdvanced.vitesse40M}
                          onChange={(e) => setTestsAdvanced(p => ({ ...p, vitesse40M: e.target.value }))}
                          className="w-full text-center text-xs font-mono font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OBSERVATIONS DU JOUEUR */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Observations pour le joueur :
              </label>
              <textarea
                rows={4}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Écrivez ici vos remarques et conseils..."
                className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-gray-900 dark:text-white outline-none focus:border-brand-500"
              />
            </div>

            {/* SIGNATURE COACH (PDG HIDDEN FOR COACH) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nom du Coach (Signature)
                </label>
                <input
                  type="text"
                  required
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Date officielle
                </label>
                <input
                  type="date"
                  required
                  value={headerDate}
                  onChange={(e) => setHeaderDate(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  if (evaluations.length > 0) setViewMode("history");
                  else onClose();
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer la fiche"}
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: FULL OFFICIAL SHEET (READ-ONLY / PRINT) */}
        {viewMode === "view" && selectedSheetData && (
          <OfficialEvaluationSheet
            data={selectedSheetData}
            showPdgSignature={true}
            onClose={() => setViewMode("history")}
          />
        )}
      </div>
    </Modal>
  );
};
