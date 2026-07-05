import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isAdminAuthed } from '@/lib/adminAuth'

export const runtime = 'nodejs'

// Delete a task
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing task id' }, { status: 400 })

    const db = getSupabaseAdmin()
    const { error } = await db.from('tasks').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Toggle is_active
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id, is_active } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing task id' }, { status: 400 })

    const db = getSupabaseAdmin()
    const { error } = await db.from('tasks').update({ is_active }).eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}