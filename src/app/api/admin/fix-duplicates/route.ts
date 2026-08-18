import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time use endpoint to fix duplicate numero_detection in detection_registrations.
// Protected by a secret key. DELETE THIS FILE after use.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SECRET = process.env.FIX_DUPLICATES_SECRET || 'fctoro-fix-2026'

export async function GET(req: NextRequest) {
  // Security check
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 1. Fetch all detection registrations ordered by creation date (oldest first)
  const { data: allRows, error } = await supabase
    .from('detection_registrations')
    .select('id, numero_detection, created_at')
    .order('created_at', { ascending: true })

  if (error || !allRows) {
    return NextResponse.json({ error: 'Failed to fetch registrations', details: error }, { status: 500 })
  }

  // 2. Group by numero_detection
  const groups: Record<string, { id: string; created_at: string }[]> = {}
  for (const row of allRows) {
    const num = row.numero_detection || ''
    if (!groups[num]) groups[num] = []
    groups[num].push({ id: row.id, created_at: row.created_at })
  }

  // 3. Find duplicates (more than 1 row with same numero_detection)
  const fixed: { id: string; old_num: string; new_num: string }[] = []
  const errors: { id: string; error: string }[] = []

  const year = new Date().getFullYear()

  for (const [numero, rows] of Object.entries(groups)) {
    if (rows.length <= 1) continue // No duplicate, skip

    // Keep the first (oldest), fix the rest
    const [, ...duplicates] = rows

    for (const dup of duplicates) {
      // Generate a unique new number
      let newNum = ''
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = `DET-${year}-${Math.floor(1000 + Math.random() * 9000)}`
        const { data: existing } = await supabase
          .from('detection_registrations')
          .select('id')
          .eq('numero_detection', candidate)
          .limit(1)

        if (!existing || existing.length === 0) {
          newNum = candidate
          break
        }
      }

      if (!newNum) {
        errors.push({ id: dup.id, error: 'Could not generate unique number after 10 attempts' })
        continue
      }

      // Update the row
      const { error: updateError } = await supabase
        .from('detection_registrations')
        .update({ numero_detection: newNum })
        .eq('id', dup.id)

      if (updateError) {
        errors.push({ id: dup.id, error: updateError.message })
      } else {
        fixed.push({ id: dup.id, old_num: numero, new_num: newNum })
      }
    }
  }

  return NextResponse.json({
    message: `Correction terminée. ${fixed.length} doublon(s) corrigé(s).`,
    fixed,
    errors,
    total_checked: allRows.length,
  })
}
