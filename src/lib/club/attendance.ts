import { supabase } from "../supabaseClient";

export type AttendanceStatus = 'Présent' | 'Absent' | 'Blessé' | 'En retard';
export type EventType = 'Entraînement' | 'Match';

export interface PlayerAttendance {
  id?: string;
  player_id: string;
  coach_id?: string;
  date: string;
  event_type: EventType;
  status: AttendanceStatus;
  saison: string;
  created_at?: string;
}

export const fetchAttendanceForDateAndCategory = async (date: string, saison: string) => {
  const { data, error } = await supabase
    .from('player_attendance')
    .select('*')
    .eq('date', date)
    .eq('saison', saison);
    
  if (error) {
    console.error("Error fetching attendance:", error);
    return [];
  }
  return data as PlayerAttendance[];
};

export const savePlayerAttendance = async (
  playerId: string,
  date: string,
  eventType: EventType,
  status: AttendanceStatus,
  saison: string,
  coachId?: string
) => {
  // First check if an attendance record already exists for this player, date, and event type
  const { data: existing } = await supabase
    .from('player_attendance')
    .select('id')
    .eq('player_id', playerId)
    .eq('date', date)
    .eq('event_type', eventType)
    .eq('saison', saison)
    .single();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('player_attendance')
      .update({ status, coach_id: coachId })
      .eq('id', existing.id)
      .select();
    if (error) throw error;
    return data;
  } else {
    // Insert
    const { data, error } = await supabase
      .from('player_attendance')
      .insert([{
        player_id: playerId,
        date,
        event_type: eventType,
        status,
        saison,
        coach_id: coachId
      }])
      .select();
    if (error) throw error;
    return data;
  }
};

export const deletePlayerAttendance = async (
  playerId: string,
  date: string,
  eventType: EventType,
  saison: string
) => {
  const { error } = await supabase
    .from('player_attendance')
    .delete()
    .eq('player_id', playerId)
    .eq('date', date)
    .eq('event_type', eventType)
    .eq('saison', saison);

  if (error) throw error;
};
