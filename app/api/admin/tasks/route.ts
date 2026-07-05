import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isAdminAuthed } from '@/lib/adminAuth'

export const runtime = 'nodejs'

// List all tasks (active + inactive) for the admin panel
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, tasks: data })
}

// Create a new task
export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const db = getSupabaseAdmin()

    const { count } = await db.from('tasks').select('id', { count: 'exact', head: true })

    const { error } = await db.from('tasks').insert({
      slug:        body.slug,
      title:       body.title,
      description: body.description,
      icon:        body.icon || '🎯',
      reward_rtm:  Number(body.reward_rtm) || 0,
      type:        body.type,
      target:      Number(body.target) || 1,
      is_active:   !!body.is_active,
      image_url:   body.image_url || null,
      gif_url:     body.gif_url || null,
      link_url:    body.link_url || null,
      x_target:    body.x_target || null,
      sort_order:  (count ?? 0) + 1,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Update an existing task
export async function PUT(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 })
    }
    const db = getSupabaseAdmin()

    const { error } = await db.from('tasks').update({
      slug:        body.slug,
      title:       body.title,
      description: body.description,
      icon:        body.icon || '🎯',
      reward_rtm:  Number(body.reward_rtm) || 0,
      type:        body.type,
      target:      Number(body.target) || 1,
      is_active:   !!body.is_active,
      image_url:   body.image_url || null,
      gif_url:     body.gif_url || null,
      link_url:    body.link_url || null,
      x_target:    body.x_target || null,
    }).eq('id', body.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}