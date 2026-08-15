"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentSeason } from "@/lib/club/season";

interface PlayerSportsTrackingProps {
  playerId: string;
}

export const PlayerSportsTracking: React.FC<PlayerSportsTrackingProps> = ({ playerId }) => {
  const [stats, setStats] = useState({
    trainingsPresent: 0,
    trainingsAbsent: 0,
    trainingsLate: 0,
    trainingsInjured: 0,
    matchesPresent: 0,
    matchesAbsent: 0,
    matchesLate: 0,
    matchesInjured: 0,
  });
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTracking = async () => {
      setLoading(true);
      try {
        const { data: attendanceData } = await supabase
          .from('player_attendance')
          .select('event_type, status')
          .eq('player_id', playerId)
          .eq('saison', getCurrentSeason());

        const { data: evals } = await supabase
          .from('player_evaluations')
          .select('*')
          .eq('player_id', playerId)
          .eq('saison', getCurrentSeason())
          .order('evaluation_date', { ascending: false });

        if (!isMounted) return;

        const newStats = {
          trainingsPresent: 0, trainingsAbsent: 0, trainingsLate: 0, trainingsInjured: 0,
          matchesPresent: 0, matchesAbsent: 0, matchesLate: 0, matchesInjured: 0,
        };

        if (attendanceData) {
          attendanceData.forEach((att: any) => {
            const isTrain = att.event_type === "Entraînement";
            if (att.status === "Présent") isTrain ? newStats.trainingsPresent++ : newStats.matchesPresent++;
            else if (att.status === "Absent") isTrain ? newStats.trainingsAbsent++ : newStats.matchesAbsent++;
            else if (att.status === "En retard") isTrain ? newStats.trainingsLate++ : newStats.matchesLate++;
            else if (att.status === "Blessé") isTrain ? newStats.trainingsInjured++ : newStats.matchesInjured++;
          });
        }

        setStats(newStats);
        if (evals) setEvaluations(evals);

      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTracking();
    return () => { isMounted = false; };
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tTotal = stats.trainingsPresent + stats.trainingsLate + stats.trainingsAbsent + stats.trainingsInjured;
  const mTotal = stats.matchesPresent + stats.matchesLate + stats.matchesAbsent + stats.matchesInjured;
  
  const tPresence = stats.trainingsPresent + stats.trainingsLate;
  const mPresence = stats.matchesPresent + stats.matchesLate;
  
  const tRate = tTotal > 0 ? Math.round((tPresence / tTotal) * 100) : 0;
  const mRate = mTotal > 0 ? Math.round((mPresence / mTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Stats Cards - Football Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* ENTRAINEMENTS CARD */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-5 text-white shadow-lg">
          {/* Pitch lines background effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M50 0 v100 M0 50 h100" stroke="white" strokeWidth="1" fill="none" />
              <circle cx="50" cy="50" r="20" stroke="white" strokeWidth="1" fill="none" />
            </svg>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <svg className="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h5 className="font-bold text-lg tracking-wide uppercase">Entraînements</h5>
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <div className="text-sm text-emerald-100 font-medium mb-1">Présences</div>
                <div className="text-4xl font-black tracking-tighter">
                  {tPresence}<span className="text-xl text-emerald-200 font-bold">/{tTotal}</span>
                </div>
              </div>
              
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 text-xs font-medium space-y-1.5 border border-white/10">
                <div className="flex justify-between gap-4"><span className="text-emerald-200">En retard</span> <span className="font-bold text-white">{stats.trainingsLate}</span></div>
                <div className="flex justify-between gap-4"><span className="text-emerald-200">Absences</span> <span className="font-bold text-white">{stats.trainingsAbsent}</span></div>
                <div className="flex justify-between gap-4"><span className="text-emerald-200">Blessures</span> <span className="font-bold text-white">{stats.trainingsInjured}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* MATCHS CARD */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-900 p-5 text-white shadow-lg">
          {/* Net background effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <svg className="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </div>
                <h5 className="font-bold text-lg tracking-wide uppercase">Matchs</h5>
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <div className="text-sm text-indigo-200 font-medium mb-1">Présences</div>
                <div className="text-4xl font-black tracking-tighter">
                  {mPresence}<span className="text-xl text-indigo-300 font-bold">/{mTotal}</span>
                </div>
              </div>
              
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 text-xs font-medium space-y-1.5 border border-white/10">
                <div className="flex justify-between gap-4"><span className="text-indigo-200">En retard</span> <span className="font-bold text-white">{stats.matchesLate}</span></div>
                <div className="flex justify-between gap-4"><span className="text-indigo-200">Absences</span> <span className="font-bold text-white">{stats.matchesAbsent}</span></div>
                <div className="flex justify-between gap-4"><span className="text-indigo-200">Blessures</span> <span className="font-bold text-white">{stats.matchesInjured}</span></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Evaluations Section */}
      <div className="mt-8">
        <h5 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
          <svg className="size-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          Observations du Coach
        </h5>

        {evaluations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 font-medium">Aucune observation enregistrée pour cette saison.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {evaluations.map(ev => (
              <div key={ev.id} className="relative bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                
                {/* Header (Avatar/Date) */}
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg className="size-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">Coach</div>
                      <div className="text-xs text-gray-500 font-medium">{new Date(ev.evaluation_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                  </div>
                  
                  {/* Subtle quote icon */}
                  <svg className="size-6 text-gray-200 dark:text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                
                {/* Content */}
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {ev.comments}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
