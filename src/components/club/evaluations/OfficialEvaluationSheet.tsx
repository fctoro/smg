"use client";

import React, { useRef } from "react";
import { FullEvaluationData, EvaluationFormType } from "@/types/evaluation";

interface OfficialEvaluationSheetProps {
  data: FullEvaluationData;
  showPdgSignature?: boolean; // True for SuperAdmin view and official print
  onClose?: () => void;
}

export const OfficialEvaluationSheet: React.FC<OfficialEvaluationSheetProps> = ({
  data,
  showPdgSignature = true,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = document.getElementById("printable-evaluation-sheet");
    if (!printContent) {
      window.print();
      return;
    }

    // Create a hidden isolated iframe so modal scrolling/overflow never breaks print layout
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Collect all stylesheets from head
    let stylesHtml = "";
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      stylesHtml += node.outerHTML;
    });

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Fiche d'Évaluation — FC TORO</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: #0a1d3a !important;
              font-family: inherit;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-evaluation-sheet {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div id="printable-evaluation-sheet" class="relative bg-white text-[#0a1d3a]">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 400);
  };

  const formType: EvaluationFormType = data.formType || "U8";

  const renderRatingRow = (label: string, value?: number) => {
    return (
      <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0 text-xs sm:text-[13px] leading-snug">
        <span className="font-medium text-gray-800 pr-2 truncate">{label}</span>
        <div className="flex items-center gap-2 shrink-0 font-mono">
          {[1, 2, 3, 4, 5].map((score) => {
            const isSelected = value === score;
            return (
              <span
                key={score}
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-[#ef233c] text-white shadow-xs ring-2 ring-[#ef233c]/30"
                    : "text-gray-400 bg-gray-50 border border-gray-200"
                }`}
              >
                {score}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const formTitle =
    formType === "GOALKEEPER"
      ? "Fiche d'Évaluation Technique — Gardien de But"
      : formType === "FIELD_U10_U18"
      ? "Fiche d'Évaluation Technique — Joueur de Champ (U10 à U18)"
      : "Fiche d'Évaluation Technique — Catégorie U8";

  const formBadge =
    formType === "GOALKEEPER"
      ? `Gardien • ${data.header?.categorie || data.category || "Club"}`
      : `Catégorie ${data.header?.categorie || data.category || "U8"}`;

  return (
    <div className="space-y-4">
      {/* Top Action Bar (hidden in print) */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs print:hidden">
        <div>
          <h4 className="font-bold text-gray-900 text-sm">
            {formTitle} — {data.header?.playerName || "Joueur"}
          </h4>
          <p className="text-xs text-gray-500">
            {data.header?.poste ? `Poste : ${data.header.poste} • ` : ""}
            Évalué le {data.header?.evaluationDate || data.signatures?.date || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Imprimer la fiche
          </button>
        </div>
      </div>

      {/* The Printable Official Document Sheet - Arranged cleanly to fit 1 single A4 page */}
      <div
        ref={printRef}
        id="printable-evaluation-sheet"
        className="relative bg-white text-[#0a1d3a] p-5 sm:p-6 rounded-2xl border border-gray-300 shadow-lg max-w-[850px] mx-auto overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none"
      >
        {/* Subtle Watermark in background */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035] print:opacity-[0.045] select-none">
          <img
            src="/images/logo/fc-toro.png"
            alt="FC TORO Watermark"
            className="w-[360px] h-auto object-contain"
          />
        </div>

        {/* 1. Header (Logo + Title + Slogan) */}
        <div className="relative z-10 flex items-center justify-between pb-3 mb-3">
          <div className="flex items-center gap-3.5">
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0">
              <img
                src="/images/logo/fc-toro.png"
                alt="Logo FC TORO"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0a2347] leading-none">
                FC TORO
              </h1>
              <p className="text-xs font-black tracking-widest text-[#ef233c] uppercase mt-1">
                Mache Sou Yo
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block bg-[#0a2347] text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-1">
              {formBadge}
            </div>
            <h2 className="text-xs sm:text-sm font-bold uppercase text-gray-700">
              {formTitle}
            </h2>
          </div>
        </div>

        {/* 2. Player Identification Block (Snapshot) */}
        <div className="relative z-10 bg-gray-50/90 rounded-xl border border-gray-200 p-3 mb-3 text-xs sm:text-sm">
          <div className="grid grid-cols-4 gap-3.5">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                Joueur
              </span>
              <span className="font-black text-[#0a2347] text-sm truncate block">
                {data.header?.playerName || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                Catégorie
              </span>
              <span className="font-bold text-gray-800 text-xs sm:text-sm truncate block">
                {data.header?.categorie || data.category || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                Poste
              </span>
              <span className="font-bold text-gray-800 text-xs sm:text-sm truncate block">
                {data.header?.poste || data.poste || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                Date Évaluation
              </span>
              <span className="font-bold text-gray-800 text-xs sm:text-sm truncate block">
                {data.header?.evaluationDate || data.signatures?.date || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Rating Legend Bar */}
        <div className="relative z-10 bg-[#0a2347]/5 border border-[#0a2347]/15 rounded-lg px-3 py-1.5 mb-3">
          <div className="flex flex-wrap items-center justify-between text-xs font-semibold text-gray-700 gap-2">
            <span><strong className="text-[#0a2347]">1 :</strong> Besoin de développement</span>
            <span><strong className="text-[#0a2347]">2 :</strong> Bien</span>
            <span><strong className="text-[#0a2347]">3 :</strong> Très Bien</span>
            <span><strong className="text-[#0a2347]">4 :</strong> Excellent</span>
            <span><strong className="text-[#0a2347]">5 :</strong> Supérieur</span>
          </div>
        </div>

        {/* 4. SECTIONS CONTENT BASED ON FORM TYPE */}
        <div className="relative z-10 space-y-3">
          
          {/* ======================================================== */}
          {/* CASE 1: GOALKEEPER FORM (14 criteria in 2 columns) */}
          {/* ======================================================== */}
          {formType === "GOALKEEPER" && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0a2347] bg-gray-100 px-3 py-1 rounded mb-1.5">
                Évaluation Spécifique Gardien de But
              </h3>
              <div className="grid grid-cols-2 gap-3.5 px-1">
                <div>
                  {renderRatingRow("Prise de balle", data.ratingsGK?.priseDeBalle)}
                  {renderRatingRow("Ramassage Gauche", data.ratingsGK?.ramassageGauche)}
                  {renderRatingRow("Ramassage Droit", data.ratingsGK?.ramassageDroit)}
                  {renderRatingRow("Demi saut", data.ratingsGK?.demiSaut)}
                  {renderRatingRow("Prise aérienne", data.ratingsGK?.priseAerienne)}
                  {renderRatingRow("Saut", data.ratingsGK?.saut)}
                  {renderRatingRow("Détente", data.ratingsGK?.detente)}
                </div>
                <div>
                  {renderRatingRow("Position de Base", data.ratingsGK?.positionDeBase)}
                  {renderRatingRow("Réaction au Sol", data.ratingsGK?.reactionAuSol)}
                  {renderRatingRow("Anticipation de balle au sol", data.ratingsGK?.anticipationBalleAuSol)}
                  {renderRatingRow("Reflexe", data.ratingsGK?.reflexe)}
                  {renderRatingRow("Passe Longue", data.ratingsGK?.passeLongue)}
                  {renderRatingRow("Technique de dégagement", data.ratingsGK?.techniqueDegagement)}
                  {renderRatingRow("Compréhension des principes", data.ratingsGK?.comprehensionPrincipes)}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CASE 2: FIELD PLAYER U10-U18 FORM */}
          {/* ======================================================== */}
          {formType === "FIELD_U10_U18" && (
            <>
              {/* ÉVALUATION GÉNÉRALE (6 in 2 columns) */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0a2347] bg-gray-100 px-3 py-1 rounded mb-1.5">
                  Évaluation Générale
                </h3>
                <div className="grid grid-cols-2 gap-3.5 px-1">
                  <div>
                    {renderRatingRow("Compétences Techniques", data.ratingsField?.competencesTechniques)}
                    {renderRatingRow("Compétences Tactiques", data.ratingsField?.competencesTactiques)}
                    {renderRatingRow("Compétences d'Attaque", data.ratingsField?.competencesAttaque)}
                  </div>
                  <div>
                    {renderRatingRow("Jeu Fitness et Conditionnement", data.ratingsField?.jeuFitnessConditionnement)}
                    {renderRatingRow("Aspect Mental / Auto Discipline", data.ratingsField?.aspectMental)}
                    {renderRatingRow("Présentation et Propreté", data.ratingsField?.presentation)}
                  </div>
                </div>
              </div>

              {/* QUALITÉS D'ATTAQUE (6) & QUALITÉS DÉFENSIVES (6) SIDE-BY-SIDE IN 2 COLUMNS */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* QUALITÉS D'ATTAQUE (6) */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0a2347] bg-gray-100 px-3 py-1 rounded mb-1.5">
                    Qualités d'Attaque
                  </h3>
                  <div className="px-1">
                    {renderRatingRow("Technique de finition", data.ratingsField?.techniqueFinition)}
                    {renderRatingRow("Passes précises", data.ratingsField?.passesPrecises)}
                    {renderRatingRow("Équilibre et Vision sous pression", data.ratingsField?.equilibreVision)}
                    {renderRatingRow("Compétences de dribbles et feintes", data.ratingsField?.dribblesFeintes)}
                    {renderRatingRow("Passes longues / Transversales", data.ratingsField?.passesLongues)}
                    {renderRatingRow("Courir après le ballon", data.ratingsField?.courirApresBallon)}
                  </div>
                </div>

                {/* QUALITÉS DÉFENSIVES (6) */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0a2347] bg-gray-100 px-3 py-1 rounded mb-1.5">
                    Qualités Défensives
                  </h3>
                  <div className="px-1">
                    {renderRatingRow("Technique de dégagement", data.ratingsField?.techniqueDegagement)}
                    {renderRatingRow("Positionnement", data.ratingsField?.positionnement)}
                    {renderRatingRow("Compétences de tackles", data.ratingsField?.competencesTackles)}
                    {renderRatingRow("Capacité de canalisation / retard", data.ratingsField?.canalisationRetard)}
                    {renderRatingRow("Compréhension défensive 1v1", data.ratingsField?.comprehensionDefensive1v1)}
                    {renderRatingRow("Compréhension des principes", data.ratingsField?.comprehensionPrincipes)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* CASE 3: U8 FORM */}
          {/* ======================================================== */}
          {formType === "U8" && (
            <>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0a2347] bg-gray-100 px-3 py-1 rounded mb-1.5">
                    Évaluation Générale
                  </h3>
                  <div className="px-1">
                    {renderRatingRow("Aspect Mental / Auto Discipline", data.ratingsU8?.aspectMental)}
                    {renderRatingRow("Jeu pré-sportif", data.ratingsU8?.jeuPreSportif)}
                    {renderRatingRow("Présentation et Propreté", data.ratingsU8?.presentation)}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0a2347] bg-gray-100 px-3 py-1 rounded mb-1.5">
                    Initiation à la Base Technique
                  </h3>
                  <div className="px-1">
                    {renderRatingRow("Jonglerie avec rebonds", data.ratingsU8?.jonglerieRebonds)}
                    {renderRatingRow("Jonglerie sans rebonds", data.ratingsU8?.jonglerieSansRebonds)}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0a2347] bg-gray-100 px-3 py-1 rounded mb-1.5">
                  Connaissance de la Surface de Contact
                </h3>
                <div className="grid grid-cols-2 gap-3.5 px-1">
                  <div>
                    {renderRatingRow("Contact avec ballon", data.ratingsU8?.contactBallon)}
                    {renderRatingRow("Contact avec plat du pied", data.ratingsU8?.contactPlat)}
                    {renderRatingRow("Contact intérieur et extérieur du pied", data.ratingsU8?.contactInterieurExterieur)}
                  </div>
                  <div>
                    {renderRatingRow("Contact court du pied", data.ratingsU8?.contactCourt)}
                    {renderRatingRow("Contact pointe du pied", data.ratingsU8?.contactPointe)}
                    {renderRatingRow("Contact talon du pied", data.ratingsU8?.contactTalon)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* TESTS SECTION */}
          {/* ======================================================== */}
          {formType === "U8" ? (
            /* U8 TEST RESULTS */
            <div className="rounded-xl border border-gray-700 p-2.5 bg-gray-50/50">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 mb-2">
                Résultats TEST :
              </h3>
              <div className="grid grid-cols-2 gap-3.5 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Test de motricité :</span>
                  <span className="font-mono px-3 py-1 bg-white border border-gray-300 rounded text-gray-900 min-w-[75px] text-center">
                    {data.testsU8?.motriciteSecondes ? `${data.testsU8.motriciteSecondes} s` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Test Slalom :</span>
                  <span className="font-mono px-3 py-1 bg-white border border-gray-300 rounded text-gray-900 min-w-[75px] text-center">
                    {data.testsU8?.slalomSecondes ? `${data.testsU8.slalomSecondes} s` : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ADVANCED TESTS RESULTS (U10-U18 & GOALKEEPER) */
            <div className="rounded-xl border border-gray-700 p-3 bg-gray-50/50 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                Résultats TEST :
              </h3>

              {/* Jonglage */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Test de Jonglage
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs font-semibold">
                  <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-gray-200">
                    <span className="text-gray-600 text-[11px] truncate pr-1">Pied fort:</span>
                    <span className="font-mono font-bold text-gray-900 text-xs">{data.testsAdvanced?.jonglagePiedFort || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-gray-200">
                    <span className="text-gray-600 text-[11px] truncate pr-1">Pied faible:</span>
                    <span className="font-mono font-bold text-gray-900 text-xs">{data.testsAdvanced?.jonglagePiedFaible || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-gray-200">
                    <span className="text-gray-600 text-[11px] truncate pr-1">Alterné:</span>
                    <span className="font-mono font-bold text-gray-900 text-xs">{data.testsAdvanced?.jonglageAlterne || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-gray-200">
                    <span className="text-gray-600 text-[11px] truncate pr-1">Cuisse G:</span>
                    <span className="font-mono font-bold text-gray-900 text-xs">{data.testsAdvanced?.jonglageCuisseGauche || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-gray-200">
                    <span className="text-gray-600 text-[11px] truncate pr-1">Cuisse D:</span>
                    <span className="font-mono font-bold text-gray-900 text-xs">{data.testsAdvanced?.jonglageCuisseDroite || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-gray-200">
                    <span className="text-gray-600 text-[11px] truncate pr-1">Cuisse Alt:</span>
                    <span className="font-mono font-bold text-gray-900 text-xs">{data.testsAdvanced?.jonglageCuisseAlternee || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Vivacité & Vitesse side-by-side */}
              <div className="grid grid-cols-2 gap-3 pt-0.5">
                {/* Vivacité */}
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded border border-gray-200 text-xs font-semibold">
                  <span className="text-gray-700">Test de vivacité :</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    {data.testsAdvanced?.vivacite ? `${data.testsAdvanced.vivacite} s` : "—"}
                  </span>
                </div>

                {/* Vitesse */}
                <div className="bg-white px-3 py-1 rounded border border-gray-200 text-xs font-semibold flex items-center justify-between gap-2">
                  <span className="text-gray-700 shrink-0">Test de vitesse :</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-mono font-bold text-center flex-1">
                    <div className="bg-gray-50 py-0.5 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-400 block font-sans">10M</span>
                      {data.testsAdvanced?.vitesse10M || "—"}
                    </div>
                    <div className="bg-gray-50 py-0.5 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-400 block font-sans">20M</span>
                      {data.testsAdvanced?.vitesse20M || "—"}
                    </div>
                    <div className="bg-gray-50 py-0.5 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-400 block font-sans">30M</span>
                      {data.testsAdvanced?.vitesse30M || "—"}
                    </div>
                    <div className="bg-gray-50 py-0.5 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-400 block font-sans">40M</span>
                      {data.testsAdvanced?.vitesse40M || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Observations */}
          <div className="rounded-xl border border-gray-300 p-3 bg-white">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0a2347] mb-1">
              Observations :
            </h3>
            <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[38px]">
              {data.observations?.trim() || "Aucune observation particulière mentionnée."}
            </p>
          </div>
        </div>

        {/* 5. Footer / Signatures Block */}
        <div className="relative z-10 mt-5 pt-1 text-xs">
          <div className="grid grid-cols-3 gap-6 items-end">
            {/* Coach */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Coach
              </span>
              <div className="font-bold text-gray-900 pb-1 border-b border-gray-800 min-h-[24px] text-xs">
                {data.signatures?.coachName || data.evaluator_name || "—"}
              </div>
            </div>

            {/* PDG */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                PDG
              </span>
              <div className="font-bold text-gray-900 pb-1 border-b border-gray-800 min-h-[24px] text-xs">
                {data.signatures?.pdgName || "\u00A0"}
              </div>
            </div>

            {/* Date */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Date
              </span>
              <div className="font-bold text-gray-900 pb-1 border-b border-gray-800 min-h-[24px] text-xs">
                {data.signatures?.date || data.header?.evaluationDate || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Print Styles (Fallback for Ctrl+P) */}
      <style jsx global>{`
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: white !important;
          }
          /* Neutralize modal backdrop & scroll wrappers */
          div[role="dialog"],
          .modal,
          .fixed,
          [class*="overflow-y-auto"],
          [class*="max-h-"] {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-evaluation-sheet,
          #printable-evaluation-sheet * {
            visibility: visible !important;
          }
          #printable-evaluation-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: #0a1d3a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
        }
      `}</style>
    </div>
  );
};
